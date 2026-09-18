import { describe, expect, it } from 'vitest';
import {
  BASE_FACTIONS,
  BASE_COMPONENTS,
  STARTING_LAYOUTS,
  SETUP_BY_PLAYER_COUNT,
  getFaction,
  validateFactionSelection,
} from '../../shared/eclipse/catalog';

describe('publisher-verified Second Dawn catalog', () => {
  it('offers twelve board sides on exactly six mutually exclusive physical colors', () => {
    expect(BASE_FACTIONS).toHaveLength(12);
    expect(new Set(BASE_FACTIONS.map((f) => f.color)).size).toBe(6);
    expect(validateFactionSelection(['eridani', 'terran-directorate'])).toEqual(
      ['duplicate-color:red'],
    );
    expect(validateFactionSelection(['eridani', 'hydran', 'planta'])).toEqual(
      [],
    );
  });
  it('uses Second Dawn starting resources and reserve influence discs', () => {
    expect(getFaction('eridani').startingResources).toEqual({
      materials: 4,
      science: 2,
      money: 26,
    });
    expect(getFaction('eridani').startingInfluenceDiscs).toBe(11);
    expect(getFaction('hydran').startingInfluenceDiscs).toBe(13);
  });
  it('sets home population only on basic squares, except Hydran advanced science', () => {
    const expected = [
      ['eridani', 0, 1, 1],
      ['hydran', 0, 1, 1],
      ['planta', 1, 1, 0],
      ['draco', 0, 1, 1],
      ['mechanema', 0, 1, 1],
      ['orion', 1, 1, 0],
    ] as const;
    for (const [id, materials, science, money] of expected) {
      expect(getFaction(id).startingPopulation).toEqual({
        materials,
        science,
        money,
      });
    }
    expect(getFaction('hydran').normalHomePopulation).toEqual({
      materials: 0,
      science: 0,
      money: 1,
    });
    expect(getFaction('hydran').advancedHomePopulation).toEqual({
      materials: 1,
      science: 1,
      money: 0,
    });
    expect(getFaction('terran-federation').startingPopulation).toEqual({
      materials: 1,
      science: 1,
      money: 1,
    });
    expect(getFaction('terran-federation').advancedHomePopulation).toEqual({
      materials: 0,
      science: 1,
      money: 1,
    });
  });
  it('preserves faction action and trade exceptions', () => {
    expect(getFaction('hydran').activations.research).toBe(2);
    expect(getFaction('planta').activations.explore).toBe(2);
    expect(getFaction('mechanema').activations.build).toBe(3);
    expect(getFaction('terran-federation').activations.move).toBe(3);
    expect(getFaction('orion').tradeRatio).toBe(4);
    expect(getFaction('orion').startingShip).toBe('cruiser');
  });
  it('distinguishes physical counts from rule-limited supplies', () => {
    expect(BASE_COMPONENTS.perColor).toEqual({
      interceptor: 8,
      cruiser: 4,
      dreadnought: 2,
      starbase: 4,
      population: 33,
      influence: 16,
      ambassador: 3,
    });
    expect(BASE_COMPONENTS.unlimited).toContain('ship-parts');
    expect(BASE_COMPONENTS.unlimited).toContain('orbitals');
    expect(BASE_COMPONENTS.unlimited).toContain('monoliths');
  });
  it('translates the official starting diagram without shifting guardian positions', () => {
    expect(
      STARTING_LAYOUTS[2]
        .filter((slot) => slot.occupant === 'player')
        .map((slot) => slot.direction),
    ).toEqual(['north', 'south']);
    expect(
      STARTING_LAYOUTS[3]
        .filter((slot) => slot.occupant === 'player')
        .map((slot) => slot.direction),
    ).toEqual(['north', 'southeast', 'southwest']);
    expect(
      STARTING_LAYOUTS[4]
        .filter((slot) => slot.occupant === 'guardian')
        .map((slot) => slot.direction),
    ).toEqual(['north', 'south']);
    expect(
      STARTING_LAYOUTS[5].find((slot) => slot.occupant === 'guardian')
        ?.direction,
    ).toBe('south');
    for (const [count, slots] of Object.entries(STARTING_LAYOUTS)) {
      expect(slots.filter((slot) => slot.occupant === 'player')).toHaveLength(
        Number(count),
      );
      for (const slot of slots) {
        expect(
          Math.max(
            Math.abs(slot.q),
            Math.abs(slot.r),
            Math.abs(slot.q + slot.r),
          ),
        ).toBe(2);
      }
    }
  });
  it('uses player-count setup and cleanup draws, excluding rares', () => {
    expect(
      Object.values(SETUP_BY_PLAYER_COUNT).map((s) => s.outerSectors),
    ).toEqual([5, 8, 14, 16, 18]);
    expect(
      Object.values(SETUP_BY_PLAYER_COUNT).map((s) => s.initialRegularTechs),
    ).toEqual([12, 14, 16, 18, 20]);
    expect(
      Object.values(SETUP_BY_PLAYER_COUNT).map((s) => s.cleanupRegularTechs),
    ).toEqual([5, 6, 7, 8, 9]);
  });
});
