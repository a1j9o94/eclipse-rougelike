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

export type LessRandomReputationAction = { type: "add" } | { type: "upgrade"; from: 1 | 2 | 3 };

/** Applies the public, finite-supply reputation economy without randomness. */
export function applyLessRandomReputation(
  owned: readonly number[],
  supply: readonly number[],
  capacity: number,
  draws: number,
  actions: readonly LessRandomReputationAction[],
): { kept: number[]; supply: number[]; spent: number } {
  const kept = [...owned], remaining = [...supply];
  let spent = 0;
  for (const action of actions) {
    const cost = action.type === "add" ? 1 : action.from;
    if (spent + cost > draws) throw new Error("Reputation actions exceed the awarded draws.");
    if (action.type === "add") {
      if (kept.length >= capacity) throw new Error("The reputation track has no empty space.");
      const one = remaining.indexOf(1);
      if (one < 0) throw new Error("No 1 VP reputation tile remains.");
      remaining.splice(one, 1); kept.push(1);
    } else {
      const held = kept.indexOf(action.from), next = remaining.indexOf(action.from + 1);
      if (held < 0) throw new Error(`No ${action.from} VP reputation tile can be upgraded.`);
      if (next < 0) throw new Error(`No ${action.from + 1} VP reputation tile remains.`);
      kept[held] = action.from + 1;
      remaining.splice(next, 1); remaining.push(action.from);
    }
    spent += cost;
  }
  return { kept, supply: remaining, spent };
}
