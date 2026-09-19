import {
  BASE_COMPONENTS,
  profileVersions,
  SETUP_BY_PLAYER_COUNT,
  STARTING_LAYOUTS,
  getFaction,
  factionAllowedForProfile,
  seatPieceColor,
  validateFactionSelection,
  type CivilizationColor,
  type FactionId,
  type FactionProfile,
  type PlayerCount,
} from "./catalog";
import { initialBlueprints } from "./blueprints";
import { createDiscoverySupply } from "./discoveries";
import { randomInt, randomSeed, shuffle } from "./random";
import {
  createTechnologyBag,
  drawTechnologies,
  prepareSectorStacks,
  createReputationSupply,
} from "./supplies";
import { getTechnology, type TechnologyId } from "./technologies";
import { requireSectorDefinition as sectorDefinition } from "./rulesState";
import type { GameState, Resource, Seat, Sector } from "./types";

export interface GameSetup {
  seed: number;
  seats: { id: string; faction: FactionId; controller: "human" | "ai"; pieceColor?: CivilizationColor }[];
  /** Omitted means the original base roster and pinned base versions. */
  factionProfile?: FactionProfile;
  warpPortals: boolean;
  /** Explicit module opt-in preserves historical setup seeds and pinned saved matches. */
  riftCannons?: boolean;
  /** Live matches opt in; omitted preserves historical deterministic fixture setup. */
  randomizeStartingPlayer?: boolean;
}
export function createGame(config: GameSetup): GameState {
  const count = config.seats.length as PlayerCount;
  const profile = config.factionProfile ?? 'base';
  const invalidFactions = config.seats.some(seat => !factionAllowedForProfile(seat.faction, profile));
  const selectionErrors = profile === 'base'
    ? validateFactionSelection(config.seats.map(seat => seat.faction))
    : validateFactionSelection(
        config.seats.map(seat => seat.faction),
        config.seats.map(seat => seatPieceColor(seat)),
      );
  if (
    count < 2 ||
    count > 6 ||
    new Set(config.seats.map((s) => s.id)).size !== count ||
    new Set(config.seats.map((s) => s.faction)).size !== count ||
    config.seats.some((s) => !s.id) ||
    invalidFactions || selectionErrors.length
  )
    throw new Error(
      "Choose two to six distinct seats and physical faction colors.",
    );
  const stacks = prepareSectorStacks(
    randomSeed(config.seed),
    count,
    config.warpPortals,
  );
  const bag = createTechnologyBag(stacks.random, config.warpPortals, config.riftCannons);
  const tech = drawTechnologies(
    bag.tiles,
    SETUP_BY_PLAYER_COUNT[count].initialRegularTechs,
  );
  const discoveries = shuffle(
    bag.random,
    createDiscoverySupply(config.warpPortals, config.riftCannons),
  );
  const reputation = shuffle(discoveries.state, createReputationSupply());
  const guardians = shuffle(
    reputation.state,
    BASE_COMPONENTS.sectorIds.guardians,
  );
  const seats: Seat[] = config.seats.map((s) => {
    const f = getFaction(s.faction);
    const technologies: Seat["technologies"] = {
      military: [],
      grid: [],
      nano: [],
    };
    for (const id of f.startingTechnologies) {
      const t = getTechnology(id as TechnologyId);
      if (t.track === "rare")
        throw new Error("Invalid printed starting technology.");
      technologies[t.track].push(id);
    }
    return {
      ...s,
      resources: { ...f.startingResources },
      populationTracks: { ...f.startingPopulation },
      influenceOnTrack: f.startingInfluenceDiscs - 1,
      actionDiscs: {
        explore: 0,
        influence: 0,
        research: 0,
        upgrade: 0,
        build: 0,
        move: 0,
      },
      colonyShipsAvailable: f.colonyShips,
      passed: false,
      eliminated: false,
      technologies,
      blueprints: initialBlueprints(s.faction),
      ambassadors: [],
      traitor: false,
      graveyard: { money: 0, science: 0, materials: 0 },
      storedParts: [],
      ambassadorResources: [],
    };
  });
  const state: GameState = {
    ...profileVersions(profile, config.riftCannons),
    ...(profile === 'expanded-v1' ? { factionProfile: profile } : {}),
    revision: 0,
    round: 1,
    phase: "action",
    activeSeatId: seats[0].id,
    startSeatId: seats[0].id,
    firstPasser: null,
    seats,
    sectors: [],
    ships: [],
    technologyMarket: tech.drawn.map((t) => t.technology),
    pendingDecision: null,
    privateSeats: seats.map((s) => {
      const privateSeat: GameState['privateSeats'][number] = {
        seatId: s.id,
        reputation: reputation.items.splice(0, getFaction(s.faction).startingReputationDraws),
        discoveriesKept: [],
      };
      if (getFaction(s.faction).special?.privateInitialDiscovery) {
        const storedDiscovery = discoveries.items.shift();
        if (storedDiscovery) privateSeat.storedDiscovery = storedDiscovery;
      }
      return privateSeat;
    }),
    random: guardians.state,
    supplies: {
      inner: stacks.inner.map(String),
      middle: stacks.middle.map(String),
      outer: stacks.outer.map(String),
      technology: tech.remaining.map((t) => t.technology),
      discovery: discoveries.items,
      reputation: reputation.items,
    },
    engine: {
      ...(config.riftCannons ? { riftCannons: true } : {}),
      warpPortals: config.warpPortals,
      action: null,
      decisions: [],
      sectorDiscoveries: [],
      discardedSectors: { inner: [], middle: [], outer: [] },
      discardedDiscoveries: [],
      boxedSectors: [...stacks.outerInBox, ...stacks.excluded].map(String),
      battle: null,
      battleSectors: [],
      upkeepDone: [],
      scores: null,
      nextId: 1,
    },
  };
  function add(tile: number, q: number, r: number, owner: Seat | null): void {
    const d = sectorDefinition(tile);
    const inward = [
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
    ].findIndex(([a, b]) => a === -q / 2 && b === -r / 2);
    const sector: Sector = {
      id: String(tile).padStart(3, "0"),
      tileId: String(tile).padStart(3, "0"),
      position: { q, r },
      rotation: d.homeArrow === null ? 0 : (inward - d.homeArrow + 6) % 6,
      owner: owner?.id ?? null,
      population: [],
      orbital: false,
      monolith: false,
      discovery: d.discovery,
    };
    if (owner) {
      const remaining = { ...getFaction(owner.faction).startingPopulation };
      d.population.forEach((square, i) => {
        if (
          square.resource !== "gray" &&
          remaining[square.resource] > 0 &&
          (!square.advanced ||
            getFaction(owner.faction).capabilities.advancedHomePopulation.includes(square.resource))
        ) {
          sector.population.push({
            squareId: `p${i}`,
            resource: square.resource as Resource,
          });
          remaining[square.resource]--;
        }
      });
      if (Object.values(remaining).some((n) => n !== 0))
        throw new Error("Catalog home population mismatch.");
      const faction = getFaction(owner.faction);
      const startingShips = faction.startingShips ?? { [faction.startingShip]: 1 };
      for (const [type, amount] of Object.entries(startingShips))
        for (let i = 0; i < (amount ?? 0); i++)
          state.ships.push({
            id: i === 0 ? `ship-${owner.id}-start` : `ship-${owner.id}-start-${i + 1}`,
            owner: owner.id,
            type: type as 'interceptor' | 'cruiser' | 'dreadnought' | 'starbase',
            sectorId: sector.id,
            damage: 0,
            arrival: 0,
          });
    }
    if (d.guardian || d.gcds) {
      const type = d.gcds ? "gcds" : "guardian";
      state.ships.push({
        id: `${type}-${tile}`,
        owner: type,
        type,
        sectorId: sector.id,
        damage: 0,
        arrival: 0,
      });
    }
    if (d.discovery) {
      const id = state.supplies.discovery.shift();
      if (id)
        state.engine!.sectorDiscoveries.push({
          sectorId: sector.id,
          discoveryId: id,
        });
      else sector.discovery = false;
    }
    state.sectors.push(sector);
  }
  add(1, 0, 0, null);
  let playerIndex = 0,
    guardianIndex = 0;
  for (const slot of STARTING_LAYOUTS[count]) {
    const seat = slot.occupant === "player" ? seats[playerIndex++] : null;
    add(
      seat
        ? getFaction(seat.faction).homeSector
        : guardians.items[guardianIndex++],
      slot.q,
      slot.r,
      seat,
    );
  }
  if (config.randomizeStartingPlayer) {
    const starter = randomInt(state.random, seats.length);
    state.random = starter.state;
    state.activeSeatId = seats[starter.value].id;
    state.startSeatId = seats[starter.value].id;
  }
  return state;
}
