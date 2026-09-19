import type {
  Action,
  GameEvent,
  GameState,
  PendingDecision,
  Resource,
  Seat,
  Sector,
  ValidationError,
} from "./types";
import { ancientTechnologyChoices } from "./technologies";
import { getDiscovery, type DiscoveryId } from "./discoveries";
import { factionHasCapability, getFaction } from "./catalog";
import { sectorDefinition } from "./sectors";
export function requireSectorDefinition(id: number) {
  const d = sectorDefinition(id);
  requireRule(
    !!d,
    "Sector is absent from the pinned catalog.",
    "INVALID_COMMAND",
  );
  return d;
}
import {
  connectionBetween,
  movableShipCount,
  type HexEdge,
  type MovementAbilities,
  type MovementSector,
  type MovementShip,
} from "./geometry";
import {
  incomeForPopulationAway,
  upkeepForEmptyInfluenceSlots,
} from "./tracks";

export class RuleViolation extends Error {
  readonly detail: ValidationError;
  constructor(detail: ValidationError) {
    super(detail.message);
    this.detail = detail;
  }
}
export function requireRule(
  condition: boolean,
  message: string,
  code: ValidationError["code"] = "ILLEGAL_ACTION",
): asserts condition {
  if (!condition) throw new RuleViolation({ code, message, field: null });
}
export function continuation(state: GameState) {
  requireRule(
    !!state.engine,
    "This snapshot needs its original game engine.",
    "VERSION_MISMATCH",
  );
  return state.engine!;
}
export function player(state: GameState, id: string): Seat {
  const found = state.seats.find((s) => s.id === id);
  requireRule(!!found, "Seat does not belong to this game.", "NOT_A_SEAT");
  return found!;
}
export function hasTech(seat: Seat, id: string): boolean {
  return Object.values(seat.technologies).some((track) => track.includes(id));
}
export function emit(
  events: GameEvent[],
  seatId: string | null,
  message: string,
  type: GameEvent["type"] = "action",
): void {
  events.push({ type, seatId, visibility: "public", message });
}
export function uniqueId(state: GameState, prefix: string): string {
  return `${prefix}-${continuation(state).nextId++}`;
}
export function queueDecision(
  state: GameState,
  decision: PendingDecision,
): void {
  continuation(state).decisions.push(decision);
}
export function presentNextDecision(state: GameState): boolean {
  if (!state.pendingDecision)
    state.pendingDecision = continuation(state).decisions.shift() ?? null;
  const decision = state.pendingDecision;
  if (
    decision?.kind === "discovery" &&
    getDiscovery(decision.tileId as DiscoveryId).effect.kind ===
      "free-technology" &&
    ancientTechnologyChoices(
      state.technologyMarket,
      player(state, decision.owner).technologies,
    ).length === 0
  )
    decision.options = ["keep"];
  return !!state.pendingDecision;
}
export function mapSector(sector: Sector): MovementSector {
  const d = requireSectorDefinition(Number(sector.tileId));
  return {
    id: sector.id,
    q: sector.position.q,
    r: sector.position.r,
    rotation: sector.rotation as HexEdge,
    wormholes: d.wormholes,
    warpPortal: d.warpPortal || !!sector.portalVp,
    controller: sector.owner,
  };
}
export function movementAbilities(seat: Seat): MovementAbilities {
  return {
    wormholeGenerator: hasTech(seat, "wormhole-generator"),
    cloakingDevice: hasTech(seat, "cloaking-device"),
    descendantsOfDraco: factionHasCapability(seat.faction, "ancient-coexistence"),
  };
}
export function movementShips(state: GameState): MovementShip[] {
  return state.ships.map((ship) => ({
    id: ship.id,
    sectorId: ship.sectorId,
    owner: ship.owner,
    kind: ship.type,
    movement: 0,
  }));
}
export function unpinned(
  state: GameState,
  seat: Seat,
  sectorId: string,
): number {
  return movableShipCount(
    seat.id,
    sectorId,
    movementShips(state),
    movementAbilities(seat),
  );
}
export function connected(from: Sector, to: Sector, seat?: Seat): boolean {
  return (
    connectionBetween(
      mapSector(from),
      mapSector(to),
      seat ? hasTech(seat, "wormhole-generator") : false,
    ) !== "none"
  );
}
export function hasEnemy(
  state: GameState,
  seat: Seat,
  sectorId: string,
): boolean {
  return state.ships.some(
    (s) =>
      s.sectorId === sectorId &&
      s.owner !== seat.id &&
      !(factionHasCapability(seat.faction, "ancient-coexistence") && s.type === "ancient"),
  );
}
export function capacity(seat: Seat, action: Action): number {
  if (seat.passed) {
    requireRule(
      ["upgrade", "build", "move"].includes(action),
      "After passing you may only react with Upgrade, Build or Move.",
    );
    return 1;
  }
  return (
    getFaction(seat.faction).activations[action] +
    (action === "build" && hasTech(seat, "nanorobots") ? 1 : 0) +
    (action === "move" && hasTech(seat, "improved-logistics") ? 1 : 0) +
    (action === "upgrade" && hasTech(seat, "pico-modulator") ? 2 : 0)
  );
}
export function beginAction(
  state: GameState,
  seat: Seat,
  action: Action,
): number {
  const e = continuation(state);
  requireRule(
    state.phase === "action" && state.activeSeatId === seat.id,
    "Wait for your action turn.",
    "NOT_YOUR_TURN",
  );
  if (e.action) {
    if (e.action.owner === seat.id && e.action.budgets) {
      const budget = e.action.budgets[action] ?? 0;
      requireRule(budget > 0, "This mixed action has no activations of that type remaining.");
      return budget;
    }
    requireRule(
      e.action.owner === seat.id &&
        e.action.action === action &&
        e.action.remaining > 0,
      "Finish your current action before starting another.",
    );
    return e.action.remaining;
  }
  requireRule(
    seat.influenceOnTrack > 0,
    "No influence discs remain for another action.",
  );
  const mixed = !seat.passed ? getFaction(seat.faction).special?.mixedAction?.[action as 'move' | 'build'] : undefined;
  const n = capacity(seat, action);
  seat.influenceOnTrack--;
  seat.actionDiscs[action]++;
  const mixedBudgets = mixed
    ? { move: action === 'move' ? n : mixed.move, build: action === 'build' ? n : mixed.build }
    : null;
  e.action = mixedBudgets
    ? { owner: seat.id, action, remaining: mixedBudgets.move + mixedBudgets.build, budgets: mixedBudgets }
    : { owner: seat.id, action, remaining: n };
  return mixedBudgets ? mixedBudgets[action === 'move' ? 'move' : 'build'] : n;
}
export function consumeActivations(state: GameState, count: number, kind?: Action): void {
  const action = continuation(state).action;
  const budgetKind = kind ?? action?.action;
  const available = action?.budgets ? action.budgets[budgetKind!] ?? 0 : action?.remaining ?? 0;
  requireRule(
    !!action &&
      Number.isInteger(count) &&
      count > 0 &&
      count <= available,
    "The action has too few activations.",
  );
  if (action!.budgets) {
    action!.budgets[budgetKind!] = available - count;
    action!.remaining = Object.values(action!.budgets).reduce((sum, value) => sum + (value ?? 0), 0);
  } else action!.remaining -= count;
}
export function paidActivationCost(seat: Seat, action: Action): number | null {
  const ability = getFaction(seat.faction).special?.paidAdditionalActivation;
  if (!ability) return null;
  return ability[action] + (seat.influenceOnTrack <= ability.lowDiscThreshold ? ability.lowDiscSurcharge : 0);
}
export function canBuyActivation(state: GameState, seat: Seat): boolean {
  const action = continuation(state).action;
  if (!action || action.owner !== seat.id || action.paidBonusUsed || seat.passed) return false;
  const cost = paidActivationCost(seat, action.action);
  return cost !== null && seat.resources.money >= cost;
}
export function resourceOptions(seat: Seat): Resource[] {
  return (["money", "science", "materials"] as Resource[]).filter(
    (r) => seat.populationTracks[r] < 11,
  );
}
export function returnOptions(seat: Seat): Resource[] {
  return (["money", "science", "materials"] as Resource[]).filter(
    (r) => seat.populationTracks[r] > -1,
  );
}
export function upkeepBalance(seat: Seat): number {
  return (
    seat.resources.money +
    incomeForPopulationAway(seat.populationTracks.money) -
    upkeepForEmptyInfluenceSlots(Math.max(0, 13 - seat.influenceOnTrack))
  );
}
export function enqueueCubeReturn(
  state: GameState,
  owner: string,
  resources: Resource[],
  destination: "track" | "graveyard" = "track",
): void {
  const seat = player(state, owner);
  const choices =
    destination === "graveyard"
      ? resources
      : resources.filter((r) => returnOptions(seat).includes(r));
  const allowed = choices.length ? choices : returnOptions(seat);
  if (allowed.length === 1 && destination === "track") {
    seat.populationTracks[allowed[0]]--;
    return;
  }
  queueDecision(state, {
    id: uniqueId(state, "cube"),
    owner,
    kind: "population-return",
    count: 1,
    resources: allowed,
    destination,
  });
}
export function abandonSector(state: GameState, sector: Sector): void {
  requireRule(sector.owner !== null, "Sector has no controller.");
  const seat = player(state, sector.owner!);
  const definition = requireSectorDefinition(Number(sector.tileId));
  seat.influenceOnTrack++;
  for (const cube of sector.population) {
    const square = definition.population[Number(cube.squareId.slice(1))];
    const choices: Resource[] =
      cube.squareId === "orbital"
        ? ["money", "science"]
        : square?.resource === "gray"
          ? ["money", "science", "materials"]
          : [cube.resource];
    enqueueCubeReturn(state, seat.id, choices);
  }
  sector.population = [];
  sector.owner = null;
}
