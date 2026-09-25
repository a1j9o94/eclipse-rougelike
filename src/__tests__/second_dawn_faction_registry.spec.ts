import { describe, expect, it } from 'vitest';
import {
  BASE_FACTIONS,
  CATALOG_VERSION,
  FACTION_REGISTRY,
  RULES_VERSION,
  factionHasCapability,
  getFaction,
  isFactionId,
  listFactions,
} from '../../shared/eclipse/catalog';
import { blueprintDefinition } from '../../shared/eclipse/blueprints';
import { calculateScore } from '../../shared/eclipse/scoring';
import { createGame } from '../../shared/eclipse/setup';

describe('Second Dawn faction registry', () => {
  it('keeps the persisted base catalog identity and order stable', () => {
    expect(listFactions()).toBe(FACTION_REGISTRY);
    expect(BASE_FACTIONS).toEqual(FACTION_REGISTRY.slice(0, 12));
    expect(listFactions('second-dawn-base')).toEqual(BASE_FACTIONS);
    expect(listFactions('future-drive-pack')).toEqual([]);
    expect(listFactions().map(faction => faction.id)).toEqual([
      'eridani', 'hydran', 'planta', 'draco', 'mechanema', 'orion',
      'terran-directorate', 'terran-federation', 'terran-union',
      'terran-republic', 'terran-conglomerate', 'terran-alliance',
      'rho-indi', 'magellan', 'midas', 'ragnarok', 'exiles', 'lyra',
    ]);
    expect(RULES_VERSION).toBe('second-dawn-base-2021-04-27');
    expect(CATALOG_VERSION).toBe('second-dawn-catalog-0.1');
    expect(isFactionId('draco')).toBe(true);
    expect(isFactionId('community-faction')).toBe(false);
  });

  it('keeps existing snapshots on IDs and pinned versions without embedding registry data', () => {
    const state = createGame({
      seed: 91,
      warpPortals: false,
      seats: [
        { id: 'p1', faction: 'eridani', controller: 'human' },
        { id: 'p2', faction: 'hydran', controller: 'ai' },
      ],
    });
    const persisted = JSON.parse(JSON.stringify(state)) as typeof state;
    expect(persisted.rulesVersion).toBe('second-dawn-base-2021-04-27');
    expect(persisted.catalogVersion).toBe('second-dawn-catalog-0.1');
    expect(persisted.seats.map(seat => seat.faction)).toEqual(['eridani', 'hydran']);
    expect(Object.keys(persisted.seats[0])).not.toContain('capabilities');
    expect(Object.keys(persisted.seats[0])).not.toContain('blueprintsDefinition');
  });

  it('declares provenance and visual identity independently from board color', () => {
    const eridani = getFaction('eridani');
    const terran = getFaction('terran-directorate');
    expect(eridani.content).toEqual({
      packId: 'second-dawn-base',
      kind: 'official',
      edition: 'second-edition',
      authority: 'publisher',
    });
    expect(eridani.emblem).toBe('eridani');
    expect(eridani.shipDesignFamily).toBe('eridani');
    expect(terran.color).toBe(eridani.color);
    expect(terran.emblem).toBe('eridani');
    expect(terran.shipDesignFamily).toBe('eridani');
    expect(eridani.sources.rules).toBe(eridani.source);
  });

  it('exposes typed behavior capabilities used by rules and AI', () => {
    expect(factionHasCapability('draco', 'ancient-coexistence')).toBe(true);
    expect(factionHasCapability('planta', 'ancient-coexistence')).toBe(false);
    expect(getFaction('draco').capabilities.exploration).toEqual({ draw: 2, keep: 1 });
    expect(getFaction('planta').capabilities.endGameVp).toBe('controlled-sector');
    expect(getFaction('draco').capabilities.endGameVp).toBe('surviving-ancient');
    expect(getFaction('planta').capabilities.opponentPopulation).toBe('destroy');
    expect(getFaction('hydran').capabilities.advancedHomePopulation).toEqual(['science']);
    expect(getFaction('orion').capabilities.reputationSlots).toBe(5);
    expect(getFaction('hydran').capabilities.dedicatedAmbassadorSlots).toBe(1);
    expect(getFaction('eridani').capabilities.dedicatedAmbassadorSlots).toBe(0);
  });

  it('owns the unchanged printed blueprints as registry data', () => {
    expect(getFaction('planta').blueprints.interceptor.preprinted).toEqual([
      'ion-cannon', 'nuclear-source', 'nuclear-drive',
    ]);
    expect(getFaction('orion').blueprints.cruiser).toMatchObject({
      preprinted: ['electron-computer', 'ion-cannon', 'hull', 'nuclear-source', 'nuclear-drive', 'gauss-shield'],
      permanent: { energyProduction: 2, initiative: 2, computer: 0 },
    });
    expect(blueprintDefinition('eridani', 'dreadnought')).toEqual(
      getFaction('eridani').blueprints.dreadnought,
    );
  });

  it('matches the complete base alien blueprint snapshot', () => {
    const snapshot = BASE_FACTIONS.filter(faction => faction.species === 'alien').map(faction => [
      faction.id,
      ...(['interceptor', 'cruiser', 'dreadnought', 'starbase'] as const).map(shipType => {
        const definition = faction.blueprints[shipType];
        return `${shipType}:${definition.preprinted.map(part => part ?? '-').join(',')}|${definition.permanent.energyProduction}/${definition.permanent.initiative}/${definition.permanent.computer}`;
      }),
    ]);
    expect(snapshot).toEqual([
      ['eridani', 'interceptor:ion-cannon,nuclear-source,nuclear-drive,-|1/2/0', 'cruiser:electron-computer,ion-cannon,hull,nuclear-source,nuclear-drive,-|1/1/0', 'dreadnought:electron-computer,ion-cannon,ion-cannon,hull,hull,nuclear-source,nuclear-drive,-|1/0/0', 'starbase:electron-computer,ion-cannon,-,hull,hull|3/3/0'],
      ['hydran', 'interceptor:ion-cannon,nuclear-source,nuclear-drive,-|0/2/0', 'cruiser:electron-computer,ion-cannon,hull,nuclear-source,nuclear-drive,-|0/1/0', 'dreadnought:electron-computer,ion-cannon,ion-cannon,hull,hull,nuclear-source,nuclear-drive,-|0/0/0', 'starbase:electron-computer,ion-cannon,-,hull,hull|3/3/0'],
      ['planta', 'interceptor:ion-cannon,nuclear-source,nuclear-drive|2/0/1', 'cruiser:ion-cannon,hull,nuclear-source,nuclear-drive,-|2/0/1', 'dreadnought:ion-cannon,ion-cannon,hull,hull,nuclear-source,nuclear-drive,-|2/0/1', 'starbase:electron-computer,ion-cannon,hull,hull|5/2/1'],
      ['draco', 'interceptor:ion-cannon,nuclear-source,nuclear-drive,-|0/2/0', 'cruiser:electron-computer,ion-cannon,hull,nuclear-source,nuclear-drive,-|0/1/0', 'dreadnought:electron-computer,ion-cannon,ion-cannon,hull,hull,nuclear-source,nuclear-drive,-|0/0/0', 'starbase:electron-computer,ion-cannon,-,hull,hull|3/3/0'],
      ['mechanema', 'interceptor:ion-cannon,nuclear-source,nuclear-drive,-|0/2/0', 'cruiser:electron-computer,ion-cannon,hull,nuclear-source,nuclear-drive,-|0/1/0', 'dreadnought:electron-computer,ion-cannon,ion-cannon,hull,hull,nuclear-source,nuclear-drive,-|0/0/0', 'starbase:electron-computer,ion-cannon,-,hull,hull|3/3/0'],
      ['orion', 'interceptor:ion-cannon,nuclear-source,nuclear-drive,gauss-shield|1/3/0', 'cruiser:electron-computer,ion-cannon,hull,nuclear-source,nuclear-drive,gauss-shield|2/2/0', 'dreadnought:electron-computer,ion-cannon,ion-cannon,hull,hull,nuclear-source,nuclear-drive,gauss-shield|3/1/0', 'starbase:electron-computer,ion-cannon,gauss-shield,hull,hull|3/4/0'],
    ]);
  });

  it('derives faction scoring through the registry without changing totals', () => {
    const base = {
      playerId: 'p1', reputation: [], ambassadors: 0,
      sectors: [{ id: '101', printedVp: 2, monoliths: 0, portalVp: 0 as const }],
      discoveriesKeptForVp: 0, traitor: false,
      researchTracks: [0, 0, 0] as [number, number, number],
      ancientsOnBoard: 3,
      resources: { materials: 0, science: 0, money: 0 },
    };
    expect(calculateScore({ ...base, faction: 'planta' }).species).toBe(1);
    expect(calculateScore({ ...base, faction: 'draco' }).species).toBe(3);
    expect(calculateScore({ ...base, faction: 'hydran' }).species).toBe(0);
  });
});
