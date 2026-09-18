/** Replay algorithm is part of the persisted rules contract; never change it in place. */
export interface RandomState {
  algorithm: 'mulberry32-v1';
  value: number;
  draws: number;
}

export function randomSeed(value: number): RandomState {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError('Seed must be a uint32.');
  }
  return { algorithm: 'mulberry32-v1', value, draws: 0 };
}

function validateStream(state: RandomState): void {
  if (
    state.algorithm !== 'mulberry32-v1' ||
    !Number.isInteger(state.value) ||
    state.value < 0 ||
    state.value > 0xffffffff ||
    !Number.isSafeInteger(state.draws) ||
    state.draws < 0
  ) {
    throw new RangeError('Invalid random stream.');
  }
}

function nextWord(state: RandomState): { word: number; state: RandomState } {
  if (state.draws >= Number.MAX_SAFE_INTEGER)
    throw new RangeError('Random stream exhausted.');
  const value = (state.value + 0x6d2b79f5) >>> 0;
  let word = value;
  word = Math.imul(word ^ (word >>> 15), word | 1);
  word ^= word + Math.imul(word ^ (word >>> 7), word | 61);
  return {
    word: (word ^ (word >>> 14)) >>> 0,
    state: { ...state, value, draws: state.draws + 1 },
  };
}

/** Rejection sampling avoids modulo bias. Values are in [0, exclusiveMax). */
export function randomInt(
  input: RandomState,
  exclusiveMax: number,
): { value: number; state: RandomState } {
  validateStream(input);
  if (
    !Number.isInteger(exclusiveMax) ||
    exclusiveMax < 1 ||
    exclusiveMax > 2 ** 32
  ) {
    throw new RangeError('Random bound must be an integer between 1 and 2^32.');
  }
  const limit = Math.floor(2 ** 32 / exclusiveMax) * exclusiveMax;
  let next = nextWord(input);
  while (next.word >= limit) next = nextWord(next.state);
  return { value: next.word % exclusiveMax, state: next.state };
}

export function shuffle<T>(
  input: RandomState,
  supply: readonly T[],
): { items: T[]; state: RandomState } {
  validateStream(input);
  const items = [...supply];
  let state = input;
  for (let i = items.length - 1; i > 0; i--) {
    const next = randomInt(state, i + 1);
    state = next.state;
    [items[i], items[next.value]] = [items[next.value], items[i]];
  }
  return { items, state: { ...state } };
}
