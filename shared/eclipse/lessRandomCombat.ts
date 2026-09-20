import { riftDieOutcome } from "./combat";
import type { BattleState } from "./types";

export type CombatDie = NonNullable<BattleState["dice"]>[number];

/** Exact face counts transcribed from the two Super Joker tables in the 20 May 2026 rules. */
const FACE_COUNTS: readonly (readonly [number, number, number, number, number, number])[] = [
  [0,0,1,0,0,0],[0,0,1,1,0,0],[1,0,0,1,1,0],[1,0,0,2,1,0],[1,1,0,1,2,0],
  [1,1,1,1,1,1],[1,1,2,1,1,1],[1,1,2,2,1,1],[2,1,1,2,2,1],[2,1,1,3,2,1],
  [2,2,1,2,3,1],[2,2,2,2,2,2],[2,2,3,2,2,2],[2,2,3,3,2,2],[3,2,2,3,3,2],
  [3,2,2,4,3,2],[3,3,2,3,4,2],[3,3,3,3,3,3],[3,3,4,3,3,3],[3,3,4,4,3,3],
  [4,3,3,4,4,3],[4,3,3,5,4,3],[4,4,3,4,5,3],[4,4,4,4,4,4],[4,4,5,4,4,4],
  [4,4,5,5,4,4],[5,4,4,5,5,4],[5,4,4,6,5,4],[5,5,4,5,6,4],[5,5,5,5,5,5],
  [5,5,6,5,5,5],[5,5,6,6,5,5],[6,5,5,6,6,5],[6,5,5,7,6,5],[6,6,5,6,7,5],
  [6,6,6,6,6,6],[6,6,7,6,6,6],[6,6,7,7,6,6],[7,6,6,7,7,6],[7,6,6,8,7,6],
  [7,7,6,7,8,6],[7,7,7,7,7,7],[7,7,8,7,7,7],[7,7,8,8,7,7],[8,7,7,8,8,7],
  [8,7,7,9,8,7],[8,8,7,8,9,7],[8,8,8,8,8,8],[8,8,9,8,8,8],[8,8,9,9,8,8],
];

export function superJokerFaces(diceCount: number): number[] | null {
  if (!Number.isInteger(diceCount) || diceCount < 1 || diceCount > FACE_COUNTS.length) return null;
  return FACE_COUNTS[diceCount - 1].flatMap((count, face) => Array<number>(count).fill(face + 1));
}

/** Keeps each die's source, color, hit value and damage class; only its physical face changes. */
export function substituteSuperJokerDice(dice: readonly CombatDie[]): CombatDie[] {
  const faces = superJokerFaces(dice.length);
  if (!faces) throw new Error("The Super Joker table supports volleys of 1 to 50 dice.");
  return dice.map((die, index) => ({
    ...die,
    face: faces[index],
    damage: die.weaponColor === "magenta" ? riftDieOutcome(faces[index]).damage : die.damage,
  }));
}
