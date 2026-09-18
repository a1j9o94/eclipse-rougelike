import type { ShipBlueprint, BlueprintShipType } from '../../shared/eclipse/blueprints';
import { isShipPartId } from '../../shared/eclipse/parts';
import type { BuildComponent } from '../../shared/eclipse/history';
import type { GameCommand, Resource } from '../../shared/eclipse/types';
import type { CommandCandidate } from './SecondDawnBoard';

export interface DraftPartition { matchId: string; viewerSeatId: string }
export interface DraftValues {
  selectedSector: string | null; screen: string; action: GameCommand['type']; commandDraft: CommandCandidate | null;
  researchSelection: string | null; editing: BlueprintShipType | null; playerId: string;
  buildOpen: boolean; moveOpen: boolean; moveSource: string | null; moveTarget: string | null; historyOpen: boolean;
  camera: { zoom: number; center: { x: number; y: number } } | null;
  movement: { source: string | null; ids: string[] };
  buildSector: string; buildCounts: Record<BuildComponent, number>; buildFunding: string;
  'blueprint-interceptor': ShipBlueprint; 'blueprint-cruiser': ShipBlueprint; 'blueprint-dreadnought': ShipBlueprint; 'blueprint-starbase': ShipBlueprint;
  'blueprintSlot-interceptor': number; 'blueprintSlot-cruiser': number; 'blueprintSlot-dreadnought': number; 'blueprintSlot-starbase': number;
  influenceSource: string | null; influenceDraft: CommandCandidate | null;
  colonization: Record<string, Resource>; colonizationFocus: string | null;
  tradeTo: Resource; tradeFrom: Resource; tradeAmount: number;
}
export type DraftKey = keyof DraftValues;
export type DraftEntries = { [K in DraftKey]?: { revision: number; value: DraftValues[K] } };
export interface DraftSnapshot extends DraftPartition { version: 1; values: DraftEntries }
export const DRAFT_KEYS: readonly DraftKey[] = ['selectedSector','screen','action','commandDraft','researchSelection','editing','playerId','buildOpen','moveOpen','moveSource','moveTarget','historyOpen','camera','movement','buildSector','buildCounts','buildFunding','blueprint-interceptor','blueprint-cruiser','blueprint-dreadnought','blueprint-starbase','blueprintSlot-interceptor','blueprintSlot-cruiser','blueprintSlot-dreadnought','blueprintSlot-starbase','influenceSource','influenceDraft','colonization','colonizationFocus','tradeTo','tradeFrom','tradeAmount'];
const COMPONENTS = ['interceptor','cruiser','dreadnought','starbase','orbital','monolith'];
const SHIPS = COMPONENTS.slice(0,4);
const RESOURCES = ['money','science','materials'];
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const keysOnly = (value: Record<string, unknown>, keys: readonly string[]): boolean => Object.keys(value).every(key => keys.includes(key));
const text = (value: unknown): value is string => typeof value === 'string' && value.length <= 512 && !/ecl1_[a-f0-9]{64}/i.test(value);
const nullableText = (value: unknown): boolean => value === null || text(value);
const integer = (value: unknown, maximum=1000): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= maximum;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 100 && value.every(text);
function blueprint(value: unknown): boolean {
  return record(value) && keysOnly(value,['shipType','parts','outsideParts']) && SHIPS.includes(String(value.shipType)) && Array.isArray(value.parts) && value.parts.length <= 10 && value.parts.every(part=>part===null || typeof part==='string' && isShipPartId(part)) && Array.isArray(value.outsideParts) && value.outsideParts.length <= 10 && value.outsideParts.every(part=>typeof part==='string' && isShipPartId(part));
}
/** Strict command whitelist: persisted drafts never contain resolve or reputation choices. */
function publicCommand(value: unknown): boolean {
  if (!record(value) || typeof value.type !== 'string') return false;
  switch(value.type) {
    case 'explore': return keysOnly(value,['type','position']) && record(value.position) && keysOnly(value.position,['q','r']) && ['q','r'].every(key=>typeof value.position === 'object' && value.position!==null && Math.abs(Number((value.position as Record<string,unknown>)[key]))<=100 && Number.isInteger((value.position as Record<string,unknown>)[key]));
    case 'research': return keysOnly(value,['type','tileId','track']) && text(value.tileId) && ['military','grid','nano'].includes(String(value.track));
    case 'influence': return keysOnly(value,['type','removeSectorIds','addSectorIds']) && strings(value.removeSectorIds) && strings(value.addSectorIds);
    case 'upgrade': return keysOnly(value,['type','blueprints']) && Array.isArray(value.blueprints) && value.blueprints.length <= 4 && value.blueprints.every(blueprint);
    case 'move': return keysOnly(value,['type','moves']) && Array.isArray(value.moves) && value.moves.length<=10 && value.moves.every(move=>record(move)&&keysOnly(move,['shipId','path'])&&text(move.shipId)&&strings(move.path));
    case 'build': return keysOnly(value,['type','builds']) && Array.isArray(value.builds) && value.builds.length<=20 && value.builds.every(build=>record(build)&&keysOnly(build,['sectorId','component'])&&text(build.sectorId)&&COMPONENTS.includes(String(build.component)));
    case 'trade': return keysOnly(value,['type','from','to','amount']) && RESOURCES.includes(String(value.from)) && RESOURCES.includes(String(value.to)) && integer(value.amount);
    case 'trade-and-act': return keysOnly(value,['type','trades','action']) && record(value.action) && ['research','build'].includes(String(value.action.type)) && publicCommand(value.action) && Array.isArray(value.trades) && value.trades.length<=10 && value.trades.every(trade=>record(trade)&&keysOnly(trade,['from','to','amount'])&&RESOURCES.includes(String(trade.from))&&RESOURCES.includes(String(trade.to))&&integer(trade.amount));
    case 'colonize': return keysOnly(value,['type','placements']) && Array.isArray(value.placements) && value.placements.length<=100 && value.placements.every(p=>record(p)&&keysOnly(p,['sectorId','squareId','resource'])&&text(p.sectorId)&&text(p.squareId)&&RESOURCES.includes(String(p.resource)));
    case 'pass': case 'end-action': case 'finish-upkeep': return keysOnly(value,['type']);
    default: return false;
  }
}
function candidate(value: unknown): boolean { return value===null || record(value)&&keysOnly(value,['command','label','description'])&&text(value.label)&&text(value.description)&&publicCommand(value.command); }
function validValue(key: DraftKey, value: unknown): boolean {
  if (key.startsWith('blueprintSlot-')) return integer(value,9);
  if (key.startsWith('blueprint-')) return blueprint(value) && record(value) && value.shipType===key.slice('blueprint-'.length);
  switch(key) {
    case 'commandDraft': case 'influenceDraft': return candidate(value);
    case 'selectedSector': case 'researchSelection': case 'moveSource': case 'moveTarget': case 'influenceSource': case 'colonizationFocus': return nullableText(value);
    case 'screen': return ['Galaxy','Research','Blueprints','Players','Diplomacy','Scoring','Trade','Decision','Activity','Empire'].includes(String(value));
    case 'action': return ['explore','influence','research','upgrade','build','move','colonize','trade','offer-diplomacy','discard-reputation','pass','end-action','finish-upkeep'].includes(String(value));
    case 'editing': return value===null || SHIPS.includes(String(value));
    case 'playerId': case 'buildSector': case 'buildFunding': return text(value);
    case 'buildOpen': case 'moveOpen': case 'historyOpen': return typeof value==='boolean';
    case 'camera': return value===null || record(value)&&keysOnly(value,['zoom','center'])&&typeof value.zoom==='number'&&value.zoom>0&&value.zoom<=20&&record(value.center)&&keysOnly(value.center,['x','y'])&&typeof value.center.x==='number'&&Number.isFinite(value.center.x)&&typeof value.center.y==='number'&&Number.isFinite(value.center.y);
    case 'movement': return record(value)&&keysOnly(value,['source','ids'])&&nullableText(value.source)&&strings(value.ids);
    case 'buildCounts': return record(value)&&keysOnly(value,COMPONENTS)&&COMPONENTS.every(component=>integer(value[component],100));
    case 'colonization': return record(value)&&Object.keys(value).length<=100&&Object.entries(value).every(([id,resource])=>text(id)&&RESOURCES.includes(String(resource)));
    case 'tradeTo': case 'tradeFrom': return RESOURCES.includes(String(value));
    case 'tradeAmount': return integer(value) && value>0;
    default: return false;
  }
}
export function emptyActionDrafts(partition: DraftPartition): DraftSnapshot { return {version:1,matchId:partition.matchId,viewerSeatId:partition.viewerSeatId,values:{}}; }
export function draftStorageKey(partition: DraftPartition): string { return `eclipse.second-dawn.drafts.v1:${encodeURIComponent(partition.matchId)}:${encodeURIComponent(partition.viewerSeatId)}`; }
export function readActionDrafts(storage: Pick<Storage,'getItem'>, partition: DraftPartition): DraftSnapshot {
  const snapshot=emptyActionDrafts(partition);
  try {
    const raw=storage.getItem(draftStorageKey(partition));if(!raw||raw.length>150_000)return snapshot;
    const parsed:unknown=JSON.parse(raw);
    if(!record(parsed)||parsed.version!==1||parsed.matchId!==partition.matchId||parsed.viewerSeatId!==partition.viewerSeatId||!record(parsed.values))return snapshot;
    for(const key of DRAFT_KEYS){const entry=parsed.values[key];if(record(entry)&&keysOnly(entry,['revision','value'])&&integer(entry.revision,1_000_000_000)&&validValue(key,entry.value))Object.assign(snapshot.values,{[key]:{revision:entry.revision,value:entry.value}});}
  } catch { /* Corrupt or blocked browser storage falls back to editable local state. */ }
  return snapshot;
}
export function writeActionDrafts(storage: Pick<Storage,'setItem'>, snapshot: DraftSnapshot): boolean {
  const safe=emptyActionDrafts(snapshot);
  for(const key of DRAFT_KEYS){const entry=snapshot.values[key];if(entry&&validValue(key,entry.value))Object.assign(safe.values,{[key]:entry});}
  try {storage.setItem(draftStorageKey(snapshot),JSON.stringify(safe));return true;}catch{return false;}
}
export function setDraftValue<K extends DraftKey>(snapshot: DraftSnapshot,key:K,value:DraftValues[K],revision:number): DraftSnapshot {
  if(!validValue(key,value))return snapshot;
  const previous=snapshot.values[key];if(previous&&JSON.stringify(previous.value)===JSON.stringify(value))return snapshot;
  return {...snapshot,values:{...snapshot.values,[key]:{value,revision}}};
}
export function isMeaningfulDraft(key: DraftKey, entries: DraftEntries): boolean {
  const entry=entries[key];if(!entry)return false;
  if(key==='commandDraft'||key==='influenceDraft')return entry.value!==null;
  if(key.startsWith('blueprint-'))return true;
  if(key==='movement')return !!entries.movement?.value.ids.length;
  if(key==='buildCounts')return Object.values(entries.buildCounts!.value).some(count=>count>0);
  if(key==='colonization')return Object.keys(entries.colonization!.value).length>0;
  return key==='tradeAmount'||key==='tradeFrom'||key==='tradeTo';
}
export function keysForCommand(command: GameCommand): DraftKey[] {
  if(command.type==='trade-and-act')return keysForCommand(command.action);
  const keys:DraftKey[]=['commandDraft'];
  switch(command.type){
    case 'move':return [...keys,'movement','moveTarget'];
    case 'build':return [...keys,'buildCounts','buildFunding'];
    case 'research': case 'explore': case 'pass': case 'end-action': case 'finish-upkeep':return keys;
    case 'upgrade':return [...keys,...command.blueprints.flatMap(blueprint=>[`blueprint-${blueprint.shipType}` as DraftKey,`blueprintSlot-${blueprint.shipType}` as DraftKey])];
    case 'influence':return [...keys,'influenceDraft','influenceSource'];
    case 'colonize':return [...keys,'colonization','colonizationFocus'];
    case 'trade':return ['tradeTo','tradeFrom','tradeAmount'];
    default:return [];
  }
}
