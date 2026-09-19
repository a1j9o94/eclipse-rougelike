import { describe, expect, it } from 'vitest';
import { BASE_FACTIONS } from '../../shared/eclipse/catalog';
import { SHIP_PARTS as ALL_SHIP_PARTS, getShipPart } from '../../shared/eclipse/parts';
import { blueprintDefinition, deriveBlueprintStats, initialBlueprints, validateBlueprint, neutralBlueprint, NEUTRAL_BLUEPRINTS, type ShipBlueprint } from '../../shared/eclipse/blueprints';

const SHIP_PARTS = ALL_SHIP_PARTS.filter(item => !item.expansion);

describe('Second Dawn physical ship components', () => {
  it('has precisely five default, nineteen researched and fifteen ancient parts', () => {
    expect(SHIP_PARTS.filter(p => p.access.kind === 'default')).toHaveLength(5);
    expect(SHIP_PARTS.filter(p => p.access.kind === 'technology')).toHaveLength(19);
    expect(SHIP_PARTS.filter(p => p.access.kind === 'ancient')).toHaveLength(15);
    expect(new Set(SHIP_PARTS.map(p => p.id)).size).toBe(39);
  });
  it('uses Second Dawn plasma missile energy and zero-energy transition drives', () => {
    expect(getShipPart('plasma-missile')).toMatchObject({ energyConsumption: 1, weapons: [{ kind: 'missile', color: 'orange', dice: 2, damage: 2 }] });
    expect(getShipPart('transition-drive')).toMatchObject({ movement: 3, initiative: 0, energyConsumption: 0 });
    expect(getShipPart('nonlinear-drive')).toMatchObject({ movement: 2, energyProduction: 2 });
    expect(getShipPart('muon-source')).toMatchObject({ placement: 'outside', initiative: 1, energyProduction: 2 });
  });
  it('starts every faction with valid, independently allocated overlays', () => {
    for (const faction of BASE_FACTIONS) {
      const blueprints = initialBlueprints(faction.id);
      expect(blueprints).toHaveLength(4);
      for (const blueprint of blueprints) expect(validateBlueprint(faction.id, blueprint, [], [])).toEqual([]);
      blueprints[0].parts[0] = 'hull';
      expect(initialBlueprints(faction.id)[0].parts[0]).toBeNull();
    }
  });
  it('preserves standard starbase initiative three and printed parts when an overlay is returned', () => {
    const blueprint = initialBlueprints('hydran')[3];
    expect(deriveBlueprintStats('hydran', blueprint)).toMatchObject({ initiative: 3, hull: 2, computer: 1, energyProduction: 3, energyConsumption: 1 });
    const cruiser = initialBlueprints('hydran')[1];
    cruiser.parts[0] = 'gluon-computer';
    expect(deriveBlueprintStats('hydran', cruiser).computer).toBe(3);
    cruiser.parts[0] = null;
    expect(deriveBlueprintStats('hydran', cruiser).computer).toBe(1);
  });
  it('applies Orion printed shields and Planta reduced grids/permanent computers', () => {
    expect(initialBlueprints('planta').map(p => p.parts.length)).toEqual([3, 5, 7, 4]);
    expect(initialBlueprints('orion').map(p => deriveBlueprintStats('orion', p).shield)).toEqual([1, 1, 1, 1]);
    expect(initialBlueprints('orion').map(p => deriveBlueprintStats('orion', p).initiative)).toEqual([4, 3, 2, 4]);
    expect(initialBlueprints('planta').map(p => deriveBlueprintStats('planta', p).computer)).toEqual([1, 1, 1, 2]);
    expect(blueprintDefinition('eridani', 'dreadnought').permanent.energyProduction).toBe(1);
  });
  it('rejects energy deficits, missing mobile drives, starbase drives and unresearched parts', () => {
    const interceptor = initialBlueprints('hydran')[0];
    interceptor.parts[1] = 'antimatter-cannon';
    expect(validateBlueprint('hydran', interceptor, [], []).map(e => e.code)).toEqual(expect.arrayContaining(['ENERGY_DEFICIT', 'TECHNOLOGY_REQUIRED']));
    interceptor.parts[2] = 'hull';
    expect(validateBlueprint('hydran', interceptor, ['antimatter-cannon'], []).map(e => e.code)).toContain('DRIVE_REQUIRED');
    const base = initialBlueprints('hydran')[3]; base.parts[2] = 'transition-drive';
    expect(validateBlueprint('hydran', base, ['transition-drive'], []).map(e => e.code)).toContain('STARBASE_DRIVE');
  });
  it('enforces exact slots and ancient ownership without mutating drafts', () => {
    const draft: ShipBlueprint = { shipType: 'interceptor', parts: ['ion-disruptor', null, null, null, null], outsideParts: [] };
    const before = JSON.stringify(draft);
    expect(validateBlueprint('hydran', draft, [], []).map(e => e.code)).toEqual(expect.arrayContaining(['SLOT_COUNT', 'ANCIENT_PART_UNAVAILABLE']));
    expect(JSON.stringify(draft)).toBe(before);
  });
  it('keeps all nine neutral variants distinct and separates missiles from repeated cannon fire', () => {
    expect(NEUTRAL_BLUEPRINTS).toHaveLength(9);
    expect(NEUTRAL_BLUEPRINTS.filter(b => !b.advanced)).toHaveLength(3);
    expect(neutralBlueprint('gcds-standard').stats).toMatchObject({ hull: 7, initiative: 0, computer: 2, weapons: [{ kind: 'cannon', color: 'yellow', dice: 4, damage: 1 }] });
    expect(neutralBlueprint('guardian-advanced-missile').stats.weapons).toEqual([{ kind: 'missile', color: 'orange', dice: 2, damage: 2 }, { kind: 'cannon', color: 'red', dice: 1, damage: 4 }]);
    expect(neutralBlueprint('ancient-advanced-computer').stats).toMatchObject({ initiative: 3, computer: 2, hull: 1 });
  });
  it('permits Eridani plasma and fusion upgrades exactly at its energy budget', () => {
    const draft = initialBlueprints('eridani')[0];
    draft.parts[0] = 'plasma-cannon'; draft.parts[2] = 'fusion-drive';
    expect(validateBlueprint('eridani', draft, ['plasma-cannon', 'fusion-drive'], [])).toEqual([]);
    expect(deriveBlueprintStats('eridani', draft)).toMatchObject({ energyProduction: 4, energyConsumption: 4, initiative: 4, movement: 2 });
    expect(validateBlueprint('hydran', draft, ['plasma-cannon', 'fusion-drive'], []).map(e => e.code)).toContain('ENERGY_DEFICIT');
  });
  it('Muon is outside the grid, unique, and cannot be removed once installed', () => {
    const draft = initialBlueprints('hydran')[0]; draft.outsideParts = ['muon-source'];
    expect(validateBlueprint('hydran', draft, [], ['muon-source'])).toEqual([]);
    expect(deriveBlueprintStats('hydran', draft)).toMatchObject({ energyProduction: 5, initiative: 4 });
    const removed = { ...draft, outsideParts: [] };
    expect(validateBlueprint('hydran', removed, [], ['muon-source'], draft).map(e => e.code)).toContain('PERMANENT_PART_REMOVED');
    draft.parts[3] = 'muon-source';
    expect(validateBlueprint('hydran', draft, [], ['muon-source']).map(e => e.code)).toEqual(expect.arrayContaining(['PART_PLACEMENT', 'ANCIENT_PART_UNAVAILABLE']));
  });
});
