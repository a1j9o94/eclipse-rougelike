import { describe, expect, it } from 'vitest';
import { randomInt, shuffle, randomSeed } from '../../shared/eclipse/random';

describe('persisted Second Dawn randomness', () => {
  it('replays identically from a serialized stream and never changes its input', () => {
    const seed = randomSeed(42);
    const first = randomInt(seed, 6);
    expect(seed).toEqual({ algorithm: 'mulberry32-v1', value: 42, draws: 0 });
    const saved = JSON.parse(JSON.stringify(first.state));
    expect(randomInt(saved, 6)).toEqual(randomInt(first.state, 6));
    expect(first.state.draws).toBeGreaterThan(seed.draws);
  });
  it('preserves every finite supply item in a deterministic shuffle', () => {
    const supply = ['a', 'a', 'b', 'c', 'd', 'e'];
    const a = shuffle(randomSeed(12), supply);
    const b = shuffle(randomSeed(12), supply);
    expect(a).toEqual(b);
    expect([...a.items].sort()).toEqual([...supply].sort());
    expect(supply).toEqual(['a', 'a', 'b', 'c', 'd', 'e']);
    expect(a.items).not.toBe(supply);
  });
  it('supports every uint32 seed, including zero, with a fixed replay vector', () => {
    let state = randomSeed(0);
    const rolls = Array.from({ length: 6 }, () => {
      const result = randomInt(state, 6);
      state = result.state;
      return result.value;
    });
    // Independently calculated with uint32 arithmetic, modulo rejection sampling.
    expect(rolls).toEqual([2, 1, 4, 0, 0, 5]);
    expect(randomSeed(0xffffffff).value).toBe(0xffffffff);
  });
  it('rejects invalid seeds, corrupted streams and invalid bounds', () => {
    for (const seed of [-1, 2 ** 32, 1.5, NaN, Infinity])
      expect(() => randomSeed(seed)).toThrow();
    for (const bound of [0, -1, 1.5, NaN, Infinity, 2 ** 32 + 1]) {
      expect(() => randomInt(randomSeed(7), bound)).toThrow();
    }
    expect(() =>
      randomInt({ algorithm: 'mulberry32-v1', value: -1, draws: 0 }, 6),
    ).toThrow();
  });
  it('uses independent streams for simulations', () => {
    const authoritative = randomSeed(9);
    shuffle(
      randomSeed(800),
      Array.from({ length: 100 }, (_, i) => i),
    );
    expect(randomInt(authoritative, 6)).toEqual(randomInt(randomSeed(9), 6));
  });
});
