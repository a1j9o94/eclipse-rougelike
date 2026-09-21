import { factionRulesMode } from './gameRules';
import { researchCostForSeat, constructionCostForSeat } from "./minorSpecies";
import { tradeQuote } from "./catalog";
import { tradeResources } from "./economy";
import { TECHNOLOGIES } from "./technologies";
import type {
  FundableAction,
  FundingTrade,
  GameCommand,
  PlayerView,
  Resources,
  Seat,
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
    const price = researchCostForSeat(technology.id, action.track, seat);
    return price.ok ? price.scienceCost : null;
  }
  const price = action.builds.reduce(
    (total, build) => total + constructionCostForSeat(seat, build.component),
    0,
  );
  return Number.isSafeInteger(price) && price >= 0 ? price : null;
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
  const possible = Array.from({ length: shortfall + 1 }, (_, first) => first).filter(first => {
    const second = shortfall - first;
    const firstQuote = first ? tradeQuote(seat.faction, sources[0], resource, first, factionRulesMode(view)) : { input: 0 };
    const secondQuote = second ? tradeQuote(seat.faction, sources[1], resource, second, factionRulesMode(view)) : { input: 0 };
    return !!firstQuote && !!secondQuote && firstQuote.input <= seat.resources[sources[0]] && secondQuote.input <= seat.resources[sources[1]];
  });
  if (!possible.length) return [];
  // At most 16 representative allocations, including both source-heavy extremes.
  const count = Math.min(16, possible.length);
  const allocations = Array.from({ length: count }, (_, i) =>
    count === 1
      ? possible[0]
      : possible[Math.round((i * (possible.length - 1)) / (count - 1))],
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
        factionRulesMode(view),
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
