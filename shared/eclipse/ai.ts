import { generateAiCandidates } from "./aiCandidates";
import { getFaction } from "./catalog";
import { connectionBetween } from "./geometry";
import { mapSector, movementAbilities } from "./rulesState";
import { fundingOptions } from "./funding";
import { reputationCapacity } from "./battleEngine";
import { estimatePublicBattle } from "./aiSimulation";
import { publicBlueprint, type LegalCommandCandidate } from "./legal";
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
/** Marginal value includes the actual nonlinear money and influence tracks. */
export function sectorControlValue(view: PlayerView, id: string): number {
  const seat = view.seats.find((s) => s.id === view.viewerSeatId)!;
  const sector = view.sectors.find((s) => s.id === id),
    definition = sector && sectorDefinition(Number(sector.tileId));
  if (!sector || !definition) return -20;
  const empty = Math.max(0, Math.min(13, 13 - seat.influenceOnTrack));
  const marginal =
    upkeepForEmptyInfluenceSlots(Math.min(13, empty + 1)) -
    upkeepForEmptyInfluenceSlots(empty);
  const balance =
    seat.resources.money +
    incomeForPopulationAway(seat.populationTracks.money) -
    upkeepForEmptyInfluenceSlots(empty);
  const turns = Math.max(1, 9 - view.round);
  const techs = Object.values(seat.technologies).flat();
  let money = 0,
    moneyCubes = 0,
    production = 0;
  for (const p of definition.population) {
    if (
      p.advanced &&
      !techs.includes("metasynthesis") &&
      !techs.includes(
        p.resource === "science"
          ? "advanced-labs"
          : p.resource === "materials"
            ? "advanced-mining"
            : "advanced-economy",
      )
    )
      continue;
    if (p.resource === "money") {
      money +=
        incomeForPopulationAway(
          Math.min(11, seat.populationTracks.money + moneyCubes + 1),
        ) -
        incomeForPopulationAway(
          Math.min(11, seat.populationTracks.money + moneyCubes),
        );
      moneyCubes++;
    } else production += p.resource === "science" ? 2.4 : 2.2;
  }
  const usefulMoney = balance < 6 ? money * 2.5 : money * 0.4;
  return (
    definition.victoryPoints * 3 +
    (production + usefulMoney - marginal * 1.6) * Math.min(3, turns) +
    (sector.discovery ? 2 : 0) +
    (seat.faction === "planta" ? 3 : 0)
  );
}
function technologyValue(view: PlayerView, id: string): number {
  const seat = view.seats.find((s) => s.id === view.viewerSeatId)!;
  const own = view.ships.filter((s) => s.owner === seat.id);
  const threatened = view.sectors.some(
    (target) =>
      target.owner &&
      target.owner !== seat.id &&
      target.population.length &&
      view.sectors.some(
        (from) =>
          (from.owner === seat.id || own.some((s) => s.sectorId === from.id)) &&
          connectionBetween(
            mapSector(from),
            mapSector(target),
            movementAbilities(seat).wormholeGenerator,
          ) !== "none",
      ),
  );
  if (id === "improved-hull")
    return view.round <= 3 && own.length && seat.influenceOnTrack >= 3
      ? 30
      : own.length
        ? 16
        : 8;
  if (id === "neutron-bombs") return threatened && own.length >= 2 ? 23 : 7;
  if (["advanced-labs", "advanced-mining", "advanced-economy"].includes(id)) {
    const resource =
      id === "advanced-labs"
        ? "science"
        : id === "advanced-mining"
          ? "materials"
          : "money";
    const available = view.sectors
      .filter((s) => s.owner === seat.id)
      .reduce(
        (n, s) =>
          n +
          (sectorDefinition(Number(s.tileId))?.population.filter(
            (p, i) =>
              p.advanced &&
              (p.resource === resource || p.resource === "gray") &&
              !s.population.some((c) => c.squareId === `p${i}`),
          ).length ?? 0),
        0,
      );
    return 6 + available * Math.min(6, 9 - view.round);
  }
  if (id === "monolith")
    return view.round >= 5 && seat.resources.materials >= 10 ? 19 : 5;
  if (id === "orbital") return view.round <= 4 ? 14 : 7;
  return 11;
}
function shipBuildValue(
  view: PlayerView,
  type: string,
  sectorId: string,
): number {
  const seat = view.seats.find((s) => s.id === view.viewerSeatId)!;
  const own = view.ships.filter((s) => s.owner === seat.id),
    enemy = view.ships.filter(
      (s) =>
        s.owner !== seat.id &&
        !["ancient", "guardian", "gcds"].includes(s.type),
    );
  const sector = view.sectors.find((s) => s.id === sectorId)!;
  const targets = view.sectors.filter(
    (s) =>
      s.owner !== seat.id &&
      connectionBetween(
        mapSector(sector),
        mapSector(s),
        movementAbilities(seat).wormholeGenerator,
      ) !== "none",
  );
  const threat = targets.some((s) =>
    view.ships.some((ship) => ship.sectorId === s.id && ship.owner !== seat.id),
  );
  const invasion = targets.some((s) =>
    view.ships.some(
      (ship) =>
        ship.sectorId === s.id &&
        ship.owner !== seat.id &&
        view.seats.some((player) => player.id === ship.owner),
    ),
  );
  if (type === "starbase")
    return invasion
      ? Math.max(0, 18 - fleetStrength(view, seat.id, sectorId) * 2)
      : -12;
  const stats = seat.blueprints.find((b) => b.shipType === type);
  if (!stats) return 0;
  const derived = deriveBlueprintStats(seat.faction, publicBlueprint(stats));
  const quality =
    derived.hull * 0.8 +
    derived.computer +
    derived.weapons.reduce((n, w) => n + w.damage * w.dice, 0);
  return (
    Math.max(2, 12 - own.length * 0.8 + Math.min(8, enemy.length * 0.7)) +
    (threat ? 5 : 0) +
    Math.min(6, quality) +
    (view.round >= 7 ? -6 : 0)
  );
}
export function evaluateAiCommand(
  view: PlayerView,
  command: GameCommand,
): number {
  const seat = view.seats.find((s) => s.id === view.viewerSeatId)!;
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
        ? seat.faction === "hydran"
          ? 2.4
          : 1.8
        : seat.faction === "mechanema"
          ? 2.1
          : 1.6;
  const nextBalance =
    seat.resources.money +
    income -
    upkeepForEmptyInfluenceSlots(
      Math.min(
        13,
        Math.max(0, (view.actionProgress ? 13 : 14) - seat.influenceOnTrack),
      ),
    );
  const discPenalty = view.actionProgress
    ? 0
    : Math.max(0, -nextBalance) * 12 + Math.max(0, 2 - nextBalance) * 2;
  switch (command.type) {
    case "trade-and-act": {
      const option = fundingOptions(view, command.action).find(
        (o) => JSON.stringify(o.trades) === JSON.stringify(command.trades),
      );
      if (!option) return -100;
      const funded = {
        ...view,
        seats: view.seats.map((s) =>
          s.id === seat.id
            ? { ...s, resources: option.resourcesAfterTrade }
            : s,
        ),
      };
      const lost = command.trades.reduce(
        (sum, t) =>
          sum +
          t.amount *
            getFaction(seat.faction).tradeRatio *
            utility(t.from) *
            0.7,
        0,
      );
      const reserve =
        option.resourcesAfter.money +
        income -
        upkeepForEmptyInfluenceSlots(
          Math.min(
            13,
            Math.max(
              0,
              (view.actionProgress ? 13 : 14) - seat.influenceOnTrack,
            ),
          ),
        );
      return (
        evaluateAiCommand(funded, command.action) -
        lost -
        Math.max(0, -reserve) * 8
      );
    }
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
    case "colonize":
      return (
        35 +
        command.placements.reduce((sum, p) => sum + utility(p.resource) * 3, 0)
      );
    case "explore":
      return (
        (view.round < 5 ? (sectors.length < 3 ? 27 : 20) : 9) +
        (seat.faction === "planta" ? 4 : seat.faction === "draco" ? 3 : 0) -
        sectors.length -
        discPenalty
      );
    case "research":
      return (
        technologyValue(view, command.tileId) +
        (seat.faction === "hydran" ? 4 : 0) +
        (command.tileId === "advanced-economy" && balance < 5 ? 5 : 0) +
        (command.tileId === "nanorobots" && seat.faction === "mechanema"
          ? 4
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
                : shipBuildValue(view, b.component, b.sectorId) +
                  (seat.faction === "orion"
                    ? 3
                    : seat.faction === "mechanema"
                      ? 2
                      : 0)),
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
          (s.weapons.length ? 0 : -12) +
          s.hull * 0.9 +
          s.shield * 1.1 +
          s.movement * 1.1 +
          s.weapons.reduce(
            (n, w) =>
              n +
              w.damage *
                w.dice *
                (w.kind === "missile" ? 0.9 : 1.5) *
                (1 + Math.min(4, s.computer) * 0.45),
            0,
          ) +
          Math.max(0, s.energyProduction - s.energyConsumption) * 0.03;
        improvement +=
          (value(b) - value(a)) *
          (0.4 + ownShips.filter((s) => s.type === next.shipType).length * 0.7);
      }
      return (
        improvement * 5 +
        (seat.faction === "mechanema" ? 1 : 0) -
        discPenalty -
        4
      );
    }
    case "influence":
      return command.addSectorIds.length
        ? command.addSectorIds.reduce(
            (sum, id) => sum + sectorControlValue(view, id),
            0,
          ) -
            command.removeSectorIds.reduce(
              (sum, id) => sum + sectorControlValue(view, id),
              0,
            ) -
            discPenalty
        : balance < 0
          ? 15
          : -12;
    case "offer-diplomacy":
      return seat.faction === "orion" ? 3 : 7;
    case "move": {
      const final = new Map(
        command.moves.map((m) => [m.shipId, m.path.at(-1)!]),
      );
      let value = 0;
      for (const destination of new Set(final.values())) {
        const to = view.sectors.find((s) => s.id === destination)!;
        const projected = {
          ...view,
          ships: view.ships.map((s) =>
            final.has(s.id) ? { ...s, sectorId: final.get(s.id)! } : s,
          ),
        };
        const others = [
          ...new Set(
            view.ships
              .filter(
                (s) =>
                  s.sectorId === destination &&
                  s.owner !== seat.id &&
                  !(seat.faction === "draco" && s.type === "ancient"),
              )
              .map((s) => s.owner),
          ),
        ];
        const enemy = others.reduce(
            (n, id) => n + fleetStrength(view, id, destination),
            0,
          ),
          strength = fleetStrength(projected, seat.id, destination);
        if (enemy && strength < enemy * 0.8) {
          value -= 25;
          continue;
        }
        const leader = view.seats
          .filter((s) => s.id !== seat.id)
          .sort(
            (a, b) =>
              view.sectors.filter((s) => s.owner === b.id).length -
              view.sectors.filter((s) => s.owner === a.id).length,
          )[0];
        value +=
          (to.owner === seat.id
            ? -6
            : sectorControlValue(view, destination) +
              (to.owner === leader?.id ? 3 : 0)) + (enemy ? 5 : 0);
        if (to.owner && seat.ambassadors.includes(to.owner)) value -= 18;
        if (to.owner === seat.id && others.length === 0) {
          const threats = view.sectors.filter(
            (s) =>
              s.owner !== seat.id &&
              connectionBetween(
                mapSector(to),
                mapSector(s),
                movementAbilities(seat).wormholeGenerator,
              ) !== "none",
          );
          if (
            threats.some((s) =>
              view.ships.some(
                (ship) =>
                  ship.sectorId === s.id &&
                  ship.owner !== seat.id &&
                  view.seats.some((player) => player.id === ship.owner),
              ),
            ) &&
            fleetStrength(view, seat.id, destination) < 8
          )
            value += 10;
        }
      }
      return value - discPenalty;
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
                sectorDefinition(Number(c.tileId))!.population.length * 2 -
                sectorDefinition(Number(c.tileId))!.ancients *
                  (seat.faction === "draco" ? -3 : 4);
        case "discovery":
          return c.option === "use" && view.round < 7 ? 12 : 5;
        case "ancient-part":
          return c.blueprint ? 15 : 3;
        case "control":
          return c.accept && view.pendingDecision?.kind === "control"
            ? sectorControlValue(view, view.pendingDecision.sectorId)
            : 1;
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
          return c.kept.reduce((n, v) => n + v, 0) * 10;
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
export function chooseAiCommand(
  view: PlayerView,
  simulationSeed: number,
): AiChoice | null {
  const candidates = generateAiCandidates(view);
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
      evaluateAiCommand(view, candidate.command) + next.value / 10000;
    const command = candidate.command;
    if (command.type === "move") {
      const destination = command.moves.at(-1)!.path.at(-1)!;
      const arrivals = new Set(
        command.moves
          .filter((m) => m.path.at(-1) === destination)
          .map((m) => m.shipId),
      );
      const own = view.ships
        .filter(
          (s) =>
            s.owner === view.viewerSeatId &&
            (arrivals.has(s.id) || s.sectorId === destination),
        )
        .map((s) => s.id);
      const enemy = view.ships
        .filter(
          (s) =>
            s.sectorId === destination &&
            s.owner !== view.viewerSeatId &&
            !(
              view.seats.find((p) => p.id === view.viewerSeatId)?.faction ===
                "draco" && s.type === "ancient"
            ),
        )
        .map((s) => s.id);
      if (enemy.length) {
        const owners = [
          ...new Set(
            enemy.map((id) => view.ships.find((s) => s.id === id)!.owner),
          ),
        ];
        const chance = Math.min(
          ...owners.map((owner) =>
            estimate(
              own,
              enemy.filter(
                (id) => view.ships.find((s) => s.id === id)!.owner === owner,
              ),
            ),
          ),
        );
        evaluation += chance < 0.5 ? -35 : (chance - 0.5) * 24;
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
          : estimatePublicBattle(view, enemy, own, simulationSeed, 16)
              .defenderWinProbability;
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
