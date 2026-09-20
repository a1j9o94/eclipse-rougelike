import { getFaction } from "./catalog";
import {
  getMinorSpecies,
  reputationCapacityWithMinorSpecies,
  ambassadorCapacityForSeat,
} from "./minorSpecies";
import { emit, requireRule } from "./rulesState";
import type { GameCommand, GameEvent, GameState, Seat } from "./types";

export function buyMinorSpecies(
  state: GameState,
  seat: Seat,
  command: Extract<GameCommand, { type: "buy-minor-species" }>,
  events: GameEvent[],
): void {
  requireRule(
    state.phase === "action" && state.activeSeatId === seat.id,
    "Wait for your action turn.",
    "NOT_YOUR_TURN",
  );
  requireRule(
    !seat.traitor,
    "The traitor cannot form new diplomatic relations.",
  );
  requireRule(
    !state.pendingDecision,
    "Resolve your outstanding choice first.",
    "DECISION_PENDING",
  );
  requireRule(
    !!state.minorSpecies?.market.includes(command.minorSpeciesId),
    "This Minor Species is not available.",
  );
  requireRule(
    !seat.minorSpecies?.some((tile) => tile.id === command.minorSpeciesId),
    "This civilization already has these allies.",
  );
  const tile = getMinorSpecies(command.minorSpeciesId);
  requireRule(
    seat.resources.money >= tile.cost,
    `Diplomatic relations require ${tile.cost} money.`,
    "INSUFFICIENT_RESOURCES",
  );
  requireRule(
    seat.ambassadors.length + (seat.minorSpecies?.length ?? 0) <
      ambassadorCapacityForSeat(seat),
    "All ambassador spaces are occupied.",
  );
  const population = tile.effect.kind === "population";
  requireRule(
    population
      ? !!command.resource &&
          ["money", "science", "materials"].includes(command.resource)
      : command.resource === undefined,
    "Choose a population resource only for Settler envoys.",
  );
  if (population)
    requireRule(
      seat.populationTracks[command.resource!] < 11,
      "No population cube remains on that resource track.",
    );
  const acquired = {
    id: tile.id,
    ...(population ? { resource: command.resource! } : {}),
  };
  const after = [...(seat.minorSpecies ?? []), acquired],
    hidden = state.privateSeats.find((p) => p.seatId === seat.id)!;
  const required = Math.max(
    0,
    hidden.reputation.length -
      reputationCapacityWithMinorSpecies({ ...seat, minorSpecies: after }),
  );
  const returned = command.returnReputation ?? [];
  requireRule(
    returned.length === required,
    required
      ? "Return a reputation tile to free an ambassador space."
      : "No reputation tile needs to be returned.",
  );
  for (const value of returned) {
    const index = hidden.reputation.indexOf(value);
    requireRule(index >= 0, "You do not own this reputation tile.");
    hidden.reputation.splice(index, 1);
    state.supplies.reputation.push(value);
    if (state.lessRandom) {
      state.lessRandom.reputationBySeat[seat.id] = [...hidden.reputation];
      state.lessRandom.reputationSupply.push(value);
    }
  }
  seat.resources.money -= tile.cost;
  seat.minorSpecies = after;
  state.minorSpecies!.market.splice(
    state.minorSpecies!.market.indexOf(tile.id),
    1,
  );
  if (population) seat.populationTracks[command.resource!]++;
  emit(
    events,
    seat.id,
    `${getFaction(seat.faction).name} forms diplomatic relations with ${tile.name} for ${tile.cost} money.`,
  );
  if (returned.length)
    emit(
      events,
      seat.id,
      "Returned a reputation tile to make room for Minor Species diplomacy.",
    );
}
