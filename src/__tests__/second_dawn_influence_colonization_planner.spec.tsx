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
    expect(screen.getByText(/Transfer control/)).toBeVisible();
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
  it("uses a planet card and resource chip to produce an existing legal colonize command", () => {
    const fixture = colonizeFixture();
    const submit = vi.fn();
    render(<ColonizationPlanner view={fixture.view} candidates={fixture.candidates} disabled={false} onSubmit={submit} />);
    fireEvent.click(screen.getByRole("button", { name: /Colonize Money planet p0/ }));
    expect(screen.getAllByText(/1 colony ship/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Money population" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Money population" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm colonization" }));
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
