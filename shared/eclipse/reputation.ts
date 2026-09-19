/** Keep at most one new tile; preserve an existing tile when its value ties. */
export function bestReputation(owned: readonly number[], drawn: readonly number[], capacity: number): {
  selected: number | null;
  kept: number[];
  returned: number[];
} {
  const bestIndex = drawn.reduce((best, value, index) => best < 0 || value > drawn[best] ? index : best, -1);
  const candidates = [
    ...owned.map((value, index) => ({ value, index, drawn: false })),
    ...(bestIndex >= 0 ? [{ value: drawn[bestIndex], index: bestIndex, drawn: true }] : []),
  ].sort((a, b) => b.value - a.value || Number(a.drawn) - Number(b.drawn));
  const kept = candidates.slice(0, Math.max(0, capacity));
  const retainedOwned = new Set(kept.filter(tile => !tile.drawn).map(tile => tile.index));
  const selected = kept.find(tile => tile.drawn);
  return {
    selected: selected?.value ?? null,
    kept: kept.map(tile => tile.value),
    returned: [
      ...owned.filter((_, index) => !retainedOwned.has(index)),
      ...drawn.filter((_, index) => index !== selected?.index),
    ],
  };
}
