import { v } from "convex/values";
import type { Validator } from "convex/values";
import { FACTION_IDS, type FactionId } from "../shared/eclipse/catalog";
import { MINOR_SPECIES, type MinorSpeciesId } from "../shared/eclipse/minorSpecies";
import type { DecisionChoice, GameCommand } from "../shared/eclipse/types";

export const factionValidator: Validator<FactionId> = v.union(
  ...FACTION_IDS.map(id => v.literal(id)),
);
export const factionProfileValidator = v.union(v.literal('base'), v.literal('expanded-v1'), v.literal('expanded-v2'));
export const rulesModeValidator = v.union(v.literal('standard'), v.literal('less-random-v1'));
export const gameRuleOptionsValidator = v.object({
  roundLimit: v.optional(v.number()),
  openTechnology: v.optional(v.boolean()),
  publicDiscoveries: v.optional(v.boolean()),
  publicReputation: v.optional(v.boolean()),
  explorationRules: v.optional(v.boolean()),
  combatJokers: v.optional(v.boolean()),
  technologyVariant: v.optional(v.boolean()),
  discoveryVariant: v.optional(v.boolean()),
  factionVariant: v.optional(v.boolean()),
  passOrderTurnOrder: v.optional(v.boolean()),
});
export const pieceColorValidator = v.union(v.literal('red'), v.literal('blue'), v.literal('green'), v.literal('yellow'), v.literal('white'), v.literal('black'));
export const minorSpeciesValidator: Validator<MinorSpeciesId> = v.union(...MINOR_SPECIES.map(tile => v.literal(tile.id)));
const action = v.union(v.literal('explore'), v.literal('influence'), v.literal('research'), v.literal('upgrade'), v.literal('build'), v.literal('move'));
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
    redraw: v.optional(v.boolean()),
  }),
  v.object({
    kind: v.literal("discovery"),
    discoveryId: v.optional(v.string()),
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
  v.object({ kind: v.literal("less-random-reputation"), actions: v.array(v.union(v.object({type:v.literal('add')}),v.object({type:v.literal('upgrade'),from:v.union(v.literal(1),v.literal(2),v.literal(3))}))) }),
  v.object({ kind: v.literal("super-joker"), action: v.union(v.literal('accept'),v.literal('reroll'),v.literal('table'),v.literal('colony-reroll')),dieId:v.optional(v.string()) }),
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
    v.object({type:v.literal('place-shrine'),sectorId:v.string(),planetIndex:v.number(),row:resource,column:v.union(v.literal(0),v.literal(1),v.literal(2))}),
    v.object({type:v.literal("research-development"),developmentId:v.union(v.literal("ancient-labs-development"),v.literal("quantum-labs"))}),
    v.object({type:v.literal("quantum-research"),tileId:v.string(),track:v.union(v.literal("military"),v.literal("grid"),v.literal("nano"))}),
    v.object({type:v.literal("buy-minor-species"),minorSpeciesId:minorSpeciesValidator,resource:v.optional(resource),returnReputation:v.optional(v.array(v.number()))}),
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
    v.object({ type: v.literal("buy-activation"), action }),
    v.object({ type: v.literal("convert-colony-ship"), resource }),
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
