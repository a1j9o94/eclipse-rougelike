import { MINOR_SPECIES } from "./minorSpecies";
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
import { createDiscoverySupply, createLessRandomDiscoverySupply } from "./discoveries";
import { randomInt, randomSeed, shuffle } from "./random";
import {
  createTechnologyBag,
  drawTechnologies,
  prepareSectorStacks,
  createReputationSupply,
} from "./supplies";
import { getTechnology, type TechnologyId } from "./technologies";
import { requireSectorDefinition as sectorDefinition } from "./rulesState";
import type { GameState, PendingDecision, Resource, Seat, Sector } from "./types";
import { LESS_RANDOM_MODE } from './lessRandom';
import { allowsRiftCannons, gameRules, validRuleOptions, type GameRuleOptions } from './gameRules';

export interface GameSetup {
  minorSpecies?: boolean;
  seed: number;
  seats: { id: string; faction: FactionId; controller: "human" | "ai"; pieceColor?: CivilizationColor; bannedFaction?: FactionId }[];
  /** Omitted means the original base roster and pinned base versions. */
  factionProfile?: FactionProfile;
  warpPortals: boolean;
  /** Explicit module opt-in preserves historical setup seeds and pinned saved matches. */
  riftCannons?: boolean;
  /** Live matches opt in; omitted preserves historical deterministic fixture setup. */
  randomizeStartingPlayer?: boolean;
  /** Omitted preserves the standard game, including historical deterministic setups. */
  rulesMode?: "standard" | "less-random-v1";
  ruleOptions?: GameRuleOptions;
}
export function createGame(config: GameSetup): GameState {
  if (!validRuleOptions(config.ruleOptions)) throw new Error('Choose valid game rule options and a round limit from 1 to 20.');
  if (config.riftCannons && !allowsRiftCannons(config)) throw new Error('Rift Cannons cannot be combined with combat Jokers or the variant technology inventory.');
  const rules = gameRules(config);
  // Preset-only historical setups forced this module off. Explicit custom
  // settings may retain portal sectors independently of inventory amendments.
  const warpPortals = config.rulesMode === LESS_RANDOM_MODE && config.ruleOptions === undefined ? false : config.warpPortals;
  const hasPublicState = rules.explorationRules || rules.publicDiscoveries || rules.publicReputation;
  const count = config.seats.length as PlayerCount;
  const profile = config.factionProfile ?? 'base';
  const invalidFactions = config.seats.some(seat => !factionAllowedForProfile(seat.faction, profile));
  const selectedFactions = new Set(config.seats.map(seat => seat.faction));
  const terranBans = config.seats.filter(seat => rules.factionVariant && getFaction(seat.faction).species === 'terran').map(seat => seat.bannedFaction);
  const invalidTerranBans = terranBans.some(ban => !ban || !factionAllowedForProfile(ban, profile) || getFaction(ban).species !== 'alien' || selectedFactions.has(ban)) || new Set(terranBans).size !== terranBans.length;
  const invalidUnexpectedBans = config.seats.some(seat => seat.bannedFaction !== undefined && (!rules.factionVariant || getFaction(seat.faction).species !== 'terran'));
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
    invalidFactions || invalidTerranBans || invalidUnexpectedBans || selectionErrors.length
  )
    throw new Error(
      "Choose two to six distinct seats and physical faction colors.",
    );
  const stacks = prepareSectorStacks(
    randomSeed(config.seed),
    count,
    warpPortals,
    rules.explorationRules,
  );
  const bag = createTechnologyBag(stacks.random, warpPortals, config.riftCannons, rules.technologyVariant);
  const tech = rules.openTechnology ? { drawn: bag.tiles, remaining: [], regularDrawn: bag.tiles.length } : drawTechnologies(bag.tiles, SETUP_BY_PLAYER_COUNT[count].initialRegularTechs);
  const discoveries = shuffle(
    bag.random,
    rules.discoveryVariant ? createLessRandomDiscoverySupply() : createDiscoverySupply(warpPortals, config.riftCannons),
  );
  // Face-up reputation starts deterministically from the public 1-VP group.
  const reputation = rules.publicReputation
    ? { state: discoveries.state, items: createReputationSupply() }
    : shuffle(discoveries.state, createReputationSupply());
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
      // A printed rare technology occupies a chosen regular track at setup.
      technologies[t.track === "rare" ? "nano" : t.track].push(id);
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
      ...(s.faction==='lyra'?{shrines:[]}:{}),
      passed: false,
      eliminated: false,
      technologies,
      blueprints: initialBlueprints(s.faction),
      ambassadors: [],
      traitor: false,
      ...(rules.combatJokers ? { superJokers: 5 } : {}),
      ...(rules.discoveryVariant ? { discoveryBonuses: [] } : {}),
      ...(rules.technologyVariant ? { developments: [] } : {}),
      graveyard: { money: 0, science: 0, materials: 0 },
      storedParts: [],
      ambassadorResources: [],
    };
  });
  const state: GameState = {
    ...profileVersions(profile, config.riftCannons, config.minorSpecies),
    ...(profile !== 'base' ? { factionProfile: profile } : {}),
    ...(config.rulesMode === LESS_RANDOM_MODE ? { rulesMode: LESS_RANDOM_MODE } : {}),
    ...(config.ruleOptions ? { ruleOptions: { ...config.ruleOptions } } : {}),
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
        reputation: rules.publicReputation ? [] : reputation.items.splice(0, getFaction(s.faction).startingReputationDraws),
        discoveriesKept: [],
      };
      if (!rules.publicDiscoveries && getFaction(s.faction).special?.privateInitialDiscovery) {
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
    ...(hasPublicState ? { lessRandom: {
      explorationJokers: rules.explorationRules ? Object.fromEntries(seats.map(seat => [seat.id, true])) : {},
      outerPlacementsThisRound: rules.explorationRules ? Object.fromEntries(seats.map(seat => [seat.id, 0])) : {},
      discoverySupply: rules.publicDiscoveries ? [...discoveries.items] : [],
      reputationSupply: rules.publicReputation ? [...reputation.items] : [],
      reputationBySeat: {},
      reservedDiscoveries: rules.publicDiscoveries ? Object.fromEntries(seats.map(seat => [seat.id, null])) : {},
    } } : {}),
    engine: {
      ...(config.riftCannons ? { riftCannons: true } : {}),
      warpPortals,
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
  if (rules.publicReputation)
    for (const hidden of state.privateSeats)
      state.lessRandom!.reputationBySeat[hidden.seatId] = [...hidden.reputation];
  if (rules.publicDiscoveries || rules.publicReputation) {
    const setupDecisions: PendingDecision[] = [];
    for (const seat of seats) {
      const faction = getFaction(seat.faction);
      if (rules.publicReputation && faction.startingReputationDraws)
        setupDecisions.push({ id: `setup-reputation-${seat.id}`, owner: seat.id, kind: 'less-random-reputation', draws: faction.startingReputationDraws, capacity: faction.capabilities.reputationSlots });
      if (rules.publicDiscoveries && faction.special?.privateInitialDiscovery)
        setupDecisions.push({ id: `setup-discovery-${seat.id}`, owner: seat.id, kind: 'discovery', tileId: '', availableTileIds: [...state.lessRandom!.discoverySupply], reserveForFourthTechnology: true, options: ['use'] });
    }
    state.pendingDecision = setupDecisions.shift() ?? null;
    state.engine!.decisions.push(...setupDecisions);
  }
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
      orbital: owner ? !!getFaction(owner.faction).special?.startsWithOrbital : false,
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
    if (d.discovery && !rules.publicDiscoveries) {
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
  if (config.minorSpecies) {
    const market = shuffle(state.random, MINOR_SPECIES.map(tile => tile.id));
    state.random = market.state;
    state.minorSpecies = {market:market.items.slice(0,4)};
  }
  return state;
}
