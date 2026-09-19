import { v } from "convex/values";
import type { Validator } from "convex/values";
import { FACTION_IDS, type FactionId } from "../shared/eclipse/catalog";
import type { DecisionChoice, GameCommand } from "../shared/eclipse/types";

export const factionValidator: Validator<FactionId> = v.union(
  ...FACTION_IDS.map(id => v.literal(id)),
);
const resource = v.union(
  v.literal("money"),
  v.literal("science"),
  v.literal("materials"),
);
const shipType = v.union(
  v.literal("interceptor"),
  v.literal("cruiser"),
  v.literal("dreadnought"),
  v.literal("starbase"),
);
const placement = v.object({
  sectorId: v.string(),
  squareId: v.string(),
  resource,
});
const choice: Validator<DecisionChoice, "required", string> = v.union(
  v.object({
    kind: v.literal("exploration"),
    tileId: v.union(v.string(), v.null()),
    rotation: v.number(),
    drawAnother: v.optional(v.boolean()),
  }),
  v.object({
    kind: v.literal("discovery"),
    option: v.union(v.literal("keep"), v.literal("use")),
  }),
  v.object({ kind: v.literal("colonization"), placements: v.array(placement) }),
  v.object({
    kind: v.literal("diplomacy-window"),
    offerTo: v.union(v.string(), v.null()),
    resource,
  }),
  v.object({ kind: v.literal("diplomacy"), accept: v.boolean(), resource }),
  v.object({
    kind: v.literal("combat-allocation"),
    allocations: v.array(
      v.object({
        dieId: v.string(),
        targetId: v.string(),
        damage: v.optional(v.number()),
      }),
    ),
  }),
  v.object({
    kind: v.literal("retreat"),
    destinationId: v.union(v.string(), v.null()),
  }),
  v.object({ kind: v.literal("reputation"), kept: v.optional(v.array(v.number())) }),
  v.object({ kind: v.literal("bankruptcy"), abandonSectorId: v.string() }),
  v.object({
    kind: v.literal("population-return"),
    resources: v.array(resource),
  }),
  v.object({
    kind: v.literal("ancient-part"),
    blueprint: v.union(
      v.null(),
      v.object({
        shipType,
        parts: v.array(v.union(v.string(), v.null())),
        outsideParts: v.optional(v.array(v.string())),
      }),
    ),
  }),
  v.object({ kind: v.literal("control"), accept: v.boolean() }),
  v.object({
    kind: v.literal("free-technology"),
    technologyId: v.string(),
    track: v.union(v.literal("military"), v.literal("grid"), v.literal("nano")),
  }),
  v.object({
    kind: v.literal("resource-reward"),
    resources: v.array(resource),
  }),
  v.object({ kind: v.literal("portal-placement"), sectorId: v.string() }),
  v.object({
    kind: v.literal("combat-turn"),
    retreatTo: v.union(v.string(), v.null()),
  }),
  v.object({
    kind: v.literal("initiative-order"),
    groupIds: v.array(v.string()),
  }),
  v.object({ kind: v.literal("bombardment"), squareIds: v.array(v.string()) }),
);
/** Exact structural validation; numeric ranges and catalog membership remain engine-owned. */
export const gameCommandValidator: Validator<GameCommand, "required", string> =
  v.union(
    v.object({
      type: v.literal("trade-and-act"),
      trades: v.array(
        v.object({ from: resource, to: resource, amount: v.number() }),
      ),
      action: v.union(
        v.object({
          type: v.literal("research"),
          tileId: v.string(),
          track: v.union(
            v.literal("military"),
            v.literal("grid"),
            v.literal("nano"),
          ),
        }),
        v.object({
          type: v.literal("build"),
          builds: v.array(
            v.object({
              sectorId: v.string(),
              component: v.union(
                shipType,
                v.literal("orbital"),
                v.literal("monolith"),
              ),
            }),
          ),
        }),
      ),
    }),
    v.object({
      type: v.literal("explore"),
      position: v.object({ q: v.number(), r: v.number() }),
    }),
    v.object({
      type: v.literal("influence"),
      removeSectorIds: v.array(v.string()),
      addSectorIds: v.array(v.string()),
    }),
    v.object({
      type: v.literal("research"),
      tileId: v.string(),
      track: v.union(
        v.literal("military"),
        v.literal("grid"),
        v.literal("nano"),
      ),
    }),
    v.object({
      type: v.literal("upgrade"),
      blueprints: v.array(
        v.object({
          shipType,
          parts: v.array(v.union(v.string(), v.null())),
          outsideParts: v.optional(v.array(v.string())),
        }),
      ),
    }),
    v.object({
      type: v.literal("build"),
      builds: v.array(
        v.object({
          sectorId: v.string(),
          component: v.union(
            shipType,
            v.literal("orbital"),
            v.literal("monolith"),
          ),
        }),
      ),
    }),
    v.object({
      type: v.literal("move"),
      moves: v.array(
        v.object({ shipId: v.string(), path: v.array(v.string()) }),
      ),
    }),
    v.object({ type: v.literal("pass") }),
    v.object({ type: v.literal("set-auto-pass"), enabled: v.boolean() }),
    v.object({
      type: v.literal("discard-reputation"),
      values: v.array(v.number()),
    }),
    v.object({ type: v.literal("end-action") }),
    v.object({ type: v.literal("finish-upkeep") }),
    v.object({
      type: v.literal("trade"),
      from: resource,
      to: resource,
      amount: v.number(),
    }),
    v.object({ type: v.literal("colonize"), placements: v.array(placement) }),
    v.object({ type: v.literal("offer-diplomacy"), to: v.string(), resource }),
    v.object({ type: v.literal("resolve"), decisionId: v.string(), choice }),
  );
export const phaseValidator = v.union(
  v.literal("setup"),
  v.literal("action"),
  v.literal("combat"),
  v.literal("upkeep"),
  v.literal("cleanup"),
  v.literal("finished"),
);
export const receiptValidator = v.object({
  commandId: v.string(),
  revision: v.number(),
  eventCount: v.number(),
});
