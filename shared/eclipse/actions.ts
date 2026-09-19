import { researchCostForSeat, constructionCostForSeat } from "./minorSpecies";
import { interruptAutoPassForEntry } from './autoPass';
import { planBlueprintUpgrade } from "./upgradePlan";
import { BASE_COMPONENTS, factionHasCapability, getFaction } from "./catalog";
import {
  validateBlueprint,
  deriveBlueprintStats,
  type ShipBlueprint,
} from "./blueprints";
import { SHIP_PARTS, type ShipPartId } from "./parts";
import { TECHNOLOGIES, type TechnologyId } from "./technologies";
import {
  getDiscovery,
  type DiscoveryId,
  type AncientShipPartId,
} from "./discoveries";
import { requireSectorDefinition as sectorDefinition } from "./rulesState";
import {
  adjacentPosition,
  connectionBetween,
  validateMovementPath,
  type HexEdge,
} from "./geometry";
import { shuffle } from "./random";
import {
  abandonSector,
  beginAction,
  connected,
  continuation,
  emit,
  hasEnemy,
  hasTech,
  mapSector,
  movementAbilities,
  movementShips,
  queueDecision,
  requireRule,
  uniqueId,
  unpinned,
  consumeActivations,
} from "./rulesState";
import type {
  Blueprint,
  Coordinate,
  GameCommand,
  GameEvent,
  GameState,
  Seat,
  Sector,
  Track,
} from "./types";

export function typedBlueprint(blueprint: Blueprint): ShipBlueprint {
  requireRule(
    [...blueprint.parts, ...(blueprint.outsideParts ?? [])].every(
      (p) => p === null || SHIP_PARTS.some((part) => part.id === p),
    ),
    "Blueprint contains a part outside the base catalog.",
    "INVALID_COMMAND",
  );
  return {
    shipType: blueprint.shipType,
    parts: blueprint.parts as (ShipPartId | null)[],
    outsideParts: (blueprint.outsideParts ?? []) as ShipPartId[],
  };
}
export function explorationSources(
  state: GameState,
  seat: Seat,
  position: Coordinate,
): Sector[] {
  return state.sectors.filter(
    (s) =>
      (s.owner === seat.id || unpinned(state, seat, s.id) > 0) &&
      ([0, 1, 2, 3, 4, 5] as HexEdge[]).some((edge) => {
        const p = adjacentPosition(s.position, edge);
        return (
          p.q === position.q &&
          p.r === position.r &&
          (hasTech(seat, "wormhole-generator") ||
            mapSector(s).wormholes.some((w) => (w + s.rotation) % 6 === edge))
        );
      }),
  );
}
export function discoveryAt(
  state: GameState,
  seat: Seat,
  sector: Sector,
): void {
  if (
    !sector.discovery ||
    state.ships.some(
      (s) =>
        s.sectorId === sector.id &&
        ["ancient", "guardian", "gcds"].includes(s.type),
    )
  )
    return;
  const e = continuation(state),
    index = e.sectorDiscoveries.findIndex((d) => d.sectorId === sector.id);
  if (index < 0) return;
  const [{ discoveryId }] = e.sectorDiscoveries.splice(index, 1);
  sector.discovery = false;
  queueDecision(state, {
    id: uniqueId(state, "discovery"),
    owner: seat.id,
    kind: "discovery",
    tileId: discoveryId,
    sectorId: sector.id,
    options: ["keep", "use"],
  });
}
export function researchTechnology(
  state: GameState,
  seat: Seat,
  tileId: string,
  track: Track,
  free = false,
): void {
  const definition = TECHNOLOGIES.find((t) => t.id === tileId);
  requireRule(
    !!definition && state.technologyMarket.includes(tileId),
    "This technology is not available in the market.",
  );
  const cost = researchCostForSeat(definition!.id, track, seat);
  requireRule(
    cost.ok,
    "Technology already researched, track full, or wrong track.",
  );
  if (!free) {
    requireRule(
      seat.resources.science >= cost.scienceCost,
      `Research requires ${cost.scienceCost} science.`,
      "INSUFFICIENT_RESOURCES",
    );
    seat.resources.science -= cost.scienceCost;
  }
  state.technologyMarket.splice(state.technologyMarket.indexOf(tileId), 1);
  seat.technologies[track].push(tileId);
  const faction = getFaction(seat.faction);
  const hidden = state.privateSeats.find(candidate => candidate.seatId === seat.id);
  if (
    faction.special?.fourthTechnologyDiscovery &&
    seat.technologies[track].length === 4 &&
    hidden?.storedDiscovery &&
    !hidden.storedDiscoveryResolved
  ) {
    const discoveryId = hidden.storedDiscovery;
    hidden.storedDiscoveryResolved = true;
    const home = state.sectors.find(s => Number(s.tileId) === faction.homeSector && s.owner === seat.id);
    const placement = ["place-unbuilt-ship", "place-structure", "place-warp-portal"].includes(
      getDiscovery(discoveryId as DiscoveryId).effect.kind,
    );
    queueDecision(state, {
      id: uniqueId(state, "discovery"), owner: seat.id, kind: "discovery", tileId: discoveryId,
      ...(home ? { sectorId: home.id } : {}),
      options: placement && !home ? ["keep"] : ["keep", "use"],
    });
  }
  const effect = definition!.effect;
  if (effect.kind === "gain-influence") seat.influenceOnTrack += effect.amount;
  if (effect.kind === "artifact-resources") {
    const count = state.sectors
      .filter((s) => s.owner === seat.id)
      .reduce((n, s) => n + sectorDefinition(Number(s.tileId)).artifacts, 0);
    if (count)
      queueDecision(state, {
        id: uniqueId(state, "artifacts"),
        owner: seat.id,
        kind: "resource-reward",
        count,
        perChoice: 5,
      });
  }
  if (effect.kind === "place-warp-portal")
    requireRule(state.sectors.some(s=>s.owner===seat.id),"Control a sector before researching a portal that must be placed immediately.");
  if (effect.kind === "place-warp-portal")
    queueDecision(state, {
      id: uniqueId(state, "portal"),
      owner: seat.id,
      kind: "portal-placement",
      sectorIds: state.sectors
        .filter((s) => s.owner === seat.id)
        .map((s) => s.id),
    });
  if (effect.kind === "draw-discovery") {
    const id = state.supplies.discovery.shift();
    if (id) {
      const home = state.sectors.find(
        (s) =>
          Number(s.tileId) === getFaction(seat.faction).homeSector &&
          s.owner === seat.id,
      );
      const placement = [
        "place-unbuilt-ship",
        "place-structure",
        "place-warp-portal",
      ].includes(getDiscovery(id as DiscoveryId).effect.kind);
      queueDecision(state, {
        id: uniqueId(state, "discovery"),
        owner: seat.id,
        kind: "discovery",
        tileId: id,
        ...(home ? { sectorId: home.id } : {}),
        options: placement && !home ? ["keep"] : ["keep", "use"],
      });
    }
  }
}
export function colonize(
  state: GameState,
  seat: Seat,
  placements: Extract<GameCommand, { type: "colonize" }>["placements"],
): void {
  requireRule(
    (state.phase === "action" || state.phase === "upkeep") &&
      state.activeSeatId === seat.id,
    "Colonize during your turn or upkeep.",
    "NOT_YOUR_TURN",
  );
  requireRule(
    placements.length > 0 && placements.length <= seat.colonyShipsAvailable,
    "Use one available colony ship per population cube.",
  );
  for (const p of placements) {
    const sector = state.sectors.find((s) => s.id === p.sectorId);
    requireRule(
      !!sector && sector.owner === seat.id,
      "You may populate only controlled sectors.",
    );
    requireRule(
      state.phase !== "upkeep" || !hasEnemy(state, seat, sector!.id),
      "Enemy ships prevent upkeep colonization.",
    );
    requireRule(
      !sector!.population.some((c) => c.squareId === p.squareId),
      "Population square already occupied.",
    );
    const square =
      p.squareId === "orbital" && sector!.orbital
        ? { resource: "orbital", advanced: false }
        : sectorDefinition(Number(sector!.tileId)).population.find(
            (_, i) => p.squareId === `p${i}`,
          );
    requireRule(!!square, "This population square does not exist.");
    requireRule(
      square!.resource === p.resource ||
        square!.resource === "gray" ||
        (square!.resource === "orbital" && p.resource !== "materials"),
      "Choose a resource matching the population square.",
    );
    const tech =
      p.resource === "money"
        ? "advanced-economy"
        : p.resource === "science"
          ? "advanced-labs"
          : "advanced-mining";
    requireRule(
      !square!.advanced ||
        hasTech(seat, tech) ||
        hasTech(seat, "metasynthesis"),
      "Research the matching advanced population technology.",
    );
    requireRule(
      Number.isInteger(seat.populationTracks[p.resource]) &&
        seat.populationTracks[p.resource] < 11,
      "No population cube remains on that resource track.",
    );
    seat.populationTracks[p.resource]++;
    seat.colonyShipsAvailable--;
    sector!.population.push({ ...p });
  }
}
export function performAction(
  state: GameState,
  seat: Seat,
  command: GameCommand,
  events: GameEvent[],
): boolean {
  switch (command.type) {
    case "explore": {
      beginAction(state, seat, "explore");
      const p = command.position;
      requireRule(
        Number.isSafeInteger(p.q) &&
          Number.isSafeInteger(p.r) &&
          !state.sectors.some(
            (s) => s.position.q === p.q && s.position.r === p.r,
          ),
        "Choose an empty hex adjacent to your exploration source.",
      );
      const sources = explorationSources(state, seat, p);
      requireRule(
        sources.length > 0,
        "No controlled sector or unpinned fleet connects to this exploration target.",
      );
      const distance = Math.max(
        Math.abs(p.q),
        Math.abs(p.r),
        Math.abs(p.q + p.r),
      );
      const ring =
        distance === 1 ? "inner" : distance === 2 ? "middle" : "outer";
      const drawn: string[] = [];
      const e = continuation(state);
      for (let i = 0; i < 1; i++) {
        if (!state.supplies[ring].length && e.discardedSectors[ring].length) {
          const shuffled = shuffle(state.random, e.discardedSectors[ring]);
          state.random = shuffled.state;
          state.supplies[ring] = shuffled.items;
          e.discardedSectors[ring] = [];
        }
        const tile = state.supplies[ring].shift();
        if (tile) drawn.push(tile);
      }
      requireRule(drawn.length > 0, "This ring has no sector tiles remaining.");
      const placements = drawn.flatMap((tileId) =>
        [0, 1, 2, 3, 4, 5]
          .filter((rotation) => {
            const d = sectorDefinition(Number(tileId));
            return sources.some(
              (s) =>
                connectionBetween(
                  mapSector(s),
                  {
                    id: "new",
                    q: p.q,
                    r: p.r,
                    rotation: rotation as HexEdge,
                    wormholes: d.wormholes,
                    warpPortal: d.warpPortal,
                    controller: null,
                  },
                  hasTech(seat, "wormhole-generator"),
                ) !== "none",
            );
          })
          .map((rotation) => ({ tileId, rotation })),
      );
      queueDecision(state, {
        id: uniqueId(state, "explore"),
        owner: seat.id,
        kind: "exploration",
        position: p,
        drawnTileIds: drawn,
        placements,
        ...(factionHasCapability(seat.faction, "choose-one-of-two-exploration-sectors") &&
        state.supplies[ring].length + e.discardedSectors[ring].length > 0
          ? { canDrawAnother: true }
          : {}),
      });
      consumeActivations(state, 1);
      break;
    }
    case "research":
      beginAction(state, seat, "research");
      researchTechnology(state, seat, command.tileId, command.track);
      consumeActivations(state, 1);
      break;
    case "build": {
      const limit = beginAction(state, seat, "build");
      requireRule(
        command.builds.length > 0 && command.builds.length <= limit,
        "Choose builds within your activation limit.",
      );
      for (const build of command.builds) {
        const sector = state.sectors.find((s) => s.id === build.sectorId);
        requireRule(
          !!sector && sector.owner === seat.id,
          "Build only in controlled sectors.",
        );
        const cost = constructionCostForSeat(seat, build.component);
        requireRule(
          seat.resources.materials >= cost,
          `This build costs ${cost} materials.`,
          "INSUFFICIENT_RESOURCES",
        );
        if (["starbase", "orbital", "monolith"].includes(build.component))
          requireRule(
            hasTech(seat, build.component),
            "Research this component before building it.",
          );
        if (build.component === "orbital" || build.component === "monolith") {
          requireRule(
            !sector![build.component],
            "Only one of this structure is allowed per sector.",
          );
          sector![build.component] = true;
        } else {
          requireRule(
            state.ships.filter(
              (s) => s.owner === seat.id && s.type === build.component,
            ).length < (getFaction(seat.faction).componentSupply?.[build.component] ?? BASE_COMPONENTS.perColor[build.component]),
            "No unbuilt ships of this type remain.",
          );
          state.ships.push({
            id: uniqueId(state, "ship"),
            owner: seat.id,
            type: build.component,
            sectorId: sector!.id,
            damage: 0,
            arrival: continuation(state).nextId,
          });
        }
        seat.resources.materials -= cost;
      }
      consumeActivations(state, command.builds.length, "build");
      break;
    }
    case "upgrade": {
      const limit = beginAction(state, seat, "upgrade");
      requireRule(
        command.blueprints.length > 0 &&
          new Set(command.blueprints.map((b) => b.shipType)).size ===
            command.blueprints.length,
        "Choose distinct blueprints to edit.",
      );
      let installed = 0;
      const stored = [...(seat.storedParts ?? [])];
      for (const raw of command.blueprints) {
        const draft = typedBlueprint(raw),
          old = seat.blueprints.find((b) => b.shipType === draft.shipType);
        requireRule(!!old, "Ship blueprint is unavailable.");
        const previous = typedBlueprint(old!);
        const ancient = (id: string): boolean =>
          SHIP_PARTS.find((p) => p.id === id)?.access.kind === "ancient";
        const current = [...previous.parts, ...previous.outsideParts].filter(
          (id): id is ShipPartId => id !== null && ancient(id),
        );
        for (let slot = 0; slot < previous.parts.length; slot++) {
          const id = previous.parts[slot];
          if (id && ancient(id) && draft.parts.includes(id))
            requireRule(
              draft.parts[slot] === id,
              "Removed ancient parts leave the game and cannot move to another slot.",
            );
        }
        const available = [...stored, ...current] as AncientShipPartId[];
        const issues = validateBlueprint(
          seat.faction,
          draft,
          Object.values(seat.technologies).flat() as TechnologyId[],
          available,
          previous,
        );
        requireRule(
          issues.length === 0,
          issues.map((i) => i.message).join(" "),
        );
        const plan = planBlueprintUpgrade(
          seat.faction,
          previous,
          draft,
          Object.values(seat.technologies).flat() as TechnologyId[],
          available,
        );
        requireRule(plan.ok, plan.ok ? "" : plan.message);
        installed +=
          draft.parts.filter((p, i) => p !== null && p !== previous.parts[i])
            .length +
          draft.outsideParts.filter((p) => !previous.outsideParts.includes(p))
            .length;
        for (const id of [...draft.parts, ...draft.outsideParts])
          if (id && ancient(id) && !current.includes(id)) {
            const index = stored.indexOf(id);
            requireRule(
              index >= 0,
              "Ancient part already installed elsewhere.",
            );
            stored.splice(index, 1);
          }
        seat.blueprints[seat.blueprints.indexOf(old!)] = draft;
      }
      requireRule(
        installed <= limit,
        "Too many installed parts for this upgrade action.",
      );
      seat.storedParts = stored;
      // Removing parts is free, but still takes an Upgrade action.
      consumeActivations(state, Math.max(1, installed));
      break;
    }
    case "move": {
      const limit = beginAction(state, seat, "move");
      requireRule(
        command.moves.length > 0 && command.moves.length <= limit,
        "Choose moves within your activation limit.",
      );
      for (const move of command.moves) {
        const ships = movementShips(state).map((s) => {
          if (
            s.owner !== seat.id ||
            ["ancient", "guardian", "gcds"].includes(s.kind)
          )
            return s;
          const b = seat.blueprints.find((b) => b.shipType === s.kind);
          return {
            ...s,
            movement: b
              ? deriveBlueprintStats(seat.faction, typedBlueprint(b)).movement
              : 0,
          };
        });
        const result = validateMovementPath({
          player: seat.id,
          shipId: move.shipId,
          path: move.path,
          sectors: state.sectors.map(mapSector),
          ships,
          abilities: movementAbilities(seat),
        });
        requireRule(result.ok, result.ok ? "" : result.message);
        interruptAutoPassForEntry(state, seat, move.path, events);
        const ship = state.ships.find((s) => s.id === move.shipId)!;
        ship.sectorId = move.path[move.path.length - 1];
        ship.arrival = continuation(state).nextId++;
      }
      consumeActivations(state, command.moves.length, "move");
      break;
    }
    case "influence": {
      const limit = beginAction(state, seat, "influence");
      const n = Math.max(
        command.removeSectorIds.length,
        command.addSectorIds.length,
      );
      const progress = continuation(state).action!;
      const touched = [...command.removeSectorIds, ...command.addSectorIds];
      requireRule(
        touched.every((id) => !progress.influenceSectorIds?.includes(id)),
        "Each sector may be influenced only once during this action.",
      );
      progress.influenceSectorIds = [
        ...(progress.influenceSectorIds ?? []),
        ...touched,
      ];
      requireRule(
        n <= limit &&
          new Set([...command.removeSectorIds, ...command.addSectorIds])
            .size ===
            command.removeSectorIds.length + command.addSectorIds.length,
        "Each sector may receive an influence activation only once.",
      );
      // Each activation may transfer a disc. Check its destination while the source
      // is still controlled, then return its population and move that same disc.
      for (let i = 0; i < n; i++) {
        const removeId = command.removeSectorIds[i],
          addId = command.addSectorIds[i];
        const from = removeId
          ? state.sectors.find((s) => s.id === removeId)
          : undefined;
        const to = addId
          ? state.sectors.find((s) => s.id === addId)
          : undefined;
        if (removeId)
          requireRule(
            !!from && from.owner === seat.id,
            "You do not control this sector.",
          );
        if (addId) {
          requireRule(
            !!to && to.owner === null && !hasEnemy(state, seat, addId),
            "Only unoccupied uncontrolled sectors can be influenced.",
          );
          const own = state.ships.some(
            (ship) => ship.owner === seat.id && ship.sectorId === addId,
          );
          requireRule(
            own ||
              state.sectors.some(
                (source) =>
                  (source.owner === seat.id ||
                    state.ships.some(
                      (ship) =>
                        ship.owner === seat.id && ship.sectorId === source.id,
                    )) &&
                  connected(source, to!, seat),
              ),
            "No controlled sector or fleet connects to this sector.",
          );
          requireRule(
            seat.influenceOnTrack > 0 || !!from,
            "No influence disc available.",
          );
        }
        if (from) abandonSector(state, from);
        if (to) {
          seat.influenceOnTrack--;
          to.owner = seat.id;
          discoveryAt(state, seat, to);
        }
      }
      if (!progress.coloniesRefreshed) {
        seat.colonyShipsAvailable = Math.min(
          getFaction(seat.faction).colonyShips,
          seat.colonyShipsAvailable + 2,
        );
        progress.coloniesRefreshed = true;
      }
      consumeActivations(state, Math.max(1, n));
      break;
    }
    default:
      return false;
  }
  emit(events, seat.id, `${getFaction(seat.faction).name}: ${command.type}.`);
  return true;
}
