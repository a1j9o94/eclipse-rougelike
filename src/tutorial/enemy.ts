import { FRAMES } from '../../shared/frames';
import { PARTS } from '../../shared/parts';
import type { Ship } from '../../shared/types';
import { makeShip } from '../game/ship';

export function buildTutorialEnemyFleet(round: number): Ship[] {
  const count = Math.min(Math.max(round, 1), 3);
  const baseParts = [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0]];
  return Array.from({ length: count }, () => makeShip(FRAMES.interceptor, [...baseParts]) as unknown as Ship);
}
