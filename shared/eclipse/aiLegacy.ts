import { reputationCapacity } from "./battleEngine";
import { factionHasCapability, getFaction } from "./catalog";
import { estimatePublicBattle } from "./aiLegacySimulation";
import {
  legalCommands,
  publicBlueprint,
  type LegalCommandCandidate,
} from "./legal";
import { deriveBlueprintStats, neutralBlueprint } from "./blueprints";
import {
  incomeForPopulationAway,
  upkeepForEmptyInfluenceSlots,
} from "./tracks";
import { sectorDefinition } from "./sectors";
import { randomInt, randomSeed } from "./random";
import type { GameCommand, PlayerView, Resource } from "./types";
export interface AiChoice extends LegalCommandCandidate {
  evaluation: number;
}
/** Public fleet estimate; simulation jitter never consumes the authoritative gameplay stream. */
function fleetStrength(
  view: PlayerView,
  owner: string,
  sectorId: string,
): number {
  return view.ships
    .filter((s) => s.owner === owner && s.sectorId === sectorId)
    .reduce((sum, ship) => {
      const seat = view.seats.find((s) => s.id === owner);
      const blueprint = seat?.blueprints.find((b) => b.shipType === ship.type);
      const stats =
        seat && blueprint
          ? deriveBlueprintStats(seat.faction, publicBlueprint(blueprint))
          : ship.type === "ancient" ||
              ship.type === "guardian" ||
              ship.type === "gcds"
            ? neutralBlueprint(`${ship.type}-standard`).stats
            : null;
      return (
        sum +
        (stats
          ? Math.max(1, stats.hull + 1 - ship.damage) *
              (1 + stats.shield * 0.35) +
            stats.weapons.reduce(
              (n, w) =>
                n +
                w.dice * w.damage * (0.33 + Math.min(3, stats.computer) * 0.12),
              0,
            ) *
              2
          : 1)
      );
    }, 0);
}
export function evaluateLegacyAiCommand(
  view: PlayerView,
  command: GameCommand,
): number {
  const seat = view.seats.find((s) => s.id === view.viewerSeatId)!;
  const factionPolicy = getFaction(seat.faction).capabilities.ai;
  const income = incomeForPopulationAway(seat.populationTracks.money);
  const balance =
    seat.resources.money +
    income -
    upkeepForEmptyInfluenceSlots(Math.max(0, 13 - seat.influenceOnTrack));
  const sectors = view.sectors.filter((s) => s.owner === seat.id);
  const ownShips = view.ships.filter((s) => s.owner === seat.id);
  const utility = (resource: Resource) =>
    resource === "money"
      ? balance < 3
        ? 5
        : 1
      : resource === "science"
        ? factionPolicy.scienceValue
        : factionPolicy.materialsValue;
  const discPenalty = view.actionProgress ? 0 : Math.max(0, 3 - balance) * 4;
  switch (command.type) {
    case "trade-and-act": return -100; // The normal AI generates ordinary trades, not funded wrappers.
    case "set-auto-pass":
      return -Infinity; // A human preference is never an AI gameplay candidate.
    case "pass":
      return balance < 0 ? 30 : balance < 3 ? 10 : 0;
    case "end-action":
      return view.actionProgress?.remaining === 0 ? 8 : -2;
    case "finish-upkeep":
      return 10;
    case "discard-reputation":
      return -20;
    case "trade":
      return command.to === "money" && balance < 0
        ? 40
        : command.from === "money" &&
            balance > 12 &&
            seat.resources[command.to] < 3
          ? 5
          : -20;
    case "convert-colony-ship":
      return utility(command.resource) * 3 - 2;
    case "buy-activation":
      return 12 - (getFaction(seat.faction).special?.paidAdditionalActivation?.[command.action] ?? 9);
    case "colonize":
      return (
        35 +
        command.placements.reduce((sum, p) => sum + utility(p.resource) * 3, 0)
      );
    case "explore":
      return (
        (view.round < 5 ? 18 : 9) +
        factionPolicy.exploreBias -
        sectors.length -
        discPenalty
      );
    case "research":
      return (
        11 +
        factionPolicy.researchBias +
        (command.tileId === "advanced-economy" && balance < 5 ? 5 : 0) +
        (command.tileId === "nanorobots"
          ? factionPolicy.nanorobotsBias
          : 0) +
        (view.round > 5 && seat.technologies[command.track].length >= 3
          ? 4
          : 0) -
        discPenalty
      );
    case "build":
      return (
        command.builds.reduce(
          (score, b) =>
            score +
            (b.component === "monolith"
              ? view.round >= 6
                ? 17
                : 3
              : b.component === "orbital"
                ? view.round <= 5
                  ? 15
                  : 5
                : Math.max(0, 14 - ownShips.length * 2) +
                  factionPolicy.shipBuildBias),
          0,
        ) - discPenalty
      );
    case "upgrade": {
      let improvement = 0;
      for (const next of command.blueprints) {
        const prev = seat.blueprints.find((b) => b.shipType === next.shipType)!;
        const a = deriveBlueprintStats(seat.faction, publicBlueprint(prev)),
          b = deriveBlueprintStats(seat.faction, publicBlueprint(next));
        const value = (s: typeof a) =>
          s.hull * 0.9 +
          s.computer * 1.6 +
          s.shield * 1.1 +
          s.movement * 1.3 +
          s.weapons.reduce((n, w) => n + w.damage * w.dice * 1.5, 0) +
          Math.max(0, s.energyProduction - s.energyConsumption) * 0.2;
        improvement +=
          (value(b) - value(a)) *
          (1 + ownShips.filter((s) => s.type === next.shipType).length * 0.7);
      }
      return (
        improvement * 3 +
        factionPolicy.upgradeBias -
        discPenalty -
        4
      );
    }
    case "influence":
      return command.addSectorIds.length
        ? 18 +
            command.addSectorIds.reduce(
              (n, id) =>
                n +
                sectorDefinition(
                  Number(view.sectors.find((s) => s.id === id)!.tileId),
                )!.victoryPoints,
              0,
            ) -
            discPenalty
        : balance < 0
          ? 15
          : -12;
    case "offer-diplomacy":
      return factionPolicy.diplomacyValue;
    case "move": {
      const move = command.moves[0],
        ship = view.ships.find((s) => s.id === move.shipId)!;
      const to = view.sectors.find((s) => s.id === move.path.at(-1))!;
      const others = [
        ...new Set(
          view.ships
            .filter(
              (s) =>
                s.sectorId === to.id &&
                s.owner !== seat.id &&
                !(factionHasCapability(seat.faction, "ancient-coexistence") && s.type === "ancient"),
            )
            .map((s) => s.owner),
        ),
      ];
      const enemy = others.reduce(
        (n, id) => n + fleetStrength(view, id, to.id),
        0,
      );
      const strength = fleetStrength(view, seat.id, ship.sectorId);
      if (enemy && strength < enemy * 1.15) return -15 - discPenalty;
      return (
        (to.owner === seat.id ? -5 : to.owner === null ? 10 : 8) +
        (enemy ? 4 : 0) +
        sectorDefinition(Number(to.tileId))!.victoryPoints * 0.6 -
        discPenalty
      );
    }
    case "resolve": {
      const c = command.choice;
      switch (c.kind) {
        case "exploration":
          return c.drawAnother
            ? 30
            : c.tileId === null
              ? -10
              : sectorDefinition(Number(c.tileId))!.victoryPoints * 3 +
                sectorDefinition(Number(c.tileId))!.population.length * 2 +
                sectorDefinition(Number(c.tileId))!.ancients *
                  factionPolicy.ancientExplorationValue;
        case "discovery":
          return c.option === "use" && view.round < 7 ? 12 : 5;
        case "ancient-part":
          return c.blueprint ? 15 : 3;
        case "control":
          return c.accept ? (balance >= 1 ? 15 : 0) : 1;
        case "diplomacy-window":
          if (!c.offerTo) return 0;
          if (
            view.pendingDecision?.kind === "diplomacy-window" &&
            view.pendingDecision.declinedSeatIds?.includes(c.offerTo)
          )
            return -5;
          {
            const other = view.seats.find((s) => s.id === c.offerTo)!;
            return reputationCapacity({
              ...seat,
              ambassadors: [...seat.ambassadors, other.id],
            }) < view.private.reputation.length ||
              reputationCapacity({
                ...other,
                ambassadors: [...other.ambassadors, seat.id],
              }) <
                (view.hiddenTileCounts.find((h) => h.seatId === other.id)
                  ?.reputation ?? 0)
              ? -5
              : 8;
          }
        case "diplomacy":
          return c.accept ? 8 : 0;
        case "reputation":
          return (c.kept?.reduce((n, v) => n + v, 0) ?? 0) * 10;
        case "resource-reward":
          return c.resources.reduce((n, r) => n + utility(r), 0);
        case "population-return":
          return -c.resources.reduce((n, r) => n + utility(r), 0);
        case "bankruptcy": {
          const s = view.sectors.find((s) => s.id === c.abandonSectorId)!;
          return (
            -sectorDefinition(Number(s.tileId))!.victoryPoints * 3 -
            s.population.length * 2 -
            (s.monolith ? 10 : 0)
          );
        }
        case "combat-turn":
        case "retreat": {
          const retreat = c.kind === "retreat" ? c.destinationId : c.retreatTo;
          const battle = view.battle;
          const danger = battle
            ? fleetStrength(
                view,
                battle.attacker === seat.id ? battle.defender : battle.attacker,
                battle.sectorId,
              ) >
              fleetStrength(view, seat.id, battle.sectorId) * 1.3
            : false;
          return retreat ? (danger ? 20 : -5) : danger ? -5 : 10;
        }
        case "combat-allocation":
          return 10;
        case "free-technology":
          return c.track === "grid" && balance < 3 ? 10 : 8;
        case "portal-placement":
          return 7;
        case "initiative-order":
          return 5;
        case "bombardment":
          return c.squareIds.length * 4;
        case "colonization":
          return c.placements.length * 8;
      }
    }
  }
}
/** One bounded decision with shallow public-outcome scoring. This function cannot access hidden state. */
export function chooseLegacyAiCommand(
  view: PlayerView,
  simulationSeed: number,
): AiChoice | null {
  const candidates = legalCommands(view);
  if (!candidates.length) return null;
  let random = randomSeed(simulationSeed >>> 0);
  let best: AiChoice | null = null;
  const combatCache = new Map<string, number>();
  const estimate = (attackerIds: string[], defenderIds: string[]): number => {
    const key =
      [...attackerIds].sort().join(",") +
      "|" +
      [...defenderIds].sort().join(",");
    const cached = combatCache.get(key);
    if (cached !== undefined) return cached;
    const probability = estimatePublicBattle(
      view,
      attackerIds,
      defenderIds,
      simulationSeed,
      16,
    ).winProbability;
    combatCache.set(key, probability);
    return probability;
  };
  for (const candidate of candidates) {
    const next = randomInt(random, 1000);
    random = next.state;
    let evaluation =
      evaluateLegacyAiCommand(view, candidate.command) + next.value / 10000;
    const command = candidate.command;
    if (command.type === "move") {
      const move = command.moves[0],
        destination = move.path.at(-1)!;
      const own = view.ships
        .filter(
          (s) =>
            s.owner === view.viewerSeatId &&
            (s.id === move.shipId || s.sectorId === destination),
        )
        .map((s) => s.id);
      const enemy = view.ships
        .filter(
          (s) =>
            s.sectorId === destination &&
            s.owner !== view.viewerSeatId &&
            !(
              !!view.seats.find((p) => p.id === view.viewerSeatId &&
                factionHasCapability(p.faction, "ancient-coexistence")) && s.type === "ancient"
            ),
        )
        .map((s) => s.id);
      if (enemy.length) {
        const chance = estimate(own, enemy);
        evaluation += chance < 0.5 ? -35 : (chance - 0.5) * 20;
      }
    }
    if (
      command.type === "resolve" &&
      (command.choice.kind === "combat-turn" ||
        command.choice.kind === "retreat") &&
      view.battle
    ) {
      const own = view.ships
        .filter(
          (s) =>
            s.sectorId === view.battle!.sectorId &&
            s.owner === view.viewerSeatId,
        )
        .map((s) => s.id);
      const opponent =
        view.battle.attacker === view.viewerSeatId
          ? view.battle.defender
          : view.battle.attacker;
      const enemy = view.ships
        .filter(
          (s) => s.sectorId === view.battle!.sectorId && s.owner === opponent,
        )
        .map((s) => s.id);
      const chance =
        view.battle.attacker === view.viewerSeatId
          ? estimate(own, enemy)
          : 1 - estimate(enemy, own);
      const retreat =
        command.choice.kind === "retreat"
          ? command.choice.destinationId
          : command.choice.retreatTo;
      evaluation += retreat
        ? chance < 0.35
          ? 30
          : -15
        : chance < 0.35
          ? -20
          : 10;
    }
    if (!best || evaluation > best.evaluation)
      best = { ...candidate, evaluation };
  }
  return best;
}
