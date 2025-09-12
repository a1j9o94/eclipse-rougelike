import { FRAMES, type FrameId } from '../../shared/frames';
import type { Ship } from '../../shared/types';

export function emptyShip(frameId: FrameId): Ship {
  const frame = FRAMES[frameId];
  return {
    frame,
    parts: [],
    weapons: [],
    riftDice: 0,
    stats: { init: 0, hullCap: frame.baseHull, powerUse: 0, powerProd: 0, valid: true, aim: 0, shieldTier: 0, regen: 0 },
    hull: frame.baseHull,
    alive: true,
  } as Ship;
}
