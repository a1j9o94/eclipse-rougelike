import type { WeaponColor } from './parts';

/** Numeric representation of standard blank (1), numbered faces and burst (6).
 * Rift dice use these as stable face indices, not printed numbers. */
export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;
export interface RiftDieOutcome { damage: number; backfire: number }
/** Publisher Rift Cannon rules p1: two blanks, 1, 2, 3+self, self. */
export function riftDieOutcome(face: number): RiftDieOutcome {
  if (!Number.isInteger(face) || face < 1 || face > 6) throw new RangeError('Invalid Rift die face.');
  return { damage: face === 3 ? 1 : face === 4 ? 2 : face === 5 ? 3 : 0, backfire: face >= 5 ? 1 : 0 };
}
export function attackDieHits(die: { face: number; computer: number; weaponColor?: WeaponColor }, shield: number): boolean {
  return die.weaponColor === 'magenta' ? riftDieOutcome(die.face).damage > 0 : dieHits(die.face as DieFace, die.computer, shield);
}
export interface RiftBackfireTarget { id: string; hp: number; size: number }
/** Targets must already be restricted to friendly Rift-equipped ships in this sector.
 * Damage is pooled: destroy largest killable ships before wounding largest survivors. */
export function allocateRiftBackfire(targets: readonly RiftBackfireTarget[], amount: number): { targetId: string; damage: number }[] {
  const remaining = targets.filter(t => t.hp > 0).map(t => ({...t})).sort((a,b) => b.size-a.size || a.id.localeCompare(b.id));
  const result: {targetId: string; damage: number}[] = [];
  while (amount > 0 && remaining.length) {
    const index = remaining.findIndex(t => t.hp <= amount);
    const target = remaining.splice(index < 0 ? 0 : index, 1)[0];
    const damage = Math.min(amount, target.hp);
    result.push({targetId: target.id, damage});
    amount -= damage;
  }
  return result;
}
export interface AttackDie {
  readonly id: string;
  readonly face: DieFace;
  readonly damage: number;
  readonly computer: number;
  readonly weaponColor?: WeaponColor;
}
export interface CombatTarget {
  readonly id: string;
  readonly hull: number;
  readonly damage: number;
  /** Positive magnitude of shield penalty. */
  readonly shield: number;
}
export interface DamageAssignment {
  readonly dieId: string;
  readonly targetId: string;
}
export interface DamagedTarget extends CombatTarget {
  readonly destroyed: boolean;
}
export type DamageAllocationResult =
  | { readonly ok: true; readonly targets: readonly DamagedTarget[] }
  | {
      readonly ok: false;
      readonly code:
        | 'invalid-die'
        | 'duplicate-die'
        | 'invalid-target'
        | 'unassigned-die';
      readonly message: string;
    };
export function dieHits(
  face: DieFace,
  computer: number,
  shield: number,
): boolean {
  return face === 6 || (face !== 1 && face + computer - shield >= 6);
}
/** Standard unsplit weapons only; Antimatter Splitter needs a separate allocation contract. */
export function resolveDamageAllocation(
  dice: readonly AttackDie[],
  targets: readonly CombatTarget[],
  assignments: readonly DamageAssignment[],
): DamageAllocationResult {
  const allocated = new Set<string>();
  const damage = new Map<string, number>();
  for (const assignment of assignments) {
    if (allocated.has(assignment.dieId))
      return {
        ok: false,
        code: 'duplicate-die',
        message: 'A die cannot be split or assigned more than once.',
      };
    const die = dice.find((d) => d.id === assignment.dieId);
    if (!die)
      return {
        ok: false,
        code: 'invalid-die',
        message: 'Only dice from this attack may be assigned.',
      };
    const target = targets.find((t) => t.id === assignment.targetId);
    if (!target || target.damage > target.hull)
      return {
        ok: false,
        code: 'invalid-target',
        message: 'Assign dice to a surviving opponent ship in this battle.',
      };
    allocated.add(die.id);
    if (attackDieHits(die, target.shield))
      damage.set(target.id, (damage.get(target.id) ?? 0) + die.damage);
  }
  if (dice.some((d) => !allocated.has(d.id)))
    return {
      ok: false,
      code: 'unassigned-die',
      message: 'Assign every attack die to one target.',
    };
  return {
    ok: true,
    targets: targets.map((target) => {
      const totalDamage = target.damage + (damage.get(target.id) ?? 0);
      return {
        ...target,
        damage: totalDamage,
        destroyed: totalDamage > target.hull,
      };
    }),
  };
}
export interface InitiativeEntry {
  readonly id: string;
  readonly owner: string;
  readonly initiative: number;
}
/** Entries represent ship types. Each multi-entry group requires its owner's ordering choice. */
export function initiativeGroups(
  entries: readonly InitiativeEntry[],
  defender: string,
): readonly (readonly string[])[] {
  const sorted = [...entries].sort(
    (a, b) =>
      b.initiative - a.initiative ||
      Number(b.owner === defender) - Number(a.owner === defender),
  );
  const result: string[][] = [];
  let previous: InitiativeEntry | undefined;
  for (const entry of sorted) {
    if (
      previous &&
      previous.initiative === entry.initiative &&
      previous.owner === entry.owner
    )
      result[result.length - 1].push(entry.id);
    else result.push([entry.id]);
    previous = entry;
  }
  return result;
}
