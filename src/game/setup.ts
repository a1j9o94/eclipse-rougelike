import { type Research, type Resources, INITIAL_BLUEPRINTS, INITIAL_RESEARCH, INITIAL_RESOURCES, INITIAL_CAPACITY } from '../config/defaults'
import { type FrameId } from '../config/frames'
import { getFaction, type FactionId } from '../config/factions'
import { type Part } from '../config/parts'
import { getFrame, makeShip, rollInventory, setPlayerFaction, pickOpponentFaction, setEconomyModifiers } from './index'
import { ECONOMY } from '../config/economy'
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

export function initNewRun({ difficulty, faction }: NewRunParams): NewRunState{
  const f = getFaction(faction);
  setPlayerFaction(f.id);
  pickOpponentFaction();
  const creditMult = f.economy?.creditMultiplier ?? 1;
  const materialMult = f.economy?.materialMultiplier ?? 1;
  setEconomyModifiers({ credits: creditMult, materials: materialMult });
  const baseRes = { ...INITIAL_RESOURCES };
  const baseTech = { ...INITIAL_RESEARCH };
  const res: Resources = {
    credits: baseRes.credits + (f.startingResourcesDelta?.credits||0),
    materials: baseRes.materials + (f.startingResourcesDelta?.materials||0),
    science: baseRes.science + (f.startingResourcesDelta?.science||0),
  };
  const research: Research = {
    Military: baseTech.Military + (f.startingResearchDelta?.Military||0),
    Grid: baseTech.Grid + (f.startingResearchDelta?.Grid||0),
    Nano: baseTech.Nano + (f.startingResearchDelta?.Nano||0),
  } as Research;

  const classBlueprints: Record<FrameId, Part[]> = {
    interceptor: [ ...INITIAL_BLUEPRINTS.interceptor ],
    cruiser: [ ...INITIAL_BLUEPRINTS.cruiser ],
    dread: [ ...INITIAL_BLUEPRINTS.dread ],
  };
  if(f.startingBlueprintOverrides){
    for(const k of Object.keys(f.startingBlueprintOverrides) as FrameId[]){
      const ov = f.startingBlueprintOverrides[k];
      if(ov && ov.length>0) classBlueprints[k] = [...ov];
    }
  }

  const startFrameId = (f.startingFrame || 'interceptor') as FrameId;
  const count = getStartingShipCount(difficulty);
  const fleet = Array.from({length: count}, ()=> makeShip(getFrame(startFrameId), [ ...classBlueprints[startFrameId] ]));

  const shopItems = rollInventory(research, ECONOMY.shop.itemsBase + (f.startingShopItemsDelta||0));

  const baseCap = getInitialCapacityForDifficulty(difficulty, (f.startingFrame||'interceptor') as FrameId);
  const capacity = { cap: Math.max(baseCap, INITIAL_CAPACITY.cap + (f.startingCapacityDelta||0)) };

  const baseReroll = f.economy?.rerollBase ?? getBaseRerollCost(difficulty);
  const rerollCost = Math.max(0, Math.floor(baseReroll * creditMult));
  return { resources: res, research, rerollCost, sector: 1, blueprints: classBlueprints, fleet, shopItems, capacity };
}


