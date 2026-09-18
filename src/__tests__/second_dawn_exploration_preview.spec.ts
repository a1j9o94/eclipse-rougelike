import { expect, it } from "vitest";
import { deriveExplorePreview } from "../second-dawn-game/explorationPreview";
import { SECTORS } from "../../shared/eclipse/sectors";
import { createGame } from "../../shared/eclipse/setup";
import { processGameCommand } from "../../shared/eclipse/engine";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { legalCommands } from "../../shared/eclipse/legal";
import { explorationSources } from "../../shared/eclipse/actions";

function drawnFixture(draco = false) {
  const state = createGame({
    seed: 543,
    warpPortals: true,
    seats: [
      {
        id: "human",
        faction: draco ? "draco" : "eridani",
        controller: "human",
      },
      { id: "ai", faction: "hydran", controller: "ai" },
    ],
  });
  const command = legalCommands(getPlayerView(state, "human")!).find(
    (c) => c.command.type === "explore",
  )!.command;
  const result = processGameCommand(state, "human", command);
  if (!result.ok || result.state.pendingDecision?.kind !== "exploration")
    throw new Error("Expected exploration fixture");
  return {
    state: result.state,
    decision: result.state.pendingDecision,
    view: getPlayerView(result.state, "human")!,
  };
}
it("reports all six adjacent positions and exactly the saved legal rotations from a real draw", () => {
  const { state, decision, view } = drawnFixture();
  for (const tile of decision.drawnTileIds)
    for (let rotation = 0; rotation < 6; rotation++) {
      const preview = deriveExplorePreview(view, decision, tile, rotation);
      expect(preview.neighbors).toHaveLength(6);
      expect(
        new Set(preview.neighbors.map((n) => `${n.position.q},${n.position.r}`))
          .size,
      ).toBe(6);
      expect(preview.legal).toBe(
        decision.placements.some(
          (p) => p.tileId === tile && p.rotation === rotation,
        ),
      );
      expect(
        preview.neighbors
          .filter((n) => n.sourceEligible)
          .map((n) => n.sector!.id)
          .sort(),
      ).toEqual(
        explorationSources(state, state.seats[0], decision.position)
          .map((s) => s.id)
          .sort(),
      );
      if (preview.legal)
        expect(preview.connectedSourceIds.length).toBeGreaterThan(0);
    }
});
it("never invents a placement even if the visible physical connection would work", () => {
  const { decision, view } = drawnFixture();
  const first = decision.placements[0];
  expect(
    deriveExplorePreview(
      view,
      { ...decision, placements: [] },
      first.tileId,
      first.rotation,
    ).legal,
  ).toBe(false);
  expect(deriveExplorePreview(view, decision, "not-drawn", 0).drawn).toBeNull();
});
it("previews both Draco draws after the optional second draw without exposing any deck order", () => {
  const fixture = drawnFixture(true);
  expect(fixture.decision.drawnTileIds).toHaveLength(1);
  expect(fixture.decision.canDrawAnother).toBe(true);
  const result = processGameCommand(fixture.state, "human", {
    type: "resolve",
    decisionId: fixture.decision.id,
    choice: {
      kind: "exploration",
      tileId: null,
      rotation: 0,
      drawAnother: true,
    },
  });
  expect(result.ok).toBe(true);
  if (!result.ok || result.state.pendingDecision?.kind !== "exploration")
    return;
  const decision = result.state.pendingDecision;
  expect(decision.drawnTileIds).toHaveLength(2);
  expect(decision.canDrawAnother).toBe(false);
  for (const tile of decision.drawnTileIds)
    expect(
      deriveExplorePreview(
        getPlayerView(result.state, "human")!,
        decision,
        tile,
        0,
      ).tile?.id,
    ).toBe(Number(tile));
});

it("distinguishes a generator-only physical connection without inventing a legal rotation", () => {
  const { decision, view } = drawnFixture();
  const tileId = decision.drawnTileIds[0];
  const rotation = [0, 1, 2, 3, 4, 5].find((r) =>
    deriveExplorePreview(view, decision, tileId, r).neighbors.some(
      (n) => n.sourceEligible && n.neighborOpening && !n.drawnOpening,
    ),
  );
  expect(rotation).toBeDefined();
  if (rotation === undefined) return;
  view.seats[0].technologies.grid.push("wormhole-generator");
  const preview = deriveExplorePreview(
    view,
    { ...decision, placements: [] },
    tileId,
    rotation,
  );
  expect(
    preview.neighbors.some(
      (n) => n.sourceEligible && n.connection === "generator",
    ),
  ).toBe(true);
  expect(preview.legal).toBe(false);
});
it("distinguishes unpinned fleet sources from pinned fleets using only public ship data", () => {
  const { decision, view } = drawnFixture();
  const tileId = decision.drawnTileIds[0];
  const source = deriveExplorePreview(view, decision, tileId, 0).neighbors.find(
    (n) => n.sourceEligible,
  )!.sector!;
  source.owner = null;
  const preview = () =>
    deriveExplorePreview(view, decision, tileId, 0).neighbors.find(
      (n) => n.sector?.id === source.id,
    )!;
  expect(preview().sourceKind).toBe("unpinned-fleet");
  view.ships.push({
    id: "pinning-opponent",
    owner: "ai",
    type: "interceptor",
    sectorId: source.id,
    damage: 0,
  });
  expect(preview().sourceEligible).toBe(false);
  view.seats[0].technologies.grid.push("cloaking-device");
  expect(preview().sourceEligible).toBe(true);
});

it("shows local portal connections separately from distant portals without treating distant portals as exploration sources", () => {
  const fixture = drawnFixture();
  const portal = SECTORS.find((s) => s.warpPortal)!;
  const decision = {
    ...fixture.decision,
    drawnTileIds: [String(portal.id)],
    placements: [],
  };
  const baseline = deriveExplorePreview(
    fixture.view,
    decision,
    String(portal.id),
    0,
  );
  const source = baseline.neighbors.find((n) => n.sourceEligible)!.sector!;
  source.portalVp = 1;
  const distant = fixture.view.sectors.find(
    (s) => !baseline.neighbors.some((n) => n.sector?.id === s.id),
  )!;
  distant.portalVp = 1;
  const preview = deriveExplorePreview(
    fixture.view,
    decision,
    String(portal.id),
    0,
  );
  expect(
    preview.neighbors.find((n) => n.sector?.id === source.id)?.connection,
  ).toBe("warp");
  expect(preview.remotePortalSectorIds).toContain(distant.id);
  expect(preview.connectedSourceIds).not.toContain(distant.id);
  expect(preview.legal).toBe(false);
});
