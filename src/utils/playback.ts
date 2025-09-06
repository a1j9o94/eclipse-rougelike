export function computePlaybackDelay(lines: string[] | number): number {
  const n = Array.isArray(lines) ? lines.length : lines;
  const base = 1800; // initial pause
  const per = 350;   // per line pacing
  const max = 8000;  // cap to keep UX responsive
  return Math.min(max, base + per * Math.max(1, n));
}

