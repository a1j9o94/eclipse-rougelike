import { type Part } from '../config/parts'
import { type FrameId, getFrame } from '../game'
import { makeShip } from '../game'
import type { Ship } from '../config/types'

export function applyBlueprintToFleet(frameId:FrameId, parts:Part[], fleet:Ship[]): Ship[] {
  return fleet.map(sh => sh.frame.id===frameId ? makeShip(sh.frame, parts) as unknown as Ship : sh);
}

export function canInstallOnClass(blueprints:Record<FrameId, Part[]>, frameId:FrameId, part:Part){
  const tmp = makeShip(getFrame(frameId), [...blueprints[frameId], part]);
  return { ok: tmp.stats.valid, tmp };
}

export function updateBlueprint(
  blueprints:Record<FrameId, Part[]>,
  frameId:FrameId,
  mutate:(arr:Part[])=>Part[]
){
  const next = { ...blueprints } as Record<FrameId,Part[]>;
  const after = mutate(next[frameId]);
  const tmp = makeShip(getFrame(frameId), after);
  if(!tmp.stats.valid) return { blueprints, updated:false } as const;
  next[frameId] = after;
  return { blueprints: next, updated:true } as const;
}


