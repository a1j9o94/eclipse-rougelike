import { afterAll, describe, expect, it } from "vitest";
import { BASE_FACTIONS } from "../../shared/eclipse/catalog";
import { createGame } from "../../shared/eclipse/setup";
import { processGameCommand } from "../../shared/eclipse/engine";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { chooseAiCommand } from "../../shared/eclipse/ai";
describe("complete bounded Minor Species matches", () => {
  let totalPurchases=0;
  afterAll(()=>expect(totalPurchases).toBeGreaterThan(0));
  it.each([2, 3, 4, 5, 6])(
    "finishes an eight-round %i-seat game with valid scoring",
    (count) => {
      let state = createGame({
        seed: 600 + count,
        minorSpecies: true,
        riftCannons: true,
        warpPortals: true,
        seats: BASE_FACTIONS.slice(0, count).map((f, i) => ({
          id: `p${i}`,
          faction: f.id,
          controller: "ai",
        })),
      });
      const initialTiles = [...state.minorSpecies!.market].sort();
      let purchases=0;
      let commands = 0;
      while (state.phase !== "finished" && commands < 6000) {
        const actor = state.pendingDecision?.owner ?? state.activeSeatId;
        if (!actor)
          throw Error(
            `No actor at ${state.phase} round${state.round} ${JSON.stringify(state.engine)}`,
          );
        const selected = chooseAiCommand(
          getPlayerView(state, actor),
          commands + 123,
        );
        if (!selected)
          throw Error(
            `No candidate for ${actor},${state.phase},${JSON.stringify(state.pendingDecision)}`,
          );
        const result = processGameCommand(state, actor, selected.command);
        if (!result.ok)
          throw Error(
            `Illegal AI command step${commands} ${JSON.stringify(selected.command)}: ${result.error.message}; decision=${JSON.stringify(state.pendingDecision)}; sectors=${JSON.stringify(state.sectors.map((s) => [s.id, s.tileId]))}`,
          );
        if(selected.command.type==='buy-minor-species')purchases++;
        state = result.state;
        expect([...state.minorSpecies!.market,...state.seats.flatMap(seat=>(seat.minorSpecies??[]).map(tile=>tile.id))].sort()).toEqual(initialTiles);
        commands++;
        for (const seat of state.seats) {
          expect(
            Object.values(seat.resources).every(
              (n) => n >= 0 && Number.isInteger(n),
            ),
          ).toBe(true);
          expect(
            Object.values(seat.populationTracks).every(
              (n) => n >= -1 && n <= 11,
            ),
          ).toBe(true);
        }
      }
      expect(
        state.phase,
        `deadlock after ${commands} commands; ${JSON.stringify(state.pendingDecision)}`,
      ).toBe("finished");
      expect(state.round).toBe(8);
      totalPurchases+=purchases;
      expect(state.seats.flatMap(seat=>seat.minorSpecies??[])).toHaveLength(purchases);
      expect(state.engine?.scores).toHaveLength(count);
      expect(
        state.engine?.scores?.every((s) => Number.isInteger(s.total)),
      ).toBe(true);
    },
    30000,
  );
});
