// Shared timing helpers for combat audiovisual sync

export const SHOT_BASE_MS = 1000; // round 1
export const SHOT_DECAY_MS = 200; // per round step
export const SHOT_MIN_MS = 100;   // floor

export function shotDurationMs(roundNum: number): number {
  const r = Math.max(1, Math.floor(roundNum || 1));
  return Math.max(SHOT_MIN_MS, SHOT_BASE_MS - (r - 1) * SHOT_DECAY_MS);
}

