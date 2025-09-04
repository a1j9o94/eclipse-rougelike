import { type Research, type Resources } from '../config/defaults'
import { type FrameId } from '../config/frames'
import { getFaction, type FactionId } from '../config/factions'
import { type Part } from '../config/parts'
import { getFrame, makeShip } from './ship'
import { rollInventory, setRareTechChance } from './shop'
import { setEconomyModifiers } from './economy'
import { getStartingShipCount, getBaseRerollCost, getInitialCapacityForDifficulty } from '../config/difficulty'
import { type DifficultyId } from '../config/types'

export type NewRunParams = { difficulty: DifficultyId; faction: FactionId };
export type NewRunState = {
  resources: Resources;
  research: Research;
  rerollCost: number;
  sector: number;
  blueprints: Record<FrameId, Part[]>;
  fleet: ReturnType<typeof makeShip>[];
  shopItems: Part[];
  capacity: { cap: number };
};

let OPPONENT: FactionId | null = null;
let PLAYER: FactionId | null = null;

export function setPlayerFaction(fid:FactionId){ PLAYER = fid; pickOpponentFaction(); }
export function pickOpponentFaction(){
  const all: FactionId[] = ['scientists','warmongers','industrialists','raiders'];
  const pool = all.filter(id => id !== PLAYER);
  OPPONENT = pool[Math.floor(Math.random()*pool.length)];
  return OPPONENT;
}
export function getOpponentFaction(){ return OPPONENT; }
export function setOpponentFaction(fid:FactionId){ OPPONENT = fid; }

export function initNewRun({ difficulty, faction }: NewRunParams): NewRunState{
  const f = getFaction(faction);
  setPlayerFaction(f.id);
  pickOpponentFaction();
  const creditMult = f.config.economy.creditMultiplier ?? 1;
  const materialMult = f.config.economy.materialMultiplier ?? 1;
  setEconomyModifiers({ credits: creditMult, materials: materialMult });
  setRareTechChance(f.config.rareChance);

  const res: Resources = { ...f.config.resources };
  const research: Research = { ...f.config.research } as Research;

  const classBlueprints: Record<FrameId, Part[]> = {
    interceptor: [ ...f.config.blueprints.interceptor ],
    cruiser: [],
    dread: [],
  };

  const startFrameId = f.config.startingFrame as FrameId;
  const count = getStartingShipCount(difficulty);
  const fleet = Array.from({length: count}, ()=> makeShip(getFrame(startFrameId), [ ...classBlueprints[startFrameId] ]));

  const shopItems = rollInventory(research, f.config.shopSize);

  const baseCap = getInitialCapacityForDifficulty(difficulty, startFrameId);
  const capacity = { cap: Math.max(baseCap, f.config.capacity) };

  const baseReroll = f.config.economy.rerollBase ?? getBaseRerollCost(difficulty);
  const rerollCost = Math.max(0, Math.floor(baseReroll * creditMult));
  return { resources: res, research, rerollCost, sector: 1, blueprints: classBlueprints, fleet, shopItems, capacity };
}

