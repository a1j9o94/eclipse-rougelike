import { FRAMES, type Frame, type FrameId } from '../config/frames';
import type { Part } from '../config/parts';

export const isSource = (p:Part)=> p.cat === 'Source';
export const isDrive = (p:Part)=> p.cat === 'Drive';
export const isWeapon = (p:Part)=> p.cat === 'Weapon';
export const isComputer = (p:Part)=> p.cat === 'Computer';
export const isShield = (p:Part)=> p.cat === 'Shield';
export const isHull = (p:Part)=> p.cat === 'Hull';

// Safe frame lookup to avoid undefined access
export function getFrame(id: FrameId){
  const f = FRAMES[id];
  if(!f){
    console.warn("Unknown frame id", id);
    return FRAMES.interceptor; // fallback prevents undefined baseHull access
  }
  return f;
}

// Centralized validator for ship builds so configs can be checked anywhere
export function isValidShipBuild(frame: Frame, parts: Part[]): boolean {
  if(!frame){ return false; }
  const hasDrive = !!parts.find(isDrive);
  const sources = parts.filter(isSource);
  const powerProd = sources.reduce((a:number,s:Part)=>a+(s.powerProd||0),0);
  const powerUse = parts.reduce((a:number,p:Part)=>a+(p.powerCost||0),0);
  const tilesOk = parts.length <= frame.tiles;
  return hasDrive && sources.length>0 && powerUse <= powerProd && tilesOk;
}

export function sizeRank(frame:{id:string}) { return frame.id === 'dread' ? 3 : frame.id === 'cruiser' ? 2 : 1; }

export function makeShip(frame:Frame, parts:Part[]){
  // Defensive guard: ensure a valid frame object
  if(!frame || typeof frame.baseHull !== 'number'){
    console.warn('makeShip called with invalid frame', frame);
    frame = FRAMES.interceptor;
  }
  const weapons = parts.filter(isWeapon);
  const computer = parts.find(isComputer);
  const shield = parts.find(isShield);
  const hullParts = parts.filter(isHull);
  const drive = parts.find(isDrive);
  const sources = parts.filter(isSource);
  const hullCap = frame.baseHull + hullParts.reduce((a:number,h:Part)=>a+(h.extraHull||0),0);
  const powerProd = sources.reduce((a:number,s:Part)=>a+(s.powerProd||0),0);
  const powerUse = parts.reduce((a:number,p:Part)=>a+(p.powerCost||0),0);
  const valid = isValidShipBuild(frame, parts);
  // Aggregate stats from all relevant parts so hybrid items contribute (e.g., Sentient Hull adds aim and hull)
  const totalAim = parts.reduce((sum:number, p:Part)=> sum + (p.aim||0), 0);
  const totalShieldTier = parts.reduce((sum:number, p:Part)=> sum + (p.shieldTier||0), 0);
  const totalInit = parts.reduce((sum:number, p:Part)=> sum + (p.init||0), 0);
  const riftDice = parts.reduce((sum:number, p:Part)=> sum + (p.riftDice||0), 0);
  return { frame, parts, weapons, riftDice, computer, shield, hullParts, drive, sources,
    stats:{ hullCap, aim: totalAim, shieldTier: totalShieldTier, init: totalInit, powerProd, powerUse, valid },
    hull: hullCap, alive: true };
}

