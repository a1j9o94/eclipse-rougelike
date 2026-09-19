import { getFaction } from "./catalog";
import { capacity } from "./rulesState";
import {
  incomeForPopulationAway,
  upkeepForEmptyInfluenceSlots,
} from "./tracks";
import { researchCost, getTechnology, type TechnologyId } from "./technologies";
import type {
  Action,
  GameCommand,
  PlayerView,
  Resources,
  Track,
} from "./types";
export interface CommandPreview {
  betrayedPartners: string[];
  resourcesAfter: Resources;
  influenceAfter: number;
  upkeepBefore: number;
  upkeepAfter: number;
  moneyBalanceAfter: number;
  moneyIncomeAfter: number;
  populationChoiceMayChangeIncome: boolean;
}
/** Public draft projection only; authoritative legality and hidden outcomes remain server-owned. */
export function previewCommand(
  view: PlayerView,
  command: GameCommand,
): CommandPreview {
  if (command.type === "trade-and-act") {
    const converted = structuredClone(view);
    const fundingSeat = converted.seats.find((s) => s.id === view.viewerSeatId);
    if (!fundingSeat) throw Error("A command preview needs an owned seat.");
    for (const trade of command.trades) {
      fundingSeat.resources[trade.from] -=
        trade.amount * getFaction(fundingSeat.faction).tradeRatio;
      fundingSeat.resources[trade.to] += trade.amount;
    }
    return previewCommand(converted, command.action);
  }
  const seat = view.seats.find((s) => s.id === view.viewerSeatId);
  if (!seat) throw new Error("A command preview needs an owned seat.");
  const resources = { ...seat.resources },
    population = { ...seat.populationTracks };
  let influence = seat.influenceOnTrack,
    uncertain = false;
  const faction = getFaction(seat.faction);
  const actions: readonly Action[] = [
    "explore",
    "research",
    "build",
    "upgrade",
    "move",
    "influence",
  ];
  if (actions.some((a) => a === command.type) && !view.actionProgress)
    influence--;
  if (command.type === "build")
    for (const build of command.builds)
      resources.materials -= faction.constructionCosts[build.component];
  if (command.type === "trade") {
    resources[command.from] -= command.amount * faction.tradeRatio;
    resources[command.to] += command.amount;
  }
  if (command.type === "research") {
    const cost = researchCost(
      command.tileId as TechnologyId,
      command.track,
      Object.entries(seat.technologies).flatMap(([track, ids]) =>
        ids.map((technology) => ({
          track: track as Track,
          technology: technology as TechnologyId,
        })),
      ),
    );
    if (cost.ok) {
      resources.science -= cost.scienceCost;
      const effect = getTechnology(command.tileId as TechnologyId).effect;
      if (effect.kind === "gain-influence") influence += effect.amount;
    }
  }
  if (command.type === "colonize")
    for (const p of command.placements) population[p.resource]++;
  if (command.type === "influence") {
    influence += command.removeSectorIds.length - command.addSectorIds.length;
    for (const id of command.removeSectorIds) {
      const sector = view.sectors.find((s) => s.id === id);
      for (const cube of sector?.population ?? []) {
        population[cube.resource]--;
        uncertain = true;
      }
    }
  }
  if (
    command.type === "resolve" &&
    command.choice.kind === "control" &&
    command.choice.accept
  )
    influence--;
  const moveCapacity = view.actionProgress
    ? view.actionProgress.owner === seat.id &&
      view.actionProgress.action === "move"
      ? view.actionProgress.remaining
      : 0
    : capacity(seat, "move");
  const completesMove =
    command.type === "move" &&
    command.moves.length > 0 &&
    command.moves.length === moveCapacity;
  const destinations = new Map(
    command.type === "move"
      ? command.moves.flatMap((move) =>
          move.path.length
            ? [[move.shipId, move.path[move.path.length - 1]] as const]
            : [],
        )
      : [],
  );
  const projectedShips =
    command.type === "move"
      ? view.ships.map((ship) => ({
          ...ship,
          sectorId: destinations.get(ship.id) ?? ship.sectorId,
        }))
      : view.ships;
  const betrayedPartners =
    command.type === "end-action" || completesMove
      ? seat.ambassadors.filter((partner) =>
          projectedShips.some(
            (ship) =>
              ship.owner === seat.id &&
              (view.sectors.some(
                (sector) =>
                  sector.id === ship.sectorId && sector.owner === partner,
              ) ||
                projectedShips.some(
                  (other) =>
                    other.sectorId === ship.sectorId && other.owner === partner,
                )),
          ),
        )
      : [];
  if (betrayedPartners.length) uncertain = true;
  const upkeepBefore = upkeepForEmptyInfluenceSlots(
    Math.max(0, 13 - seat.influenceOnTrack),
  );
  const upkeepAfter = upkeepForEmptyInfluenceSlots(
    Math.min(13, Math.max(0, 13 - influence)),
  );
  return {
    betrayedPartners,
    resourcesAfter: resources,
    influenceAfter: influence,
    upkeepBefore,
    upkeepAfter,
    moneyIncomeAfter: incomeForPopulationAway(
      Math.max(-1, Math.min(11, population.money)),
    ),
    moneyBalanceAfter:
      resources.money +
      incomeForPopulationAway(Math.max(-1, Math.min(11, population.money))) -
      upkeepAfter,
    populationChoiceMayChangeIncome: uncertain,
  };
}
