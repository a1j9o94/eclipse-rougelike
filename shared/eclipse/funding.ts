import { getFaction } from "./catalog";
import { tradeResources } from "./economy";
import { researchCost, TECHNOLOGIES, type TechnologyId } from "./technologies";
import type {
  FundableAction,
  FundingTrade,
  GameCommand,
  PlayerView,
  Resources,
  Seat,
  Track,
} from "./types";
export interface FundingOption {
  trades: FundingTrade[];
  resource: "science" | "materials";
  cost: number;
  shortfall: number;
  resourcesAfterTrade: Resources;
  resourcesAfter: Resources;
  command: Extract<GameCommand, { type: "trade-and-act" }>;
}
export function fundingActionCost(
  seat: Seat,
  action: FundableAction,
): number | null {
  if (action.type === "research") {
    const technology = TECHNOLOGIES.find((t) => t.id === action.tileId);
    if (!technology) return null;
    const price = researchCost(
      technology.id,
      action.track,
      Object.entries(seat.technologies).flatMap(([track, ids]) =>
        ids.map((technology) => ({
          track: track as Track,
          technology: technology as TechnologyId,
        })),
      ),
    );
    return price.ok ? price.scienceCost : null;
  }
  const costs = getFaction(seat.faction).constructionCosts;
  const price = action.builds.reduce(
    (total, build) => total + costs[build.component],
    0,
  );
  return Number.isSafeInteger(price) && price > 0 ? price : null;
}
/** Funding estimates only. The wrapped ordinary action still enforces all authoritative legality. */
export function fundingOptions(
  view: PlayerView,
  action: FundableAction,
): FundingOption[] {
  const seat = view.seats.find((s) => s.id === view.viewerSeatId);
  if (
    !seat ||
    view.phase !== "action" ||
    view.pendingDecision ||
    view.activeSeatId !== seat.id
  )
    return [];
  const cost = fundingActionCost(seat, action);
  if (cost === null) return [];
  const resource = action.type === "research" ? "science" : "materials";
  const shortfall = cost - seat.resources[resource];
  if (shortfall <= 0) return [];
  const sources = (["money", "science", "materials"] as const).filter(
    (r) => r !== resource,
  );
  const ratio = getFaction(seat.faction).tradeRatio;
  const firstMax = Math.floor(seat.resources[sources[0]] / ratio),
    secondMax = Math.floor(seat.resources[sources[1]] / ratio);
  const minimum = Math.max(0, shortfall - secondMax),
    maximum = Math.min(shortfall, firstMax);
  if (minimum > maximum) return [];
  // At most 16 representative allocations, including both source-heavy extremes.
  const count = Math.min(16, maximum - minimum + 1);
  const allocations = Array.from({ length: count }, (_, i) =>
    count === 1
      ? minimum
      : minimum + Math.round((i * (maximum - minimum)) / (count - 1)),
  );
  return allocations.map((first) => {
    const trades: FundingTrade[] = [];
    if (first > 0)
      trades.push({ from: sources[0], to: resource, amount: first });
    if (shortfall - first > 0)
      trades.push({
        from: sources[1],
        to: resource,
        amount: shortfall - first,
      });
    let resourcesAfterTrade = { ...seat.resources };
    for (const trade of trades) {
      const result = tradeResources(
        resourcesAfterTrade,
        seat.faction,
        trade.from,
        trade.to,
        trade.amount,
      );
      if (!result.ok) throw Error("Generated funding allocation is invalid.");
      resourcesAfterTrade = result.resources;
    }
    return {
      trades,
      resource,
      cost,
      shortfall,
      resourcesAfterTrade,
      resourcesAfter: {
        ...resourcesAfterTrade,
        [resource]: resourcesAfterTrade[resource] - cost,
      },
      command: { type: "trade-and-act", trades, action },
    };
  });
}
