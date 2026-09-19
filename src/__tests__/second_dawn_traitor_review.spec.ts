import { expect, it } from "vitest";
import {
  breakAggressiveRelations,
  validateDiplomacy,
} from "../../shared/eclipse/decisions";
import fixturesJson from "../second-dawn-game/reviewFixtures.json?raw";
import type { GameState } from "../../shared/eclipse/types";

it("transfers the single traitor card after aggression and persists both ambassador cube returns", () => {
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).opening;
  const [attacker, partner, peaceful, formerTraitor] = state.seats;
  attacker.ambassadors = [partner.id, peaceful.id];
  partner.ambassadors = [attacker.id];
  peaceful.ambassadors = [attacker.id];
  formerTraitor.traitor = true;
  state.ships.find((s) => s.owner === attacker.id)!.sectorId =
    state.sectors.find((s) => s.owner === partner.id)!.id;
  breakAggressiveRelations(state, attacker);
  expect(attacker.traitor).toBe(true);
  expect(formerTraitor.traitor).toBe(false);
  expect(attacker.ambassadors).toEqual([peaceful.id]);
  expect(partner.ambassadors).toEqual([]);
  expect(peaceful.ambassadors).toEqual([attacker.id]);
  expect(
    state
      .engine!.decisions.filter((d) => d.kind === "population-return")
      .map((d) => d.owner)
      .sort(),
  ).toEqual([attacker.id, partner.id].sort());
  expect(() =>
    validateDiplomacy(state, attacker, formerTraitor.id, "money"),
  ).toThrow("These players cannot form diplomatic relations.");
});

// Publisher-verified Dized Diplomacy: aggression is checked at end of Action;
// passing through a partner's sector while unpinned preserves diplomacy.
it("preserves diplomacy when separate Move activations enter and leave a partner sector before ending the action", async () => {
  const { processGameCommand } = await import("../../shared/eclipse/engine");
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).opening;
  const [attacker, partner] = state.seats;
  attacker.ambassadors = [partner.id];
  partner.ambassadors = [attacker.id];
  const start = state.sectors.find((s) => s.owner === attacker.id)!;
  const transit = state.sectors.find((s) => s.owner === partner.id)!;
  start.portalVp = 1;
  transit.portalVp = 1;
  const ship = state.ships.find((s) => s.owner === attacker.id)!;
  state.ships = [ship];
  const enter = processGameCommand(state, attacker.id, {
    type: "move",
    moves: [{ shipId: ship.id, path: [transit.id] }],
  });
  expect(enter.ok).toBe(true);
  if (!enter.ok) return;
  expect(enter.state.seats[0].traitor).toBe(false);
  expect(enter.state.seats[0].ambassadors).toEqual([partner.id]);
  const leave = processGameCommand(enter.state, attacker.id, {
    type: "move",
    moves: [{ shipId: ship.id, path: [start.id] }],
  });
  expect(leave.ok).toBe(true);
  if (!leave.ok) return;
  expect(leave.state.engine!.action).toBeNull();
  expect(leave.state.activeSeatId).toBe(partner.id);
  expect(leave.state.seats[0].traitor).toBe(false);
  expect(leave.state.seats[0].ambassadors).toEqual([partner.id]);
  const aggressiveEnd = processGameCommand(enter.state, attacker.id, {
    type: "end-action",
  });
  expect(aggressiveEnd.ok).toBe(true);
  if (!aggressiveEnd.ok) return;
  expect(aggressiveEnd.state.seats[0].traitor).toBe(true);
  expect(aggressiveEnd.state.seats[0].ambassadors).toEqual([]);
  expect(aggressiveEnd.state.pendingDecision?.kind).toBe("population-return");
});
