export interface Rng {
  // Returns a float in [0,1)
  next(): number
}

// Mulberry32 — small fast PRNG suitable for tests/determinism
// Source: https://stackoverflow.com/a/47593316 (public domain)
export function createRng(seed: number | string): Rng {
  let h = 0
  if (typeof seed === 'string') {
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(31, h) + seed.charCodeAt(i) | 0
    }
  } else {
    h = seed | 0
  }
  let t = (h + 0x6D2B79F5) | 0
  return {
    next() {
      t = (t + 0x6D2B79F5) | 0
      let x = Math.imul(t ^ (t >>> 15), 1 | t)
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296
    }
  }
}

export function fromMathRandom(): Rng {
  return { next: () => Math.random() }
}

