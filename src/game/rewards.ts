import { type Ship } from '../config/types'
import { calcRewardsForFrameId, ECONOMY } from '../config/economy'
import { makeShip, getFrame } from './ship'
import { type FrameId } from '../config/frames'
import { type Part } from '../config/parts'
import { type Resources, INITIAL_RESOURCES } from '../config/defaults'

export function calcRewards(enemy:Ship[], sector:number){
  let c=0,m=0,s=0;
  enemy.forEach(sh=>{ if(!sh || sh.alive) return; const rw = calcRewardsForFrameId(sh.frame.id); c+=rw.c; m+=rw.m; s+=rw.s; });
  const boss = sector % 5 === 0;
  const mult = 1 + Math.floor(Math.max(0, sector-1))*0.06;
  c = Math.floor(c*mult * (boss?1.25:1));
  if(boss){ s += 1; m += 1; }
  return { c, m, s };
}

export function graceRecoverFleet(fleet:Ship[], blueprints:Record<FrameId, Part[]>): Ship[]{
  return fleet.map(sh => makeShip(getFrame(sh.frame.id as FrameId), [ ...blueprints[sh.frame.id as FrameId] ]) ) as unknown as Ship[];
}

export function ensureGraceResources(resources:Resources): Resources{
  const minC = Math.max(ECONOMY.buildInterceptor.credits, INITIAL_RESOURCES.credits);
  const minM = Math.max(ECONOMY.buildInterceptor.materials, INITIAL_RESOURCES.materials);
  return {
    ...resources,
    credits: Math.max(resources.credits, minC),
    materials: Math.max(resources.materials, minM)
  };
}


