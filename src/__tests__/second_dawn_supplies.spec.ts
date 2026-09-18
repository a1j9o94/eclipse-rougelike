import { describe, expect, it } from 'vitest';
import {
  createTechnologyBag,
  drawTechnologies,
  prepareSectorStacks,
} from '../../shared/eclipse/supplies';
import { randomSeed } from '../../shared/eclipse/random';
import {
  BASE_COMPONENTS,
  SETUP_BY_PLAYER_COUNT,
  type PlayerCount,
} from '../../shared/eclipse/catalog';

describe('finite Second Dawn setup supplies', () => {
  it('creates exactly114 identifiable technology tiles with a reproducible order', () => {
    const a = createTechnologyBag(randomSeed(81));
    expect(a.tiles).toHaveLength(114);
    expect(new Set(a.tiles.map((tile) => tile.id)).size).toBe(114);
    expect(a).toEqual(createTechnologyBag(randomSeed(81)));
  });
  it('draws intervening rares without charging them against the regular quota', () => {
    const deck = [
      { id: 'a', technology: 'warp-portal' as const },
      { id: 'b', technology: 'starbase' as const },
      { id: 'c', technology: 'cloaking-device' as const },
      { id: 'd', technology: 'plasma-cannon' as const },
      { id: 'e', technology: 'gauss-shield' as const },
    ];
    const result = drawTechnologies(deck, 2);
    expect(result.drawn.map((tile) => tile.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.remaining.map((tile) => tile.id)).toEqual(['e']);
    expect(result.regularDrawn).toBe(2);
    expect(deck).toHaveLength(5);
  });
  it('exhausts a finite bag without inventing replacement tiles', () => {
    const result = drawTechnologies(
      [{ id: 'a', technology: 'warp-portal' }],
      12,
    );
    expect(result.drawn).toHaveLength(1);
    expect(result.remaining).toEqual([]);
    expect(result.regularDrawn).toBe(0);
  });
  it.each([2, 3, 4, 5, 6] as PlayerCount[])(
    'conserves every sector for %i players',
    (count) => {
      const result = prepareSectorStacks(randomSeed(90), count, true);
      expect(result.outer).toHaveLength(
        SETUP_BY_PLAYER_COUNT[count].outerSectors,
      );
      expect(result.inner).toHaveLength(10);
      expect(result.middle).toHaveLength(13);
      expect([...result.outer, ...result.outerInBox].sort()).toEqual(
        [...BASE_COMPONENTS.sectorIds.outer].sort(),
      );
      expect(result).toEqual(prepareSectorStacks(randomSeed(90), count, true));
      expect(new Set(result.outer).size).toBe(result.outer.length);
    },
  );
  it('removes only optional base warp sectors before shuffling when disabled', () => {
    const result = prepareSectorStacks(randomSeed(0), 6, false);
    expect(result.middle).toHaveLength(12);
    expect(result.outer).toHaveLength(18);
    expect(result.outerInBox).toEqual([]);
    for (const id of [281, 381, 382])
      expect([...result.middle, ...result.outer]).not.toContain(id);
    expect(result.excluded).toEqual([281, 381, 382]);
  });
  it('rejects invalid draw quotas', () => {
    for (const quota of [-1, NaN, 1.5, Infinity])
      expect(() => drawTechnologies([], quota)).toThrow();
  });
});

it('excludes the optional warp technology before shuffling when the module is disabled', () => {
  const result = createTechnologyBag(randomSeed(12), false);
  expect(result.tiles).toHaveLength(113);
  expect(result.tiles.some((tile) => tile.technology === 'warp-portal')).toBe(
    false,
  );
  expect(result.excluded.map((tile) => tile.technology)).toEqual([
    'warp-portal',
  ]);
});
