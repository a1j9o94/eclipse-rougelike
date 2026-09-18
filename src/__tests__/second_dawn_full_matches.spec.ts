import { describe, expect, it } from "vitest";
import { BASE_FACTIONS } from "../../shared/eclipse/catalog";
import { createGame } from "../../shared/eclipse/setup";
import { processGameCommand } from "../../shared/eclipse/engine";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { chooseAiCommand } from "../../shared/eclipse/ai";
describe("complete bounded seeded matches", () => {
  it.each([2, 3, 4, 5, 6])(
    "finishes an eight-round %i-seat game with valid scoring",
    (count) => {
      let state = createGame({
        seed: 100 + count,
        warpPortals: true,
        seats: BASE_FACTIONS.slice(0, count).map((f, i) => ({
          id: `p${i}`,
          faction: f.id,
          controller: "ai",
        })),
      });
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
        state = result.state;
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
      expect(state.engine?.scores).toHaveLength(count);
      expect(
        state.engine?.scores?.every((s) => Number.isInteger(s.total)),
      ).toBe(true);
    },
    30000,
  );
});
