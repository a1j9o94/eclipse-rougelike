// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createGame } from "../../shared/eclipse/setup";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { processGameCommand } from "../../shared/eclipse/engine";
import type { GameCommand } from "../../shared/eclipse/types";
import InfluencePlanner from "../second-dawn-game/InfluencePlanner";
import ColonizationPlanner from "../second-dawn-game/ColonizationPlanner";
import { ActionDraftProvider } from "../second-dawn-game/ActionDraftProvider";

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
  it("selects a destination first and explicitly identifies both sides of a legal transfer", () => {
    const fixture = influenceFixture(), submit = vi.fn(), targets = vi.fn();
    render(<InfluencePlanner view={fixture.view} candidates={fixture.candidates} disabled={false} onSubmit={submit} onLegalTargetIdsChange={targets}/>);
    expect(targets).toHaveBeenLastCalledWith([fixture.target.id]);
    expect(screen.getByRole('heading', {name:'Choose a sector to control'})).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name:`Select sector ${fixture.target.tileId} to control`}));
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name:`Use disc from sector ${fixture.source.tileId}`}));
    expect(screen.getByLabelText('Territory consequences')).toHaveTextContent(/population.*return/i);
    fireEvent.click(screen.getByRole('button', {name:`Withdraw from ${fixture.source.tileId} and control ${fixture.target.tileId}`}));
    expect(submit).toHaveBeenCalledWith(fixture.candidates[1].command);
  });
  it("never stages withdrawal when a controlled sector is selected on the map", () => {
    const fixture=influenceFixture(), submit=vi.fn();
    const remove:GameCommand={type:'influence',removeSectorIds:[fixture.source.id],addSectorIds:[]};
    render(<InfluencePlanner view={fixture.view} candidates={[...fixture.candidates,{command:remove,label:'Remove',description:'Remove'}]} disabled={false} selectedSectorId={fixture.source.id} onSubmit={submit}/>);
    expect(screen.getByText('You already control this sector.')).toBeVisible();
    expect(screen.queryByRole('button',{name:`Withdraw from sector ${fixture.source.tileId}`})).toBeNull();
    fireEvent.click(screen.getByText('Withdraw control from a sector'));
    fireEvent.click(screen.getByRole('button',{name:`Select sector ${fixture.source.tileId} to withdraw`}));
    expect(screen.getByLabelText('Territory consequences')).toHaveTextContent('lose');
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:`Withdraw from sector ${fixture.source.tileId}`}));
    expect(submit).toHaveBeenCalledWith(remove);
  });
  it("confirms control beside the selected sector without a generic influence confirmation", () => {
    const fixture=influenceFixture(), submit=vi.fn();
    const command:GameCommand={type:'influence',removeSectorIds:[],addSectorIds:[fixture.target.id]};
    render(<InfluencePlanner view={fixture.view} candidates={[{command,label:'Control',description:'Control'}]} disabled={false} selectedSectorId={fixture.target.id} onSubmit={submit}/>);
    expect(screen.getByRole('heading',{name:`Sector ${fixture.target.tileId}`})).toBeVisible();
    expect(screen.queryByRole('button',{name:'Confirm influence'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:`Take control of sector ${fixture.target.tileId}`}));
    expect(submit).toHaveBeenCalledWith(command);
  });
  it("clears a claim when map selection changes to an owned sector",()=>{
    const fixture=influenceFixture(), submit=vi.fn();
    const command:GameCommand={type:'influence',removeSectorIds:[],addSectorIds:[fixture.target.id]};
    const props={view:fixture.view,candidates:[{command,label:'Control',description:'Control'}],disabled:false,onSubmit:submit};
    const rendered=render(<InfluencePlanner {...props} selectedSectorId={fixture.target.id}/>);
    rendered.rerender(<InfluencePlanner {...props} selectedSectorId={fixture.source.id}/>);
    expect(screen.queryByRole('button',{name:`Take control of sector ${fixture.target.tileId}`})).toBeNull();
    expect(submit).not.toHaveBeenCalled();
  });
  it("identifies an opponent by faction and never offers taking their sector",()=>{
    const fixture=influenceFixture(); const enemy=fixture.view.sectors.find(sector=>sector.owner==='b')!;
    render(<InfluencePlanner view={fixture.view} candidates={fixture.candidates} disabled={false} selectedSectorId={enemy.id} onSubmit={vi.fn()}/>);
    expect(screen.getByText(/Controlled by Hydran Progress/)).toBeVisible();
    expect(screen.queryByRole('button',{name:/^Take control/})).toBeNull();
  });
  it("preserves an explicit saved transfer through remount and disables it when legality changes",()=>{
    const fixture=influenceFixture(),submit=vi.fn();
    const ui=(available=fixture.candidates)=><ActionDraftProvider matchId="influence-return-test" viewerSeatId="a" revision={fixture.view.revision}><InfluencePlanner view={fixture.view} candidates={available} disabled={false} selectedSectorId={fixture.target.id} onSubmit={submit}/></ActionDraftProvider>;
    const first=render(ui());fireEvent.click(screen.getByRole('button',{name:`Use disc from sector ${fixture.source.tileId}`}));first.unmount();
    const next=render(ui());const name=`Withdraw from ${fixture.source.tileId} and control ${fixture.target.tileId}`;
    expect(screen.getByRole('button',{name})).toBeEnabled();
    next.rerender(ui([]));expect(screen.getByRole('button',{name})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name}));expect(submit).not.toHaveBeenCalled();
    next.unmount();localStorage.clear();
  });
  it("keeps refresh separate and never submits a disabled choice",()=>{
    const fixture=influenceFixture(),submit=vi.fn();
    const rendered=render(<InfluencePlanner view={fixture.view} candidates={fixture.candidates} disabled={false} onSubmit={submit}/>);
    fireEvent.click(screen.getByRole('button',{name:'Refresh colony ships'}));
    rendered.rerender(<InfluencePlanner view={fixture.view} candidates={fixture.candidates} disabled onSubmit={submit}/>);
    fireEvent.click(screen.getByRole('button',{name:'Confirm refresh colony ships'}));
    expect(submit).not.toHaveBeenCalled();
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
