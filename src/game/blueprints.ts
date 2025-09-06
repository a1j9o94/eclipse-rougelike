import { type Part } from '../../shared/parts'
import { type FrameId, getFrame } from '../game'
import { makeShip } from '../game'
import type { Ship } from '../../shared/types'

export function applyBlueprintToFleet(frameId:FrameId, parts:Part[], fleet:Ship[]): Ship[] {
  return fleet.map(sh => sh.frame.id===frameId ? makeShip(sh.frame, parts) as unknown as Ship : sh);
}

export function canInstallOnClass(blueprints:Record<FrameId, Part[]>, frameId:FrameId, part:Part){
  const frame = getFrame(frameId);
  const nextParts = [...blueprints[frameId], part];
  const tmp = makeShip(frame, nextParts);
  const slotsUsed = nextParts.reduce((a,p)=>a+(p.slots||1),0);
  const tilesOk = slotsUsed <= frame.tiles;
  return { ok: tilesOk, tmp, slotsUsed, slotCap: frame.tiles };
}

export function updateBlueprint(
  blueprints:Record<FrameId, Part[]>,
  frameId:FrameId,
  mutate:(arr:Part[])=>Part[],
  allowInvalid:boolean = false
){
  const next = { ...blueprints } as Record<FrameId,Part[]>;
  const after = mutate(next[frameId]);
  const tmp = makeShip(getFrame(frameId), after);
  if(!allowInvalid && !tmp.stats.valid) return { blueprints, updated:false } as const;
  next[frameId] = after;
  return { blueprints: next, updated:true } as const;
}
