import type { RulesMode } from './types';
/** Reviewed against publisher-linked 2021-04-27 rulebook, pp. 3–5, 26–29.
 * Scope: verified setup/faction constants, not a complete sector/technology catalog.
 */
import type { ShipPartId, ShipStats } from './parts';

export const RULES_VERSION = 'second-dawn-base-2021-04-27' as const;
export const CATALOG_VERSION = 'second-dawn-catalog-0.1' as const;
export const EXPANDED_RULES_VERSION = 'second-dawn-expanded-v1-2026-05-20' as const;
export const EXPANDED_CATALOG_VERSION = 'second-dawn-catalog-expanded-v1' as const;
export type FactionProfile = 'base' | 'expanded-v1';
export interface ProfileVersions { readonly rulesVersion: string; readonly catalogVersion: string }
export function profileVersions(profile: FactionProfile, riftCannons = false, minorSpecies = false): ProfileVersions {
  const base = profile === 'base'
    ? { rulesVersion: RULES_VERSION, catalogVersion: CATALOG_VERSION }
    : { rulesVersion: EXPANDED_RULES_VERSION, catalogVersion: EXPANDED_CATALOG_VERSION };
  const rift = riftCannons
    ? { rulesVersion: `${base.rulesVersion}+rift-cannon-v1`, catalogVersion: `${base.catalogVersion}+rift-cannon-v1` }
    : base;
  return minorSpecies ? {rulesVersion: `${rift.rulesVersion}+minor-species-v1`, catalogVersion: `${rift.catalogVersion}+minor-species-v1`} : rift;
}
export const RULEBOOK_URL =
  'https://www.dropbox.com/scl/fi/wfua8sx8lyp2axor71cjx/Eclipse2_rules-ENG_2021-04-27_small.pdf?rlkey=e6kaj8wow8rykg2esfbk8ixw0&dl=1';
export type PlayerCount = 2 | 3 | 4 | 5 | 6;
export const FACTION_IDS = [
  'eridani', 'hydran', 'planta', 'draco', 'mechanema', 'orion',
  'terran-directorate', 'terran-federation', 'terran-union',
  'terran-republic', 'terran-conglomerate', 'terran-alliance',
  'rho-indi', 'magellan', 'midas', 'ragnarok',
] as const;
export type FactionId = (typeof FACTION_IDS)[number];
export type CivilizationColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'white'
  | 'black';
export type FactionVisualIdentity =
  | 'eridani'
  | 'hydran'
  | 'planta'
  | 'draco'
  | 'mechanema'
  | 'orion'
  | 'rho-indi'
  | 'magellan'
  | 'midas'
  | 'ragnarok';
export type ShipDesignFamily = Exclude<FactionVisualIdentity, 'rho-indi' | 'magellan' | 'midas' | 'ragnarok'>;
export type FactionCapability =
  | 'ancient-coexistence'
  | 'controlled-sector-vp'
  | 'surviving-ancient-vp'
  | 'destroyed-population-when-occupied'
  | 'choose-one-of-two-exploration-sectors'
  | 'advanced-home-population';
export type FactionEndGameVp = 'none' | 'controlled-sector' | 'surviving-ancient';
export interface FactionCapabilities {
  ancientRelationship: 'hostile' | 'coexist';
  exploration: { readonly draw: 1 | 2; readonly keep: 1 };
  endGameVp: FactionEndGameVp;
  opponentPopulation: 'bombard' | 'destroy';
  advancedHomePopulation: readonly (keyof CatalogResources)[];
  reputationSlots: 3 | 4 | 5;
  dedicatedAmbassadorSlots: 0 | 1;
  /** Spaces that cannot hold any regular or Minor Species ambassador. */
  dedicatedReputationSlots?: 0 | 1;
  ambassadorSupply: 2 | 3;
  /** Behavior-preserving policy hints. They are inputs to AI judgment, never rules. */
  ai: {
    readonly exploreBias: number;
    readonly scienceValue: number;
    readonly materialsValue: number;
    readonly researchBias: number;
    readonly nanorobotsBias: number;
    readonly shipBuildBias: number;
    readonly upgradeBias: number;
    readonly diplomacyValue: number;
    readonly ancientExplorationValue: number;
    readonly controlledSectorValue: number;
  };
}
export type FactionBlueprintShipType = 'interceptor' | 'cruiser' | 'dreadnought' | 'starbase';
export interface FactionBlueprintDefinition {
  shipType: FactionBlueprintShipType;
  preprinted: (ShipPartId | null)[];
  permanent: ShipStats;
  source: string;
}
export type FactionBlueprints = Record<FactionBlueprintShipType, FactionBlueprintDefinition>;
export interface FactionContentMetadata {
  packId: string;
  kind: 'official' | 'unofficial';
  edition: string;
  authority: 'publisher' | 'user-supplied-drive';
}
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
export interface TradeRate {
  readonly from: keyof CatalogResources;
  readonly to: keyof CatalogResources;
  readonly input: number;
  readonly output: 1 | 2;
}
export interface FactionSpecialAbilities {
  readonly reputationMoneyPerDrawMinus?: number;
  readonly ignoresTraitorPenalty?: boolean;
  readonly convertColonyShipToResource?: boolean;
  readonly privateInitialDiscovery?: boolean;
  readonly fourthTechnologyDiscovery?: boolean;
  readonly ancientPartVp?: number;
  readonly paidAdditionalActivation?: { readonly explore: number; readonly research: number; readonly upgrade: number; readonly build: number; readonly move: number; readonly influence: number; readonly lowDiscSurcharge: number; readonly lowDiscThreshold: number };
  readonly mixedAction?: { readonly move: { readonly move: number; readonly build: number }; readonly build: { readonly move: number; readonly build: number } };
}
export interface FactionDefinition {
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
  startingShips?: Partial<Record<FactionBlueprintShipType, number>>;
  startingReputationDraws: number;
  startingTechnologies: readonly string[];
  activations: ActionActivations;
  tradeRatio: number;
  tradeRates?: readonly TradeRate[];
  constructionCosts: ConstructionCosts;
  componentSupply?: Partial<Record<FactionBlueprintShipType, number>>;
  /** Physical board color remains the base-game piece/seat constraint. */
  emblem: FactionVisualIdentity;
  shipDesignFamily: ShipDesignFamily;
  content: FactionContentMetadata;
  sources: { readonly rules: string; readonly blueprints: string };
  capabilities: FactionCapabilities;
  blueprints: FactionBlueprints;
  special?: FactionSpecialAbilities;
  /** Compatibility alias retained for existing callers. */
  source: string;
}
/** Compatibility name retained for existing base-catalog callers. */
export type BaseFaction = FactionDefinition;
const DIZED = 'https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/';
const BLUEPRINT_SOURCE = 'https://steamcommunity.com/sharedfiles/filedetails/?id=2414358241';
const CONTENT: FactionContentMetadata = {
  packId: 'second-dawn-base', kind: 'official', edition: 'second-edition', authority: 'publisher',
};
const EXPANDED_CONTENT: FactionContentMetadata = {
  packId: 'drive-expanded-v1', kind: 'unofficial', edition: 'second-dawn-community', authority: 'user-supplied-drive',
};
const OUTCASTS_CONTENT: FactionContentMetadata = {
  packId: 'second-dawn-outcasts', kind: 'official', edition: 'second-dawn-outcasts', authority: 'publisher',
};
const SEEKERS_CONTENT: FactionContentMetadata = {
  packId: 'second-dawn-seekers', kind: 'official', edition: 'second-dawn-seekers', authority: 'publisher',
};
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
const emptyStats = (stats: Partial<ShipStats> = {}): ShipStats => ({
  energyProduction: 0, energyConsumption: 0, initiative: 0, movement: 0,
  computer: 0, shield: 0, hull: 0, weapons: [], ...stats,
});
const blueprint = (
  shipType: FactionBlueprintShipType,
  preprinted: (ShipPartId | null)[],
  permanent: Partial<ShipStats>,
): FactionBlueprintDefinition => ({ shipType, preprinted, permanent: emptyStats(permanent), source: BLUEPRINT_SOURCE });
const STANDARD_BLUEPRINTS: FactionBlueprints = {
  interceptor: blueprint('interceptor', ['ion-cannon', 'nuclear-source', 'nuclear-drive', null], { initiative: 2 }),
  cruiser: blueprint('cruiser', ['electron-computer', 'ion-cannon', 'hull', 'nuclear-source', 'nuclear-drive', null], { initiative: 1 }),
  dreadnought: blueprint('dreadnought', ['electron-computer', 'ion-cannon', 'ion-cannon', 'hull', 'hull', 'nuclear-source', 'nuclear-drive', null], { initiative: 0 }),
  starbase: blueprint('starbase', ['electron-computer', 'ion-cannon', null, 'hull', 'hull'], { energyProduction: 3, initiative: 3 }),
};
const RHO_BLUEPRINTS: FactionBlueprints = {
  interceptor: blueprint('interceptor', ['ion-cannon', 'nuclear-source', 'nuclear-drive', null], { initiative: 3, shield: 1 }),
  cruiser: blueprint('cruiser', ['electron-computer', 'ion-cannon', 'hull', 'nuclear-source', 'nuclear-drive', null], { initiative: 2, shield: 1 }),
  dreadnought: blueprint('dreadnought', [], {},),
  starbase: blueprint('starbase', ['electron-computer', 'ion-cannon', null, 'hull', 'hull'], { energyProduction: 3, initiative: 3, shield: 1 }),
};
const RAGNAROK_BLUEPRINTS: FactionBlueprints = {
  interceptor: blueprint('interceptor', ['ion-cannon', 'nuclear-source', 'nuclear-drive', null, 'hull'], { initiative: 1 }),
  cruiser: blueprint('cruiser', ['electron-computer', 'ion-cannon', 'nuclear-source', 'nuclear-drive', null], { energyProduction: 1, initiative: 2 }),
  dreadnought: STANDARD_BLUEPRINTS.dreadnought,
  starbase: STANDARD_BLUEPRINTS.starbase,
};
const ERIDANI_BLUEPRINTS: FactionBlueprints = {
  interceptor: blueprint('interceptor', [...STANDARD_BLUEPRINTS.interceptor.preprinted], { energyProduction: 1, initiative: 2 }),
  cruiser: blueprint('cruiser', [...STANDARD_BLUEPRINTS.cruiser.preprinted], { energyProduction: 1, initiative: 1 }),
  dreadnought: blueprint('dreadnought', [...STANDARD_BLUEPRINTS.dreadnought.preprinted], { energyProduction: 1, initiative: 0 }),
  starbase: STANDARD_BLUEPRINTS.starbase,
};
const PLANTA_BLUEPRINTS: FactionBlueprints = {
  interceptor: blueprint('interceptor', ['ion-cannon', 'nuclear-source', 'nuclear-drive'], { energyProduction: 2, initiative: 0, computer: 1 }),
  cruiser: blueprint('cruiser', ['ion-cannon', 'hull', 'nuclear-source', 'nuclear-drive', null], { energyProduction: 2, initiative: 0, computer: 1 }),
  dreadnought: blueprint('dreadnought', ['ion-cannon', 'ion-cannon', 'hull', 'hull', 'nuclear-source', 'nuclear-drive', null], { energyProduction: 2, initiative: 0, computer: 1 }),
  starbase: blueprint('starbase', ['electron-computer', 'ion-cannon', 'hull', 'hull'], { energyProduction: 5, initiative: 2, computer: 1 }),
};
const ORION_BLUEPRINTS: FactionBlueprints = {
  interceptor: blueprint('interceptor', ['ion-cannon', 'nuclear-source', 'nuclear-drive', 'gauss-shield'], { energyProduction: 1, initiative: 3 }),
  cruiser: blueprint('cruiser', ['electron-computer', 'ion-cannon', 'hull', 'nuclear-source', 'nuclear-drive', 'gauss-shield'], { energyProduction: 2, initiative: 2 }),
  dreadnought: blueprint('dreadnought', ['electron-computer', 'ion-cannon', 'ion-cannon', 'hull', 'hull', 'nuclear-source', 'nuclear-drive', 'gauss-shield'], { energyProduction: 3, initiative: 1 }),
  starbase: blueprint('starbase', ['electron-computer', 'ion-cannon', 'gauss-shield', 'hull', 'hull'], { energyProduction: 3, initiative: 4 }),
};
const DEFAULT_CAPABILITIES: FactionCapabilities = {
  ancientRelationship: 'hostile', exploration: { draw: 1, keep: 1 }, endGameVp: 'none',
  opponentPopulation: 'bombard', advancedHomePopulation: [], reputationSlots: 4,
  dedicatedAmbassadorSlots: 0, ambassadorSupply: 3,
  ai: { exploreBias: 0, scienceValue: 1.8, materialsValue: 1.6, researchBias: 0,
    nanorobotsBias: 0, shipBuildBias: 0, upgradeBias: 0, diplomacyValue: 7,
    ancientExplorationValue: -4, controlledSectorValue: 0 },
};
const visual = (identity: ShipDesignFamily, blueprints: FactionBlueprints = STANDARD_BLUEPRINTS) => ({
  emblem: identity, shipDesignFamily: identity, content: CONTENT, blueprints,
});
const expandedVisual = (
  emblem: Extract<FactionVisualIdentity, 'rho-indi' | 'magellan' | 'midas' | 'ragnarok'>,
  shipDesignFamily: ShipDesignFamily,
  blueprints: FactionBlueprints = STANDARD_BLUEPRINTS,
  content: FactionContentMetadata = EXPANDED_CONTENT,
) => ({ emblem, shipDesignFamily, content, blueprints });
const sources = (rules: string) => ({ source: rules, sources: { rules, blueprints: BLUEPRINT_SOURCE } });
const standard = {
  colonyShips: 3,
  startingInfluenceDiscs: 13,
  startingShip: 'interceptor' as const,
  startingReputationDraws: 0,
  activations: normalActivations,
  tradeRatio: 3,
  constructionCosts: STANDARD_CONSTRUCTION_COSTS,
  capabilities: DEFAULT_CAPABILITIES,
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
  capabilities: {
    ...DEFAULT_CAPABILITIES,
    dedicatedAmbassadorSlots: 1 as const,
  },
};
export const FACTION_REGISTRY: readonly FactionDefinition[] = [
  {
    ...standard,
    ...visual('eridani', ERIDANI_BLUEPRINTS),
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
    ...sources(DIZED + 'QbIG-z7ERBCwxzDm0Nxn9g/eridani-empire'),
  },
  {
    ...standard,
    ...visual('hydran'),
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
    capabilities: {
      ...DEFAULT_CAPABILITIES,
      advancedHomePopulation: ['science'],
      reputationSlots: 3,
      dedicatedAmbassadorSlots: 1,
      ai: { ...DEFAULT_CAPABILITIES.ai, scienceValue: 2.4, researchBias: 4 },
    },
    startingTechnologies: ['advanced-labs'],
    ...sources(DIZED + 'XHa1_pfWQz2xCoBnjnwZkw/hydran-progress'),
  },
  {
    ...standard,
    ...visual('planta', PLANTA_BLUEPRINTS),
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
    capabilities: {
      ...DEFAULT_CAPABILITIES,
      endGameVp: 'controlled-sector',
      opponentPopulation: 'destroy',
      reputationSlots: 3,
      dedicatedAmbassadorSlots: 1,
      ai: { ...DEFAULT_CAPABILITIES.ai, exploreBias: 4, controlledSectorValue: 3 },
    },
    startingTechnologies: ['starbase'],
    ...sources(DIZED + 'oo6qhIUtQAWUngwNsPsisw/planta'),
  },
  {
    ...standard,
    ...visual('draco'),
    id: 'draco',
    name: 'Descendants of Draco',
    color: 'yellow',
    species: 'alien',
    homeSector: 228,
    startingPopulation: { materials: 0, science: 1, money: 1 },
    normalHomePopulation: { materials: 0, science: 1, money: 1 },
    advancedHomePopulation: { materials: 1, science: 0, money: 0 },
    startingResources: { materials: 3, science: 4, money: 2 },
    capabilities: {
      ...DEFAULT_CAPABILITIES,
      ancientRelationship: 'coexist',
      exploration: { draw: 2, keep: 1 },
      endGameVp: 'surviving-ancient',
      ai: { ...DEFAULT_CAPABILITIES.ai, exploreBias: 3, ancientExplorationValue: 3 },
    },
    startingTechnologies: ['fusion-drive'],
    ...sources(DIZED + 'y_M8UXNoRimWu306EmLEaw/descendants-of-draco'),
  },
  {
    ...standard,
    ...visual('mechanema'),
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
    capabilities: {
      ...DEFAULT_CAPABILITIES,
      ai: { ...DEFAULT_CAPABILITIES.ai, materialsValue: 2.1, nanorobotsBias: 4, shipBuildBias: 2, upgradeBias: 1 },
    },
    startingTechnologies: ['positron-computer'],
    ...sources(DIZED + 'V4IDY4SxTS-on7Zg1qH4dw/mechanema'),
  },
  {
    ...standard,
    ...visual('orion', ORION_BLUEPRINTS),
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
    capabilities: {
      ...DEFAULT_CAPABILITIES,
      reputationSlots: 5,
      dedicatedReputationSlots: 1,
      ai: { ...DEFAULT_CAPABILITIES.ai, shipBuildBias: 3, diplomacyValue: 3 },
    },
    startingTechnologies: ['neutron-bombs', 'gauss-shield'],
    ...sources(DIZED + 'GvE0RLjRSciZrzF9jhz_eA/orion-hegemony'),
  },
  {
    ...terran,
    ...visual('eridani'),
    id: 'terran-directorate',
    name: 'Terran Directorate',
    color: 'red',
    homeSector: 221,
    ...sources(DIZED + '1AiA8j_DSIOiq26m5DktTA/terran-directorate'),
  },
  {
    ...terran,
    ...visual('hydran'),
    id: 'terran-federation',
    name: 'Terran Federation',
    color: 'blue',
    homeSector: 223,
    ...sources(DIZED + '8N5jZ4ELTt-4BfBzXMjU5g/terran-federation'),
  },
  {
    ...terran,
    ...visual('planta'),
    id: 'terran-union',
    name: 'Terran Union',
    color: 'green',
    homeSector: 225,
    ...sources(DIZED + '1VvHkBHkTt-ZHY3EN0LNAQ/terran-union'),
  },
  {
    ...terran,
    ...visual('draco'),
    id: 'terran-republic',
    name: 'Terran Republic',
    color: 'yellow',
    homeSector: 227,
    ...sources(DIZED + 'Wb2PxnRsQ322hr9oAhcDJQ/terran-republic'),
  },
  {
    ...terran,
    ...visual('mechanema'),
    id: 'terran-conglomerate',
    name: 'Terran Conglomerate',
    color: 'white',
    homeSector: 229,
    ...sources(DIZED + 's51irG3VQUW-iDEXy_5Amg/terran-conglomerate'),
  },
  {
    ...terran,
    ...visual('orion'),
    id: 'terran-alliance',
    name: 'Terran Alliance',
    color: 'black',
    homeSector: 231,
    ...sources(DIZED + '5UezU4jfQ3uuS6mOuEERHw/terran-alliance'),
  },
  {
    ...standard,
    ...expandedVisual('rho-indi', 'orion', RHO_BLUEPRINTS, OUTCASTS_CONTENT),
    id: 'rho-indi', name: 'Rho Indi Syndicate', color: 'black', species: 'alien', homeSector: 236,
    startingResources: { materials: 3, science: 3, money: 2 },
    startingPopulation: { materials: 1, science: 0, money: 1 },
    normalHomePopulation: { materials: 1, science: 0, money: 1 },
    advancedHomePopulation: { materials: 0, science: 1, money: 1 },
    colonyShips: 2, startingShips: { interceptor: 2 },
    startingTechnologies: ['starbase', 'gauss-shield'],
    activations: { ...normalActivations, move: 4 },
    constructionCosts: { ...STANDARD_CONSTRUCTION_COSTS, interceptor: 4, cruiser: 6, starbase: 4 },
    componentSupply: { interceptor: 8, cruiser: 4, dreadnought: 0, starbase: 4 },
    capabilities: { ...DEFAULT_CAPABILITIES, reputationSlots: 4, dedicatedAmbassadorSlots: 0, ambassadorSupply: 2 },
    tradeRates: [
      { from: 'materials', to: 'science', input: 3, output: 1 }, { from: 'materials', to: 'money', input: 3, output: 1 },
      { from: 'science', to: 'materials', input: 3, output: 1 }, { from: 'science', to: 'money', input: 3, output: 1 },
      { from: 'money', to: 'materials', input: 3, output: 2 }, { from: 'money', to: 'science', input: 3, output: 2 },
    ],
    special: { reputationMoneyPerDrawMinus: 1, ignoresTraitorPenalty: true },
    source: '.second-dawn/faction-research/originals/Outcasts and Seekers/03 Rho indi syndicate Outcasts rules.jpg',
    sources: { rules: '.second-dawn/faction-research/originals/Outcasts and Seekers/03 Rho indi syndicate Outcasts rules.jpg', blueprints: '.second-dawn/faction-research/originals/Outcasts and Seekers/03 Rho indi syndicate board Outcasts.jpg' },
  },
  {
    ...standard,
    ...expandedVisual('magellan', 'hydran', STANDARD_BLUEPRINTS, SEEKERS_CONTENT),
    id: 'magellan', name: 'Wardens of Magellan', color: 'blue', species: 'alien', homeSector: 233,
    startingResources: { materials: 3, science: 2, money: 2 },
    startingPopulation: { materials: 1, science: 0, money: 0 },
    normalHomePopulation: { materials: 1, science: 0, money: 0 },
    advancedHomePopulation: { materials: 0, science: 1, money: 1 },
    startingTechnologies: ['fusion-source'],
    tradeRatio: 2,
    tradeRates: [
      { from: 'money', to: 'science', input: 2, output: 1 }, { from: 'money', to: 'materials', input: 2, output: 1 },
      { from: 'science', to: 'money', input: 2, output: 1 }, { from: 'science', to: 'materials', input: 2, output: 1 },
      { from: 'materials', to: 'money', input: 2, output: 1 }, { from: 'materials', to: 'science', input: 2, output: 1 },
      { from: 'materials', to: 'money', input: 3, output: 2 }, { from: 'materials', to: 'science', input: 3, output: 2 },
    ],
    special: { convertColonyShipToResource: true, privateInitialDiscovery: true, fourthTechnologyDiscovery: true, ancientPartVp: 1 },
    source: '.second-dawn/faction-research/originals/Outcasts and Seekers/02 Warden of Magellan Seekers rules.jpg',
    sources: { rules: '.second-dawn/faction-research/originals/Outcasts and Seekers/02 Warden of Magellan Seekers rules.jpg', blueprints: '.second-dawn/faction-research/originals/Outcasts and Seekers/02 Warden of Magellan Seekers.jpg' },
  },
  {
    ...standard,
    ...expandedVisual('midas', 'eridani'),
    id: 'midas', name: 'Legion of Midas', color: 'yellow', species: 'alien', homeSector: 277,
    startingResources: { materials: 2, science: 3, money: 4 },
    startingPopulation: { materials: 0, science: 0, money: 1 },
    normalHomePopulation: { materials: 0, science: 0, money: 0 },
    advancedHomePopulation: { materials: 0, science: 1, money: 1 },
    startingTechnologies: ['advanced-economy'],
    capabilities: { ...DEFAULT_CAPABILITIES, advancedHomePopulation: ['money'] },
    special: { paidAdditionalActivation: { explore: 3, research: 3, upgrade: 1, build: 1, move: 1, influence: 1, lowDiscSurcharge: 1, lowDiscThreshold: 6 } },
    source: '.second-dawn/faction-research/originals/NEW FACTIONS/02 Remaining Info Sheet and Rules of the new Factions/Legion of Midas rules Info sheet PRINT final.jpg',
    sources: { rules: '.second-dawn/faction-research/originals/NEW FACTIONS/02 Remaining Info Sheet and Rules of the new Factions/Legion of Midas rules Info sheet PRINT final.jpg', blueprints: '.second-dawn/faction-research/originals/NEW FACTIONS/01 Faction Board Sheets/12 Legion of Midas.jpg' },
  },
  {
    ...standard,
    ...expandedVisual('ragnarok', 'draco', RAGNAROK_BLUEPRINTS),
    id: 'ragnarok', name: 'Heralds of Ragnarok', color: 'red', species: 'alien', homeSector: 299,
    startingResources: { materials: 2, science: 3, money: 3 },
    startingPopulation: { materials: 0, science: 1, money: 1 },
    normalHomePopulation: { materials: 0, science: 1, money: 1 },
    advancedHomePopulation: { materials: 0, science: 0, money: 1 },
    startingShip: 'cruiser', startingTechnologies: ['neutron-bombs'],
    constructionCosts: { ...STANDARD_CONSTRUCTION_COSTS, interceptor: 4, cruiser: 4 },
    tradeRatio: 2,
    special: { mixedAction: { move: { move: 2, build: 1 }, build: { move: 1, build: 2 } } },
    source: '.second-dawn/faction-research/originals/NEW FACTIONS/02 Remaining Info Sheet and Rules of the new Factions/Heralds of Ragnarok rules Info sheet PRINT final.jpg',
    sources: { rules: '.second-dawn/faction-research/originals/NEW FACTIONS/02 Remaining Info Sheet and Rules of the new Factions/Heralds of Ragnarok rules Info sheet PRINT final.jpg', blueprints: '.second-dawn/faction-research/originals/NEW FACTIONS/01 Faction Board Sheets/13 Heralds of Ragnarok Board.png' },
  },
];
/** Compatibility catalog view. Base selection order and membership stay stable. */
export const BASE_FACTIONS: readonly BaseFaction[] = FACTION_REGISTRY.slice(0, 12);
export function getFaction(id: FactionId): BaseFaction {
  const faction = FACTION_REGISTRY.find((candidate) => candidate.id === id);
  if (!faction) throw new Error(`Faction is absent from this catalog: ${id}`);
  return faction;
}
export function listFactions(profileOrContentPack?: FactionProfile | string): readonly FactionDefinition[] {
  if (profileOrContentPack === 'base' || profileOrContentPack === 'expanded-v1')
    return listFactionsForProfile(profileOrContentPack);
  return profileOrContentPack
    ? FACTION_REGISTRY.filter(faction => faction.content.packId === profileOrContentPack)
    : FACTION_REGISTRY;
}
export function listFactionsForProfile(profile: FactionProfile): readonly FactionDefinition[] {
  return profile === 'base' ? FACTION_REGISTRY.slice(0, 12) : FACTION_REGISTRY;
}
export function factionAvailableInProfile(id: FactionId, profile: FactionProfile): boolean {
  return listFactionsForProfile(profile).some(faction => faction.id === id);
}
export const factionAllowedForProfile = factionAvailableInProfile;
export function seatPieceColor(seat: { readonly faction: FactionId; readonly pieceColor?: CivilizationColor }): CivilizationColor {
  return seat.pieceColor ?? getFaction(seat.faction).color;
}
export function tradeRates(
  faction: FactionId,
  from: keyof CatalogResources,
  to: keyof CatalogResources,
  rulesMode?: RulesMode,
): readonly TradeRate[] {
  if (from === to) return [];
  const definition = getFaction(faction);
  if (rulesMode === 'less-random-v1') {
    if (definition.species === 'terran' || faction === 'eridani' && from === 'money') return [{from,to,input:2,output:1},{from,to,input:3,output:2}];
    if (faction === 'eridani' || faction === 'mechanema') return [{from,to,input:2,output:1}];
  }
  return definition.tradeRates?.filter(rate => rate.from === from && rate.to === to)
    ?? [{ from, to, input: definition.tradeRatio, output: 1 }];
}
/** Cheapest exact payment for a requested received amount; null means the amount cannot be formed. */
export function tradeQuote(
  faction: FactionId,
  from: keyof CatalogResources,
  to: keyof CatalogResources,
  receive: number,
  rulesMode?: RulesMode,
): { readonly input: number; readonly output: number } | null {
  if (!Number.isSafeInteger(receive) || receive < 1) return null;
  const rates = tradeRates(faction, from, to, rulesMode);
  const one = Math.min(...rates.filter(rate => rate.output === 1).map(rate => rate.input));
  const two = Math.min(...rates.filter(rate => rate.output === 2).map(rate => rate.input));
  let input: number;
  if (Number.isFinite(one) && Number.isFinite(two)) {
    const pairs = two < one * 2 ? Math.floor(receive / 2) : 0;
    input = pairs * two + (receive - pairs * 2) * one;
  } else if (Number.isFinite(one)) input = receive * one;
  else if (Number.isFinite(two) && receive % 2 === 0) input = receive / 2 * two;
  else return null;
  return Number.isSafeInteger(input) ? { input, output: receive } : null;
}
export function reputationDrawMoney(faction: FactionId, tilesDrawn: number): number {
  if (!Number.isSafeInteger(tilesDrawn) || tilesDrawn < 0) return 0;
  const minus = getFaction(faction).special?.reputationMoneyPerDrawMinus;
  return minus === undefined ? 0 : Math.max(0, tilesDrawn - minus);
}
export function isFactionId(value: string): value is FactionId {
  return FACTION_IDS.some(id => id === value);
}
export function factionHasCapability(id: FactionId, capability: FactionCapability): boolean {
  const abilities = getFaction(id).capabilities;
  switch (capability) {
    case 'ancient-coexistence': return abilities.ancientRelationship === 'coexist';
    case 'controlled-sector-vp': return abilities.endGameVp === 'controlled-sector';
    case 'surviving-ancient-vp': return abilities.endGameVp === 'surviving-ancient';
    case 'destroyed-population-when-occupied': return abilities.opponentPopulation === 'destroy';
    case 'choose-one-of-two-exploration-sectors': return abilities.exploration.draw === 2;
    case 'advanced-home-population': return abilities.advancedHomePopulation.length > 0;
  }
}
export function validateFactionSelection(ids: readonly FactionId[], pieceColors?: readonly CivilizationColor[]): string[] {
  const seen = new Set<CivilizationColor>();
  const errors: string[] = [];
  for (const [index, id] of ids.entries()) {
    const color = pieceColors?.[index] ?? getFaction(id).color;
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
