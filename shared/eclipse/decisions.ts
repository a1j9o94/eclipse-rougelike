import { hasEmptyAmbassadorSpace } from "./minorSpecies";
import { queueAncientPart, resolveAncientPart } from "./ancientAcquisition";
import { reputationCapacity } from "./battleEngine";
import { shuffle } from "./random";
import { connectionBetween, type HexEdge } from "./geometry";
import { BASE_COMPONENTS, getFaction, SETUP_BY_PLAYER_COUNT, type PlayerCount } from "./catalog";
import { getDiscovery, type DiscoveryId } from "./discoveries";
import { ancientTechnologyChoices, researchedTechnologyIds } from "./technologies";
import { requireSectorDefinition as sectorDefinition } from "./rulesState";
import {
  discoveryAt,
  researchTechnology,
  colonize,
  explorationSources,
} from "./actions";
import {
  connected,
  continuation,
  enqueueCubeReturn,
  hasEnemy,
  hasTech,
  mapSector,
  player,
  queueDecision,
  requireRule,
  resourceOptions,
  returnOptions,
  uniqueId,
} from "./rulesState";
import type {
  DecisionChoice,
  GameState,
  PendingDecision,
  Resource,
  Seat,
  Sector,
} from "./types";
import { outerPlacementLimit } from './lessRandom';
import { gameRules } from './gameRules';
import { applyVariantDiscoveryEffect } from './developmentEffects';

export function validateDiplomacy(
  state: GameState,
  seat: Seat,
  to: string,
  resource: Resource,
  allowReputationReturn = false,
): void {
  const other = player(state, to);
  requireRule(
    state.seats.length >= 4,
    "Diplomacy is available with four or more players.",
  );
  requireRule(
    seat.id !== other.id &&
      !seat.eliminated &&
      !seat.traitor &&
      !other.traitor &&
      !other.eliminated &&
      !seat.ambassadors.includes(to),
    "These players cannot form diplomatic relations.",
  );
  requireRule(hasEmptyAmbassadorSpace(seat) && hasEmptyAmbassadorSpace(other), "All ambassador spaces are occupied.");
  const hasRoom = (s: Seat, partner: string) =>
    state.privateSeats.find((p) => p.seatId === s.id)!.reputation.length <=
    reputationCapacity({ ...s, ambassadors: [...s.ambassadors, partner] });
  requireRule(
    allowReputationReturn || (hasRoom(seat, to) && hasRoom(other, seat.id)),
    "Return a reputation tile before exchanging ambassadors.",
  );
  requireRule(
    seat.ambassadors.length < getFaction(seat.faction).capabilities.ambassadorSupply &&
      other.ambassadors.length < getFaction(other.faction).capabilities.ambassadorSupply,
    "No ambassador tile is available.",
  );
  requireRule(
    resourceOptions(seat).includes(resource) &&
      resourceOptions(other).length > 0,
    "An ambassador requires an available population cube.",
  );
  requireRule(
    state.sectors.some(
      (a) =>
        a.owner === seat.id &&
        state.sectors.some((b) => b.owner === other.id && connected(a, b)),
    ),
    "Diplomacy requires a complete wormhole or warp connection between controlled sectors.",
  );
  requireRule(
    !state.ships.some(
      (s) =>
        (s.owner === seat.id || s.owner === other.id) &&
        state.sectors.some(
          (t) =>
            t.id === s.sectorId &&
            (t.owner === (s.owner === seat.id ? other.id : seat.id) ||
              state.ships.some(
                (o) =>
                  o.sectorId === t.id &&
                  o.owner === (s.owner === seat.id ? other.id : seat.id),
              )),
        ),
    ),
    "Ships cannot occupy each other’s sectors or share a sector when offering diplomacy.",
  );
}
export function eligibleDiplomacyPartners(state: GameState, seat: Seat, allowReputationReturn = false): string[] {
  const resource = resourceOptions(seat)[0];
  if (!resource) return [];
  return state.seats.filter(other => {
    try { validateDiplomacy(state, seat, other.id, resource, allowReputationReturn); return true; }
    catch { return false; }
  }).map(other => other.id);
}
export function offerDiplomacy(state: GameState, seat: Seat, to: string, resource: Resource, allowReputationReturn = false): void {
  validateDiplomacy(state, seat, to, resource, allowReputationReturn);
  const other = player(state, to);
  queueDecision(state, {
    id: uniqueId(state, "diplomacy"),
    owner: other.id,
    kind: "diplomacy",
    proposer: seat.id,
    populationSources: resourceOptions(other),
    proposerResource: resource,
  });
}
export function breakAggressiveRelations(state: GameState, seat: Seat): void {
  const broken = seat.ambassadors.filter((id) =>
    state.ships.some(
      (ship) =>
        ship.owner === seat.id &&
        state.sectors.some(
          (s) =>
            s.id === ship.sectorId &&
            (s.owner === id ||
              state.ships.some(
                (other) => other.owner === id && other.sectorId === s.id,
              )),
        ),
    ),
  );
  if (!broken.length) return;
  for (const p of state.seats) p.traitor = p.id === seat.id;
  for (const id of broken) {
    const other = player(state, id);
    seat.ambassadors = seat.ambassadors.filter((a) => a !== id);
    other.ambassadors = other.ambassadors.filter((a) => a !== seat.id);
    seat.ambassadorResources = seat.ambassadorResources?.filter(
      (a) => a.from !== id,
    );
    other.ambassadorResources = other.ambassadorResources?.filter(
      (a) => a.from !== seat.id,
    );
    enqueueCubeReturn(state, seat.id, returnOptions(seat));
    enqueueCubeReturn(state, other.id, returnOptions(other));
  }
}
export function resolveGeneralChoice(
  state: GameState,
  seat: Seat,
  d: PendingDecision,
  c: DecisionChoice,
): boolean {
  const e = continuation(state);
  requireRule(
    d.kind === c.kind,
    "Choose a response matching the pending decision.",
    "WRONG_DECISION",
  );
  if (d.kind === "exploration" && c.kind === "exploration") {
    if (c.redraw) {
      requireRule(gameRules(state).explorationRules && d.redrawAvailable === true && state.lessRandom?.explorationJokers[seat.id] === true, 'Your Exploration Joker is unavailable.');
      const ring = d.ring;
      requireRule(!!ring, 'This exploration cannot be redrawn.');
      const previous = [...d.drawnTileIds];
      if (state.supplies[ring!].length < previous.length && e.discardedSectors[ring!].length) {
        const shuffled = shuffle(state.random, e.discardedSectors[ring!]);
        state.random = shuffled.state;
        state.supplies[ring!] = [...state.supplies[ring!], ...shuffled.items];
        e.discardedSectors[ring!] = [];
      }
      requireRule(state.supplies[ring!].length >= previous.length, 'Not enough sector tiles remain for a full redraw.');
      d.drawnTileIds = state.supplies[ring!].splice(0, previous.length);
      e.discardedSectors[ring!].push(...previous);
      d.placements = [];
      const sources = explorationSources(state, seat, d.position);
      for (const tileId of d.drawnTileIds) {
        const def = sectorDefinition(Number(tileId));
        for (const rotation of [0, 1, 2, 3, 4, 5]) if (sources.some(s => connectionBetween(mapSector(s), { id: 'new', ...d.position, rotation: rotation as HexEdge, wormholes: def.wormholes, warpPortal: def.warpPortal, controller: null }, hasTech(seat, 'wormhole-generator')) !== 'none')) d.placements.push({ tileId, rotation });
      }
      state.lessRandom!.explorationJokers[seat.id] = false;
      d.redrawAvailable = false;
      state.pendingDecision = d;
      return true;
    }
    if (c.drawAnother) {
      requireRule(!!d.canDrawAnother, "A second sector draw is not available.");
      const distance = Math.max(
        Math.abs(d.position.q),
        Math.abs(d.position.r),
        Math.abs(d.position.q + d.position.r),
      );
      const ring =
        distance === 1 ? "inner" : distance === 2 ? "middle" : "outer";
      if (!state.supplies[ring].length) {
        const shuffled = shuffle(state.random, e.discardedSectors[ring]);
        state.random = shuffled.state;
        state.supplies[ring] = shuffled.items;
        e.discardedSectors[ring] = [];
      }
      const tileId = state.supplies[ring].shift();
      requireRule(!!tileId, "No second tile remains.");
      const def = sectorDefinition(Number(tileId));
      const sources = explorationSources(state, seat, d.position);
      d.drawnTileIds.push(tileId);
      d.canDrawAnother = false;
      for (const rotation of [0, 1, 2, 3, 4, 5])
        if (
          sources.some(
            (s) =>
              connectionBetween(
                mapSector(s),
                {
                  id: "new",
                  ...d.position,
                  rotation: rotation as HexEdge,
                  wormholes: def.wormholes,
                  warpPortal: def.warpPortal,
                  controller: null,
                },
                hasTech(seat, "wormhole-generator"),
              ) !== "none",
          )
        )
          d.placements.push({ tileId, rotation });
      state.pendingDecision = d;
      return true;
    }
    requireRule(
      c.tileId === null ||
        d.placements.some(
          (p) => p.tileId === c.tileId && p.rotation === c.rotation,
        ),
      "Choose a legal tile rotation.",
    );
    for (const tile of d.drawnTileIds)
      if (tile !== c.tileId) {
        const n = Number(tile);
        e.discardedSectors[
          n < 200 ? "inner" : n < 300 ? "middle" : "outer"
        ].push(tile);
      }
    if (c.tileId !== null) {
      if (gameRules(state).explorationRules && d.ring === 'outer') {
        const placed = state.lessRandom!.outerPlacementsThisRound[seat.id] ?? 0;
        requireRule(placed < outerPlacementLimit(state, seat), 'You have already placed the maximum Outer sector this round.');
        const boardOuter = state.sectors.filter(sector => BASE_COMPONENTS.sectorIds.outer.includes(Number(sector.tileId))).length;
        requireRule(boardOuter < SETUP_BY_PLAYER_COUNT[state.seats.length as PlayerCount].outerSectors, 'The board already has its maximum number of Outer sectors.');
        state.lessRandom!.outerPlacementsThisRound[seat.id] = placed + 1;
      }
      const def = sectorDefinition(Number(c.tileId));
      const sector: Sector = {
        id: c.tileId,
        tileId: c.tileId,
        position: d.position,
        rotation: c.rotation,
        owner: null,
        population: [],
        orbital: false,
        monolith: false,
        discovery: def.discovery,
      };
      state.sectors.push(sector);
      for (let i = 0; i < def.ancients; i++) {
        if (
          state.ships.filter((s) => s.type === "ancient").length >=
          BASE_COMPONENTS.physical.ancients
        )
          break;
        state.ships.push({
          id: uniqueId(state, "ancient"),
          owner: "ancient",
          type: "ancient",
          sectorId: sector.id,
          damage: 0,
          arrival: 0,
        });
      }
      if (def.discovery && !gameRules(state).publicDiscoveries) {
        const id = state.supplies.discovery.shift();
        if (id)
          e.sectorDiscoveries.push({ sectorId: sector.id, discoveryId: id });
        else sector.discovery = false;
      }
      if (!hasEnemy(state, seat, sector.id)) {
        queueDecision(state, {
          id: uniqueId(state, "control"),
          owner: seat.id,
          kind: "control",
          sectorId: sector.id,
        });
        discoveryAt(state, seat, sector);
      }
    }
  } else if (d.kind === "control" && c.kind === "control") {
    const s = state.sectors.find((s) => s.id === d.sectorId);
    requireRule(
      !!s && s.owner === null,
      "This sector is no longer uncontrolled.",
    );
    if (c.accept) {
      requireRule(
        seat.influenceOnTrack > 0 && !hasEnemy(state, seat, d.sectorId),
        "No available influence disc, or enemy ships prevent control.",
      );
      seat.influenceOnTrack--;
      s!.owner = seat.id;
    }
  } else if (d.kind === "discovery" && c.kind === "discovery") {
    requireRule(
      d.options.includes(c.option),
      "This discovery option is unavailable.",
    );
    // Older AI clients selected the decision's concrete tile ID rather than
    // echoing it in discoveryId; retain that deterministic compatibility.
    const discoveryId = c.discoveryId ?? d.tileId;
    if (gameRules(state).publicDiscoveries && d.availableTileIds) {
      requireRule(!!(discoveryId && d.availableTileIds?.includes(discoveryId) && state.lessRandom?.discoverySupply.includes(discoveryId)), 'Choose one available face-up discovery tile.');
      state.lessRandom!.discoverySupply.splice(state.lessRandom!.discoverySupply.indexOf(discoveryId), 1);
      state.supplies.discovery.splice(state.supplies.discovery.indexOf(discoveryId), 1);
    } else {
      // Hidden draws and redeemed reservations already identify one exact tile.
      requireRule(discoveryId === d.tileId, 'Resolve the discovery tile that was drawn or reserved.');
    }
    const privateSeat = state.privateSeats.find((p) => p.seatId === seat.id)!;
    if (d.reserveForFourthTechnology) {
      requireRule(c.option === 'use', 'Reserve the selected discovery for your fourth technology.');
      privateSeat.storedDiscovery = discoveryId;
      privateSeat.storedDiscoveryResolved = false;
      state.lessRandom!.reservedDiscoveries[seat.id] = discoveryId;
      return true;
    }
    if (c.option === "keep") privateSeat.discoveriesKept.push(discoveryId);
    else {
      const effect = getDiscovery(discoveryId as DiscoveryId).effect;
      const sector = state.sectors.find((s) => s.id === d.sectorId);
      applyVariantDiscoveryEffect(state, seat, effect);
      if (effect.kind === "resources")
        for (const resource of ["money", "science", "materials"] as Resource[])
          seat.resources[resource] += effect.resources[resource];
      if (effect.kind === "ancient-ship-part") {
        if (getFaction(seat.faction).special?.ancientPartVp)
          seat.ancientPartsUsed = (seat.ancientPartsUsed ?? 0) + 1;
        queueAncientPart(state, seat, effect.part);
      }
      if (effect.kind === "place-unbuilt-ship") {
        requireRule(!!sector, "This discovery needs a sector.");
        if (
          state.ships.filter((s) => s.owner === seat.id && s.type === "cruiser")
            .length < 4
        )
          state.ships.push({
            id: uniqueId(state, "ship"),
            owner: seat.id,
            type: "cruiser",
            sectorId: sector!.id,
            damage: 0,
            arrival: e.nextId,
          });
      }
      if (effect.kind === "place-structure") {
        requireRule(!!sector, "This discovery needs a sector.");
        sector![effect.structure] = true;
        seat.resources.materials += effect.bonusMaterials;
      }
      if (effect.kind === "place-warp-portal") {
        requireRule(!!sector, "This discovery needs a sector.");
        sector!.portalVp = ((sector!.portalVp ?? 0) + 2) as 2 | 3;
      }
      if (effect.kind === "free-technology") {
        const ids = ancientTechnologyChoices(
          state.technologyMarket,
          seat.technologies,
          researchedTechnologyIds(seat),
        );
        requireRule(
          ids.length > 0,
          "No eligible lowest-cost regular technology remains; keep this discovery for 2 VP.",
        );
        if (ids.length)
          queueDecision(state, {
            id: uniqueId(state, "technology"),
            owner: seat.id,
            kind: "free-technology",
            technologyIds: ids,
          });
      }
      e.discardedDiscoveries.push(discoveryId);
    }
  } else if (d.kind === "ancient-part" && c.kind === "ancient-part") {
    resolveAncientPart(state, seat, d, c);
  } else if (d.kind === "free-technology" && c.kind === "free-technology") {
    requireRule(
      d.technologyIds.includes(c.technologyId),
      "Choose an offered free technology.",
    );
    researchTechnology(state, seat, c.technologyId, c.track, true);
  } else if (d.kind === "resource-reward" && c.kind === "resource-reward") {
    requireRule(
      c.resources.length === d.count,
      "Choose one resource for each reward.",
    );
    for (const r of c.resources) seat.resources[r] += d.perChoice;
  } else if (d.kind === "portal-placement" && c.kind === "portal-placement") {
    requireRule(
      d.sectorIds.includes(c.sectorId),
      "Choose an eligible controlled sector.",
    );
    const s = state.sectors.find((s) => s.id === c.sectorId)!;
    requireRule(s.owner === seat.id, "This sector is no longer eligible.");
    s.portalVp = ((s.portalVp ?? 0) + 1) as 1 | 2 | 3;
  } else if (d.kind === "population-return" && c.kind === "population-return") {
    requireRule(
      c.resources.length === d.count,
      "Return the required number of population cubes.",
    );
    for (const r of c.resources) {
      requireRule(
        d.resources.includes(r),
        "Choose an eligible destination track.",
      );
      if (d.destination === "graveyard")
        (seat.graveyard ??= { money: 0, science: 0, materials: 0 })[r]++;
      else {
        requireRule(
          seat.populationTracks[r] > -1,
          "This population track is completely full.",
        );
        seat.populationTracks[r]--;
      }
    }
  } else if (d.kind === "colonization" && c.kind === "colonization") {
    requireRule(
      c.placements.every((p) =>
        d.squares.some(
          (s) =>
            s.sectorId === p.sectorId &&
            s.squareId === p.squareId &&
            s.resources.includes(p.resource),
        ),
      ),
      "Choose only offered population squares.",
    );
    if (c.placements.length) colonize(state, seat, c.placements);
  } else if (d.kind === "diplomacy-window" && c.kind === "diplomacy-window") {
    requireRule(state.phase === 'combat', 'The end-of-combat diplomacy window is closed.');
    if (c.offerTo === null) {
      const finished = continuation(state).diplomacyDone ??= [];
      if (!finished.includes(seat.id)) finished.push(seat.id);
    } else {
      requireRule(d.eligibleSeatIds.includes(c.offerTo) && d.populationSources.includes(c.resource), 'Choose an available partner and population source.');
      offerDiplomacy(state, seat, c.offerTo, c.resource, true);
    }
  } else if (d.kind === "diplomacy" && c.kind === "diplomacy") {
    if (!c.accept && state.phase === 'combat') {
      const declined = continuation(state).diplomacyDeclined ??= [];
      if (!declined.some(pair => pair.proposer === d.proposer && pair.offeree === seat.id)) declined.push({proposer:d.proposer,offeree:seat.id});
    }
    if (c.accept) {
      const proposer = player(state, d.proposer);
      validateDiplomacy(state, proposer, seat.id, d.proposerResource ?? "money");
      requireRule(
        d.populationSources.includes(c.resource) &&
          resourceOptions(seat).includes(c.resource) &&
          !!d.proposerResource &&
          resourceOptions(proposer).includes(d.proposerResource),
        "An ambassador needs an available population cube.",
      );
      seat.populationTracks[c.resource]++;
      proposer.populationTracks[d.proposerResource!]++;
      seat.ambassadors.push(proposer.id);
      proposer.ambassadors.push(seat.id);
      (seat.ambassadorResources ??= []).push({
        from: proposer.id,
        resource: d.proposerResource!,
      });
      (proposer.ambassadorResources ??= []).push({
        from: seat.id,
        resource: c.resource,
      });
    }
  } else return false;
  return true;
}
