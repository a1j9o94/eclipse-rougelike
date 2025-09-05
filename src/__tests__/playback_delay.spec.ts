import { describe, it, expect } from 'vitest';
import { computePlaybackDelay } from '../utils/playback';

describe('computePlaybackDelay', () => {
  it('grows with number of lines and caps', () => {
    const d1 = computePlaybackDelay(1);
    const d5 = computePlaybackDelay(5);
    const d50 = computePlaybackDelay(50);
    expect(d1).toBeLessThan(d5);
    expect(d5).toBeLessThanOrEqual(computePlaybackDelay(6));
    expect(d50).toBeLessThanOrEqual(8000);
  });
});

