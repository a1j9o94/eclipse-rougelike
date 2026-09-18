import { getFaction, type CatalogResources, type FactionId } from "./catalog";
export type ResourceKind = keyof CatalogResources;
const nonnegativeInteger = (n: number): boolean =>
  Number.isSafeInteger(n) && n >= 0;
const validResources = (resources: CatalogResources): boolean =>
  nonnegativeInteger(resources.money) &&
  nonnegativeInteger(resources.materials) &&
  nonnegativeInteger(resources.science);
export interface UpkeepInput {
  readonly resources: CatalogResources;
  readonly income: CatalogResources;
  readonly upkeepCost: number;
}
export interface UpkeepProjection {
  readonly balance: number;
  readonly shortfall: number;
  readonly solvent: boolean;
  /** Null until money costs can be paid. Materials and science are produced afterward. */
  readonly resourcesAfterPayment: CatalogResources | null;
}
export function projectUpkeep({
  resources,
  income,
  upkeepCost,
}: UpkeepInput): UpkeepProjection {
  if (
    !validResources(resources) ||
    !validResources(income) ||
    !nonnegativeInteger(upkeepCost)
  ) {
    throw new RangeError("Economy values must be nonnegative safe integers.");
  }
  const moneyBeforePayment = resources.money + income.money;
  const materialsAfterProduction = resources.materials + income.materials;
  const scienceAfterProduction = resources.science + income.science;
  if (
    ![
      moneyBeforePayment,
      materialsAfterProduction,
      scienceAfterProduction,
    ].every(Number.isSafeInteger)
  ) {
    throw new RangeError(
      "Projected resource storage exceeds exact integer precision.",
    );
  }
  const balance = moneyBeforePayment - upkeepCost;
  return {
    balance,
    shortfall: Math.max(0, -balance),
    solvent: balance >= 0,
    resourcesAfterPayment:
      balance < 0
        ? null
        : {
            money: balance,
            materials: resources.materials + income.materials,
            science: resources.science + income.science,
          },
  };
}
export interface EconomyPosition {
  readonly resources: CatalogResources;
  /** Cubes absent from each track, including planets, ambassadors and graveyard. */
  readonly populationAway: CatalogResources;
  /** Empty influence-track spaces, including any species-specific setup gaps. */
  readonly influenceAway: number;
}
export interface EconomyTracks {
  /** Income indexed by empty population spaces. Must come from a verified catalog. */
  readonly income: readonly number[];
  /** Upkeep indexed by empty influence spaces. Must come from a verified catalog. */
  readonly upkeep: readonly number[];
}
export interface AbandonmentReturns {
  readonly discsReturned: number;
  /** Chosen destination tracks after applying gray/orbital/full-track return rules. */
  readonly populationReturned: CatalogResources;
}
export type AbandonmentProjection =
  | {
      readonly ok: true;
      readonly position: EconomyPosition;
      readonly projection: UpkeepProjection;
    }
  | {
      readonly ok: false;
      readonly code:
        | "invalid-return"
        | "invalid-position"
        | "missing-track-value";
      readonly message: string;
    };
/** Recompute income as well as costs; abandoning a money planet can worsen solvency. */
export function projectAbandonment(
  position: EconomyPosition,
  tracks: EconomyTracks,
  returns: AbandonmentReturns,
): AbandonmentProjection {
  const kinds: readonly ResourceKind[] = ["money", "materials", "science"];
  if (
    !validResources(position.resources) ||
    !kinds.every(
      (k) =>
        Number.isInteger(position.populationAway[k]) &&
        position.populationAway[k] >= -1 &&
        position.populationAway[k] <= 11,
    ) ||
    !nonnegativeInteger(position.influenceAway)
  ) {
    return {
      ok: false,
      code: "invalid-position",
      message:
        "Resource storage and empty track counts must be nonnegative safe integers.",
    };
  }
  if (
    !nonnegativeInteger(returns.discsReturned) ||
    returns.discsReturned > position.influenceAway ||
    kinds.some(
      (kind) =>
        !nonnegativeInteger(returns.populationReturned[kind]) ||
        returns.populationReturned[kind] > position.populationAway[kind] + 1,
    )
  ) {
    return {
      ok: false,
      code: "invalid-return",
      message: "Returned components exceed those absent from their tracks.",
    };
  }
  const populationAway: CatalogResources = {
    money: position.populationAway.money - returns.populationReturned.money,
    materials:
      position.populationAway.materials - returns.populationReturned.materials,
    science:
      position.populationAway.science - returns.populationReturned.science,
  };
  const influenceAway = position.influenceAway - returns.discsReturned;
  const money =
    populationAway.money === -1 ? 0 : tracks.income[populationAway.money];
  const materials =
    populationAway.materials === -1
      ? 0
      : tracks.income[populationAway.materials];
  const science =
    populationAway.science === -1 ? 0 : tracks.income[populationAway.science];
  const upkeepCost = tracks.upkeep[influenceAway];
  if (
    [money, materials, science, upkeepCost].some(
      (value) => value === undefined || !nonnegativeInteger(value),
    )
  )
    return {
      ok: false,
      code: "missing-track-value",
      message:
        "A verified track value is required for every projected position.",
    };
  const nextPosition: EconomyPosition = {
    resources: { ...position.resources },
    populationAway,
    influenceAway,
  };
  return {
    ok: true,
    position: nextPosition,
    projection: projectUpkeep({
      resources: position.resources,
      income: { money, materials, science },
      upkeepCost,
    }),
  };
}
export type TradeResult =
  | { readonly ok: true; readonly resources: CatalogResources }
  | {
      readonly ok: false;
      readonly code:
        | "same-resource"
        | "invalid-quantity"
        | "invalid-resources"
        | "insufficient-resources";
      readonly message: string;
    };
export function tradeResources(
  resources: CatalogResources,
  faction: FactionId,
  from: ResourceKind,
  to: ResourceKind,
  quantity: number,
): TradeResult {
  if (!validResources(resources))
    return {
      ok: false,
      code: "invalid-resources",
      message: "Resource storage must use nonnegative safe integers.",
    };
  if (from === to)
    return {
      ok: false,
      code: "same-resource",
      message: "Choose a different resource to receive.",
    };
  if (!Number.isSafeInteger(quantity) || quantity < 1)
    return {
      ok: false,
      code: "invalid-quantity",
      message: "Trade a positive whole number of times.",
    };
  const cost = quantity * getFaction(faction).tradeRatio;
  if (
    !Number.isSafeInteger(cost) ||
    !Number.isSafeInteger(resources[to] + quantity)
  ) {
    return {
      ok: false,
      code: "invalid-quantity",
      message: "This trade exceeds exact integer precision.",
    };
  }
  if (resources[from] < cost)
    return {
      ok: false,
      code: "insufficient-resources",
      message: `You need ${cost} ${from} for this trade.`,
    };
  return {
    ok: true,
    resources: {
      ...resources,
      [from]: resources[from] - cost,
      [to]: resources[to] + quantity,
    },
  };
}
/** Discount magnitude is read from the player's track, not inferred from technology count. */
export function researchCost(
  printedCost: number,
  minimumCost: number,
  discount: number,
): number {
  if (
    ![printedCost, minimumCost, discount].every(nonnegativeInteger) ||
    minimumCost > printedCost
  ) {
    throw new RangeError(
      "Research costs and discounts must be nonnegative safe integers, with minimum no greater than printed cost.",
    );
  }
  return Math.max(minimumCost, printedCost - discount);
}
/** One chosen resource type per controlled artifact; the reward is immediate, not VP. */
export function artifactKeyReward(
  choices: readonly ResourceKind[],
): CatalogResources {
  const reward: CatalogResources = { money: 0, materials: 0, science: 0 };
  for (const kind of choices) reward[kind] += 5;
  return reward;
}
