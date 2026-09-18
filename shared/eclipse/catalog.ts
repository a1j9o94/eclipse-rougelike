/** Reviewed against publisher-linked 2021-04-27 rulebook, pp. 3–5, 26–29.
 * Scope: verified setup/faction constants, not a complete sector/technology catalog.
 */
export const RULES_VERSION = 'second-dawn-base-2021-04-27' as const;
export const CATALOG_VERSION = 'second-dawn-catalog-0.1' as const;
export const RULEBOOK_URL =
  'https://www.dropbox.com/scl/fi/wfua8sx8lyp2axor71cjx/Eclipse2_rules-ENG_2021-04-27_small.pdf?rlkey=e6kaj8wow8rykg2esfbk8ixw0&dl=1';
export type PlayerCount = 2 | 3 | 4 | 5 | 6;
export type FactionId =
  | 'eridani'
  | 'hydran'
  | 'planta'
  | 'draco'
  | 'mechanema'
  | 'orion'
  | 'terran-directorate'
  | 'terran-federation'
  | 'terran-union'
  | 'terran-republic'
  | 'terran-conglomerate'
  | 'terran-alliance';
export type CivilizationColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'white'
  | 'black';
export interface CatalogResources {
  materials: number;
  science: number;
  money: number;
}
export interface ActionActivations {
  explore: number;
  research: number;
  upgrade: number;
  build: number;
  move: number;
  influence: number;
}
export interface ConstructionCosts {
  interceptor: number;
  cruiser: number;
  dreadnought: number;
  starbase: number;
  orbital: number;
  monolith: number;
}
export interface BaseFaction {
  id: FactionId;
  name: string;
  color: CivilizationColor;
  species: 'terran' | 'alien';
  homeSector: number;
  startingResources: CatalogResources;
  /** Population already placed at setup, including Hydran advanced-science exception. */
  startingPopulation: CatalogResources;
  /** Counts of printed basic and advanced squares on the home sector. */
  normalHomePopulation: CatalogResources;
  advancedHomePopulation: CatalogResources;
  colonyShips: number;
  /** Includes the disc placed on the starting sector; excludes research-only reserve discs. */
  startingInfluenceDiscs: number;
  startingShip: 'interceptor' | 'cruiser';
  startingReputationDraws: number;
  startingTechnologies: readonly string[];
  activations: ActionActivations;
  tradeRatio: number;
  constructionCosts: ConstructionCosts;
  source: string;
}
const DIZED = 'https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/';
const normalActivations: ActionActivations = {
  explore: 1,
  research: 1,
  upgrade: 2,
  build: 2,
  move: 2,
  influence: 2,
};
export const STANDARD_CONSTRUCTION_COSTS: ConstructionCosts = {
  interceptor: 3,
  cruiser: 5,
  dreadnought: 8,
  starbase: 3,
  orbital: 4,
  monolith: 10,
};
const standard = {
  colonyShips: 3,
  startingInfluenceDiscs: 13,
  startingShip: 'interceptor' as const,
  startingReputationDraws: 0,
  activations: normalActivations,
  tradeRatio: 3,
  constructionCosts: STANDARD_CONSTRUCTION_COSTS,
};
const terran = {
  ...standard,
  species: 'terran' as const,
  startingResources: { materials: 4, science: 3, money: 3 },
  startingPopulation: { materials: 1, science: 1, money: 1 },
  normalHomePopulation: { materials: 1, science: 1, money: 1 },
  advancedHomePopulation: { materials: 0, science: 1, money: 1 },
  startingTechnologies: ['starbase'],
  activations: { ...normalActivations, move: 3 },
  tradeRatio: 2,
};
export const BASE_FACTIONS: readonly BaseFaction[] = [
  {
    ...standard,
    id: 'eridani',
    name: 'Eridani Empire',
    color: 'red',
    species: 'alien',
    homeSector: 222,
    startingPopulation: { materials: 0, science: 1, money: 1 },
    normalHomePopulation: { materials: 0, science: 1, money: 1 },
    advancedHomePopulation: { materials: 0, science: 1, money: 1 },
    startingResources: { materials: 4, science: 2, money: 26 },
    startingInfluenceDiscs: 11,
    startingReputationDraws: 2,
    startingTechnologies: ['gauss-shield', 'fusion-drive', 'plasma-cannon'],
    source: DIZED + 'QbIG-z7ERBCwxzDm0Nxn9g/eridani-empire',
  },
  {
    ...standard,
    id: 'hydran',
    name: 'Hydran Progress',
    color: 'blue',
    species: 'alien',
    homeSector: 224,
    startingPopulation: { materials: 0, science: 1, money: 1 },
    normalHomePopulation: { materials: 0, science: 0, money: 1 },
    advancedHomePopulation: { materials: 1, science: 1, money: 0 },
    startingResources: { materials: 2, science: 6, money: 2 },
    activations: { ...normalActivations, research: 2 },
    startingTechnologies: ['advanced-labs'],
    source: DIZED + 'XHa1_pfWQz2xCoBnjnwZkw/hydran-progress',
  },
  {
    ...standard,
    id: 'planta',
    name: 'Planta',
    color: 'green',
    species: 'alien',
    homeSector: 226,
    startingPopulation: { materials: 1, science: 1, money: 0 },
    normalHomePopulation: { materials: 1, science: 1, money: 0 },
    advancedHomePopulation: { materials: 0, science: 0, money: 0 },
    startingResources: { materials: 4, science: 3, money: 2 },
    colonyShips: 4,
    activations: { ...normalActivations, explore: 2 },
    startingTechnologies: ['starbase'],
    source: DIZED + 'oo6qhIUtQAWUngwNsPsisw/planta',
  },
  {
    ...standard,
    id: 'draco',
    name: 'Descendants of Draco',
    color: 'yellow',
    species: 'alien',
    homeSector: 228,
    startingPopulation: { materials: 0, science: 1, money: 1 },
    normalHomePopulation: { materials: 0, science: 1, money: 1 },
    advancedHomePopulation: { materials: 1, science: 0, money: 0 },
    startingResources: { materials: 3, science: 4, money: 2 },
    startingTechnologies: ['fusion-drive'],
    source: DIZED + 'y_M8UXNoRimWu306EmLEaw/descendants-of-draco',
  },
  {
    ...standard,
    id: 'mechanema',
    name: 'Mechanema',
    color: 'white',
    species: 'alien',
    homeSector: 230,
    startingPopulation: { materials: 0, science: 1, money: 1 },
    normalHomePopulation: { materials: 0, science: 1, money: 1 },
    advancedHomePopulation: { materials: 1, science: 0, money: 1 },
    startingResources: { materials: 4, science: 3, money: 3 },
    activations: { ...normalActivations, upgrade: 3, build: 3 },
    constructionCosts: {
      interceptor: 2,
      cruiser: 4,
      dreadnought: 7,
      starbase: 2,
      orbital: 3,
      monolith: 8,
    },
    startingTechnologies: ['positron-computer'],
    source: DIZED + 'V4IDY4SxTS-on7Zg1qH4dw/mechanema',
  },
  {
    ...standard,
    id: 'orion',
    name: 'Orion Hegemony',
    color: 'black',
    species: 'alien',
    homeSector: 232,
    startingPopulation: { materials: 1, science: 1, money: 0 },
    normalHomePopulation: { materials: 1, science: 1, money: 0 },
    advancedHomePopulation: { materials: 1, science: 0, money: 1 },
    startingResources: { materials: 4, science: 3, money: 3 },
    startingShip: 'cruiser',
    tradeRatio: 4,
    startingTechnologies: ['neutron-bombs', 'gauss-shield'],
    source: DIZED + 'GvE0RLjRSciZrzF9jhz_eA/orion-hegemony',
  },
  {
    ...terran,
    id: 'terran-directorate',
    name: 'Terran Directorate',
    color: 'red',
    homeSector: 221,
    source: DIZED + '1AiA8j_DSIOiq26m5DktTA/terran-directorate',
  },
  {
    ...terran,
    id: 'terran-federation',
    name: 'Terran Federation',
    color: 'blue',
    homeSector: 223,
    source: DIZED + '8N5jZ4ELTt-4BfBzXMjU5g/terran-federation',
  },
  {
    ...terran,
    id: 'terran-union',
    name: 'Terran Union',
    color: 'green',
    homeSector: 225,
    source: DIZED + '1VvHkBHkTt-ZHY3EN0LNAQ/terran-union',
  },
  {
    ...terran,
    id: 'terran-republic',
    name: 'Terran Republic',
    color: 'yellow',
    homeSector: 227,
    source: DIZED + 'Wb2PxnRsQ322hr9oAhcDJQ/terran-republic',
  },
  {
    ...terran,
    id: 'terran-conglomerate',
    name: 'Terran Conglomerate',
    color: 'white',
    homeSector: 229,
    source: DIZED + 's51irG3VQUW-iDEXy_5Amg/terran-conglomerate',
  },
  {
    ...terran,
    id: 'terran-alliance',
    name: 'Terran Alliance',
    color: 'black',
    homeSector: 231,
    source: DIZED + '5UezU4jfQ3uuS6mOuEERHw/terran-alliance',
  },
];
export function getFaction(id: FactionId): BaseFaction {
  const faction = BASE_FACTIONS.find((candidate) => candidate.id === id);
  if (!faction) throw new Error(`Faction is absent from this catalog: ${id}`);
  return faction;
}
export function validateFactionSelection(ids: readonly FactionId[]): string[] {
  const seen = new Set<CivilizationColor>();
  const errors: string[] = [];
  for (const id of ids) {
    const color = getFaction(id).color;
    if (seen.has(color)) errors.push(`duplicate-color:${color}`);
    seen.add(color);
  }
  return errors;
}
export interface SetupCounts {
  outerSectors: number;
  initialRegularTechs: number;
  cleanupRegularTechs: number;
  guardians: number;
}
export const SETUP_BY_PLAYER_COUNT: Record<PlayerCount, SetupCounts> = {
  2: {
    outerSectors: 5,
    initialRegularTechs: 12,
    cleanupRegularTechs: 5,
    guardians: 4,
  },
  3: {
    outerSectors: 8,
    initialRegularTechs: 14,
    cleanupRegularTechs: 6,
    guardians: 3,
  },
  4: {
    outerSectors: 14,
    initialRegularTechs: 16,
    cleanupRegularTechs: 7,
    guardians: 2,
  },
  5: {
    outerSectors: 16,
    initialRegularTechs: 18,
    cleanupRegularTechs: 8,
    guardians: 1,
  },
  6: {
    outerSectors: 18,
    initialRegularTechs: 20,
    cleanupRegularTechs: 9,
    guardians: 0,
  },
};
export const BASE_COMPONENTS = {
  perColor: {
    interceptor: 8,
    cruiser: 4,
    dreadnought: 2,
    starbase: 4,
    population: 33,
    influence: 16,
    ambassador: 3,
  },
  physical: {
    playerShips: 108,
    ancients: 14,
    guardians: 4,
    gcds: 1,
    orbitals: 12,
    monoliths: 10,
    sectors: 54,
    technologyTiles: 114,
    shipParts: 282,
    discoveryTiles: 36,
    reputationTiles: 33,
    colonyShips: 24,
    damageCubes: 12,
  },
  unlimited: [
    'ship-parts',
    'orbitals',
    'monoliths',
    'damage-cubes',
    'resource-storage',
  ] as const,
  sectorIds: {
    inner: Array.from({ length: 10 }, (_, index) => 101 + index),
    middle: [
      ...Array.from({ length: 11 }, (_, index) => 201 + index),
      214,
      281,
    ],
    outer: [...Array.from({ length: 18 }, (_, index) => 301 + index), 381, 382],
    guardians: [271, 272, 273, 274],
    optionalWarpPortals: [281, 381, 382],
  },
} as const;

export type StartingDirection =
  | 'north'
  | 'northeast'
  | 'southeast'
  | 'south'
  | 'southwest'
  | 'northwest';
export interface StartingSlot {
  direction: StartingDirection;
  q: number;
  r: number;
  occupant: 'player' | 'guardian';
  /** Arrow orientation; not a wormhole mask or a sprite's rotation index. */
  arrowFaces: StartingDirection;
}
/** PDF p4 diagram translated to flat-top axial coordinates, clockwise from north.
 * Pixel convention x=1.5*q, y=sqrt(3)*(r+q/2), with screen y increasing down.
 */
const startingPositions: readonly Omit<StartingSlot, 'occupant'>[] = [
  { direction: 'north', q: 0, r: -2, arrowFaces: 'south' },
  { direction: 'northeast', q: 2, r: -2, arrowFaces: 'southwest' },
  { direction: 'southeast', q: 2, r: 0, arrowFaces: 'northwest' },
  { direction: 'south', q: 0, r: 2, arrowFaces: 'north' },
  { direction: 'southwest', q: -2, r: 2, arrowFaces: 'northeast' },
  { direction: 'northwest', q: -2, r: 0, arrowFaces: 'southeast' },
];
function makeStartingLayout(
  players: readonly StartingDirection[],
): readonly StartingSlot[] {
  return startingPositions.map((position) => ({
    ...position,
    occupant: players.includes(position.direction) ? 'player' : 'guardian',
  }));
}
export const STARTING_LAYOUTS: Record<PlayerCount, readonly StartingSlot[]> = {
  2: makeStartingLayout(['north', 'south']),
  3: makeStartingLayout(['north', 'southeast', 'southwest']),
  4: makeStartingLayout(['northeast', 'southeast', 'southwest', 'northwest']),
  5: makeStartingLayout([
    'north',
    'northeast',
    'southeast',
    'southwest',
    'northwest',
  ]),
  6: makeStartingLayout([
    'north',
    'northeast',
    'southeast',
    'south',
    'southwest',
    'northwest',
  ]),
};
