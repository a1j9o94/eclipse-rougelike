// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createGame } from "../../shared/eclipse/setup";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { processGameCommand } from "../../shared/eclipse/engine";
import type { GameCommand } from "../../shared/eclipse/types";
import InfluencePlanner from "../second-dawn-game/InfluencePlanner";
import ColonizationPlanner from "../second-dawn-game/ColonizationPlanner";

function influenceFixture() {
  const state = createGame({
    seed: 17,
    seats: [
      { id: "a", faction: "terran-directorate", controller: "human" },
      { id: "b", faction: "hydran", controller: "ai" },
    ],
  });
  state.activeSeatId = "a";
  const source = state.sectors.find((sector) => sector.owner === "a")!;
  const target = {
    ...source,
    id: "free",
    tileId: "305",
    owner: null,
    position: { q: source.position.q + 1, r: source.position.r },
    population: [],
  };
  state.sectors.push(target);
  const view = getPlayerView(state, "a")!;
  const transfer: GameCommand = {
    type: "influence",
    removeSectorIds: [source.id],
    addSectorIds: [target.id],
  };
  return {
    state,
    source,
    target,
    view,
    candidates: [
      {
        command: { type: "influence", removeSectorIds: [], addSectorIds: [] } as GameCommand,
        label: "Refresh colony ships",
        description: "Refresh up to two colony ships.",
      },
      { command: transfer, label: "Transfer control", description: "Move a disc." },
    ],
  };
}

describe("visual influence planner", () => {
  it("leads with Claim, Release, and Transfer control intents and previews territorial stakes",()=>{const fixture=influenceFixture();render(<InfluencePlanner view={fixture.view} candidates={fixture.candidates} disabled={false} onSubmit={vi.fn()}/>);expect(screen.getByRole('heading',{name:'Shape your territory'})).toBeTruthy();expect(screen.getByText('Release sector')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:new RegExp(`Remove control from sector ${fixture.source.tileId}`)}));fireEvent.click(screen.getByRole('button',{name:new RegExp(`Place disc in sector ${fixture.target.tileId}`)}));expect(screen.getByRole('heading',{name:'Transfer control'})).toBeTruthy();expect(screen.getAllByText(/population.*return/i).length).toBeGreaterThan(0);expect(screen.getAllByText(/sector VP/i).length).toBeGreaterThan(0);});
  it("stages a source and highlighted destination before submitting the exact legal transfer", () => {
    const fixture = influenceFixture();
    const submit = vi.fn();
    const targets = vi.fn();
    render(
      <InfluencePlanner
        view={fixture.view}
        candidates={fixture.candidates}
        disabled={false}
        onSubmit={submit}
        onLegalTargetIdsChange={targets}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`Remove control from sector ${fixture.source.tileId}`) }));
    expect(targets).toHaveBeenLastCalledWith([fixture.target.id]);
    expect(screen.getByText(/Choose a connected uncontrolled sector/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`Place disc in sector ${fixture.target.tileId}`) }));
    expect(screen.getByRole("heading", { name: "Transfer control" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Confirm influence" }));
    expect(submit).toHaveBeenCalledWith(fixture.candidates[1].command);
  });

  it("keeps refresh a distinct visual choice and does not submit while disabled", () => {
    const fixture = influenceFixture();
    const submit = vi.fn();
    render(<InfluencePlanner view={fixture.view} candidates={fixture.candidates} disabled onSubmit={submit} />);
    expect(screen.queryByRole("combobox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Refresh colony ships" }));
    expect(screen.queryByRole("button", { name: "Confirm influence" })).toBeNull();
    expect(submit).not.toHaveBeenCalled();
  });

  it("uses the selected galaxy sector as source then destination without creating a new command", () => {
    const fixture = influenceFixture();
    const submit = vi.fn();
    const targets = vi.fn();
    const props = {
      view: fixture.view,
      candidates: fixture.candidates,
      disabled: false,
      onSubmit: submit,
      onLegalTargetIdsChange: targets,
    };
    const rendered = render(<InfluencePlanner {...props} selectedSectorId={fixture.source.id} />);
    expect(targets).toHaveBeenLastCalledWith([fixture.target.id]);
    rendered.rerender(<InfluencePlanner {...props} selectedSectorId={fixture.target.id} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm influence" }));
    expect(submit).toHaveBeenCalledWith(fixture.candidates[1].command);
  });

  it("uses a directly selected legal galaxy target when placing a new disc", () => {
    const fixture = influenceFixture();
    const add: GameCommand = { type: "influence", removeSectorIds: [], addSectorIds: [fixture.target.id] };
    const submit = vi.fn();
    render(<InfluencePlanner view={fixture.view} candidates={[{ command: add, label: "Control sector", description: "Place disc." }]} disabled={false} selectedSectorId={fixture.target.id} onSubmit={submit} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm influence" }));
    expect(submit).toHaveBeenCalledWith(add);
  });
});

function colonizeFixture() {
  const state = createGame({
    seed: 7,
    seats: [
      { id: "a", faction: "terran-directorate", controller: "human" },
      { id: "b", faction: "hydran", controller: "ai" },
    ],
  });
  state.activeSeatId = "a";
  const sector = state.sectors.find((candidate) => candidate.owner === "a")!;
  sector.population = [];
  const view = getPlayerView(state, "a")!;
  const command: GameCommand = {
    type: "colonize",
    placements: [{ sectorId: sector.id, squareId: "p0", resource: "money" }],
  };
  return { state, sector, view, candidates: [{ command, label: "Colonize money", description: "Use one colony ship." }] };
}

describe("visual colonization planner", () => {
  it('requires an explicit population resource on a multi-resource gray planet',()=>{const fixture=colonizeFixture();fixture.sector.tileId='108';fixture.view=getPlayerView(fixture.state,'a')!;const candidates=(['money','science','materials'] as const).map(resource=>({command:{type:'colonize' as const,placements:[{sectorId:fixture.sector.id,squareId:'p2',resource}]},label:`Colonize gray with ${resource}`,description:'Choose a cube.'}));const submit=vi.fn();render(<ColonizationPlanner view={fixture.view} candidates={candidates} disabled={false} onSubmit={submit}/>);fireEvent.click(screen.getByRole('button',{name:/Colonize Any resource planet p2/}));expect(screen.queryByRole('button',{name:/Colonize 1 planet/})).toBeNull();expect(screen.getByRole('button',{name:'Money population'})).toHaveAttribute('aria-pressed','false');fireEvent.click(screen.getByRole('button',{name:'Science population'}));fireEvent.click(screen.getByRole('button',{name:'Colonize 1 planet'}));expect(submit.mock.calls[0][0]).toMatchObject({placements:[{resource:'science'}]});});
  it("keeps one multi-sector workspace and previews exact marginal income and cube use",()=>{
    const fixture=colonizeFixture();const second={...fixture.sector,id:'second-colony',tileId:fixture.sector.tileId,position:{q:fixture.sector.position.q+2,r:fixture.sector.position.r},population:[]};fixture.state.sectors.push(second);fixture.state.seats[0].colonyShipsAvailable=3;fixture.state.seats[0].populationTracks.money=2;fixture.view=getPlayerView(fixture.state,'a')!;
    const secondCommand:GameCommand={type:'colonize',placements:[{sectorId:second.id,squareId:'p0',resource:'money'}]};const sectors=vi.fn(),focus=vi.fn(),submit=vi.fn();
    render(<ColonizationPlanner view={fixture.view} candidates={[...fixture.candidates,{command:secondCommand,label:'Colonize second money',description:'Use one colony ship.'}]} disabled={false} onSubmit={submit} onColonizableSectorIdsChange={sectors} onSectorFocus={focus}/>);
    expect(sectors).toHaveBeenLastCalledWith(expect.arrayContaining([fixture.sector.id,second.id]));fireEvent.click(screen.getByRole('button',{name:new RegExp(`Colonize Money planet p0 in sector ${fixture.sector.tileId}$`)}));
    fireEvent.click(screen.getAllByRole('button',{name:new RegExp(`Sector ${second.tileId}`)})[1]);expect(focus).toHaveBeenCalledWith(second.id);fireEvent.click(screen.getByRole('button',{name:new RegExp(`Colonize Money planet p0 in sector ${second.tileId}$`)}));
    expect(screen.getByRole('region',{name:'Colonization consequences'})).toHaveTextContent('Colony ships3 → 1');expect(screen.getByRole('region',{name:'Colonization consequences'})).toHaveTextContent('income 4 → 8 +4');
    fireEvent.click(screen.getByRole('button',{name:'Colonize 2 planets'}));expect(submit.mock.calls[0][0]).toMatchObject({type:'colonize',placements:[{sectorId:fixture.sector.id},{sectorId:second.id}]});expect(processGameCommand(fixture.state,'a',submit.mock.calls[0][0])).toMatchObject({ok:true});
  });
  it("uses a planet card and resource chip to produce an existing legal colonize command", () => {
    const fixture = colonizeFixture();
    const submit = vi.fn();
    render(<ColonizationPlanner view={fixture.view} candidates={fixture.candidates} disabled={false} onSubmit={submit} />);
    fireEvent.click(screen.getByRole("button", { name: /Colonize Money planet p0/ }));
    expect(screen.getAllByText(/1 colony ship/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Money population" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Money population" }));
    fireEvent.click(screen.getByRole("button", { name: "Colonize 1 planet" }));
    expect(submit).toHaveBeenCalledWith(fixture.candidates[0].command);
    expect(processGameCommand(fixture.state, "a", submit.mock.calls[0][0])).toMatchObject({ ok: true });
  });

  it("explains unavailable colonization without a select or accidental submit", () => {
    const fixture = colonizeFixture();
    const submit = vi.fn();
    render(<ColonizationPlanner view={fixture.view} candidates={[]} disabled={false} onSubmit={submit} />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText(/No compatible empty planets/)).toBeVisible();
    expect(submit).not.toHaveBeenCalled();
  });

  it("keeps a persisted multi-square colonization draft editable and resolves all selected placements together", () => {
    const fixture = colonizeFixture();
    const sector = fixture.sector;
    const submit = vi.fn();
    const decision = {
      id: "colonize-decision",
      kind: "colonization" as const,
      owner: "a",
      squares: [
        { sectorId: sector.id, squareId: "p0", resources: ["money" as const] },
        { sectorId: sector.id, squareId: "p1", resources: ["science" as const] },
      ],
    };
    render(<ColonizationPlanner view={fixture.view} candidates={[]} disabled={false} decision={decision} onSubmit={submit} />);
    fireEvent.click(screen.getByRole("button", { name: /planet p0/ }));
    fireEvent.click(screen.getByRole("button", { name: /planet p1/ }));
    fireEvent.click(screen.getByRole("button", { name: "Finish colonization" }));
    expect(submit).toHaveBeenCalledWith({
      type: "resolve",
      decisionId: "colonize-decision",
      choice: {
        kind: "colonization",
        placements: [
          { sectorId: sector.id, squareId: "p0", resource: "money" },
          { sectorId: sector.id, squareId: "p1", resource: "science" },
        ],
      },
    });
  });
});
