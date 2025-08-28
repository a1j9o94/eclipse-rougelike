import { type Part } from '../config/parts'
import { type FrameId, getFrame } from '../game'
import { makeShip } from '../game'
import type { Ship } from '../config/types'

export function canBuildInterceptor(resources:{credits:number, materials:number}, capacity:{cap:number}, tonnageUsed:number){
  const cost = { c:2, m:3 };
  const fits = (tonnageUsed + getFrame('interceptor').tonnage) <= capacity.cap;
  const afford = resources.credits>=cost.c && resources.materials>=cost.m;
  return { ok: fits && afford, cost };
}

export function buildInterceptor(blueprints:Record<FrameId, Part[]>, resources:{credits:number, materials:number},  tonnageUsed:number, capacity:{cap:number}){
  const chk = canBuildInterceptor(resources, capacity, tonnageUsed);
  if(!chk.ok) return null;
  const frameId:FrameId = 'interceptor';
  const newShip = makeShip(getFrame(frameId), [ ...blueprints[frameId] ]);
  const delta = { credits: -chk.cost.c, materials: -chk.cost.m };
  return { ship: newShip as unknown as Ship, delta };
}

export function canUpgrade(frameId:FrameId, research:{Military:number}){
  if(frameId==='interceptor') return { ok: (research.Military||1)>=2, need:2, next:'cruiser' as FrameId };
  if(frameId==='cruiser') return { ok: (research.Military||1)>=3, need:3, next:'dread' as FrameId };
  return { ok:false, need:99, next:null as unknown as FrameId };
}

export function upgradeShipAt(idx:number, fleet:Ship[], blueprints:Record<FrameId, Part[]>, resources:{credits:number, materials:number}, research:{Military:number}, capacity:{cap:number}, tonnageUsed:number){
  const s = fleet[idx]; if(!s) return null;
  const step = canUpgrade(s.frame.id as FrameId, research);
  if(!step.ok || !step.next) return null;
  const nextId = step.next;
  const cost = s.frame.id === 'interceptor' ? {c:3,m:3} : {c:4,m:5};
  const deltaTons = getFrame(nextId).tonnage - s.frame.tonnage;
  if((tonnageUsed + deltaTons) > capacity.cap) return null;
  if(resources.credits < cost.c || resources.materials < cost.m) return null;
  const upgraded = makeShip(getFrame(nextId), [ ...blueprints[nextId as FrameId] ]);
  return { idx, upgraded: upgraded as unknown as Ship, delta:{ credits: -cost.c, materials: -cost.m } };
}

export function expandDock(resources:{credits:number, materials:number}, capacity:{cap:number}){
  const cost = { c:4, m:4 };
  if(resources.credits < cost.c || resources.materials < cost.m) return null;
  const nextCap = Math.min(10, capacity.cap + 2);
  return { nextCap, delta:{ credits: -cost.c, materials: -cost.m } };
}


