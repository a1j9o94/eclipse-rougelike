import { sectorDefinition } from '../../shared/eclipse/sectors';
import { researchTrackVp } from '../../shared/eclipse/scoring';
import { TECHNOLOGIES } from '../../shared/eclipse/technologies';
import type { PublicHistoryEntry } from '../../shared/eclipse/history';
import type { PlayerView } from '../../shared/eclipse/types';
import { runningScore } from './runningScore';
export type PublicScoreCategory=Exclude<keyof ReturnType<typeof runningScore>['breakdown'],'playerId'|'total'|'resourceTotal'>;
export type PublicInspectionRequest={kind:'history';entry:PublicHistoryEntry}|{kind:'score';seatId:string;category:PublicScoreCategory};
export interface PublicInspectionDetail { title:string; value:number; sectorIds:string[]; explanation:string; contributors:string[] }
export function historySectorIds(entry:PublicHistoryEntry):string[]{const presentation=entry.presentation;return presentation&&'sectorIds' in presentation?presentation.sectorIds:[];}
export function historyPresentationLines(entry:PublicHistoryEntry):string[]{const presentation=entry.presentation;if(!presentation)return [];switch(presentation.kind){case 'research':return [TECHNOLOGIES.find(technology=>technology.id===presentation.technologyId)?.name??presentation.technologyId];case 'upgrade':return presentation.shipTypes.map(type=>`${type[0].toUpperCase()+type.slice(1)} blueprint updated`);case 'build':return presentation.components.map(component=>`${component.count} ${component.type}${component.count===1?'':'s'} built`);case 'move':return presentation.shipIds.length?[`${presentation.shipIds.length} public ship${presentation.shipIds.length===1?'':'s'} moved`]:[];case 'influence':return ['Public influence changed'];case 'colonize':return ['Public colonies placed'];case 'explore':return ['A public sector was explored'];}}
export function scoreInspection(view:PlayerView,seatId:string,category:PublicScoreCategory):PublicInspectionDetail {
 const score=runningScore(view,seatId).breakdown, sectors=view.sectors.filter(sector=>sector.owner===seatId);
 const seat=view.seats.find(candidate=>candidate.id===seatId)!;
 const frozen=!!view.scores?.some(candidate=>candidate.playerId===seatId)&&seat.eliminated;
 const sectorIds=(predicate:(sector:typeof sectors[number])=>boolean)=>sectors.filter(predicate).map(sector=>sector.id);
 const labels=(ids:readonly string[])=>ids.map(id=>{const sector=view.sectors.find(candidate=>candidate.id===id);return sector?`Sector ${sector.tileId}`:'A sector no longer on this board';});
 const definitions=sectors.map(sector=>({sector,definition:sectorDefinition(Number(sector.tileId))}));
 if(frozen)return {title:category.replace(/(^|-)\w/g,word=>word.toUpperCase()),value:score[category],sectorIds:[],contributors:[],explanation:'This eliminated civilization has a frozen public score; current-board contributors are not substituted for that snapshot.'};
 switch(category){
  case 'sectors': {const ids=sectorIds(()=>true);return {title:'Controlled sectors',value:score.sectors,sectorIds:ids,contributors:definitions.filter(item=>(item.definition?.victoryPoints??0)!==0).map(item=>`Sector ${item.sector.tileId}: ${item.definition?.victoryPoints??0} VP`),explanation:'Printed sector values on your currently controlled public sectors.'};}
  case 'monoliths': {const ids=sectorIds(sector=>!!sector.monolith);return {title:'Monoliths',value:score.monoliths,sectorIds:ids,contributors:labels(ids).map(label=>`${label}: 3 VP`),explanation:'Each controlled Monolith scores 3 VP.'};}
  case 'portals': {const ids=sectorIds(sector=>(sector.portalVp??0)>0);return {title:'Warp portals',value:score.portals,sectorIds:ids,contributors:ids.map(id=>{const sector=view.sectors.find(candidate=>candidate.id===id)!;return `Sector ${sector.tileId}: ${sector.portalVp} VP`; }),explanation:'Portal bonuses on currently controlled sectors.'};}
  case 'species': {const ids=seat.faction==='planta'?sectorIds(()=>true):seat.faction==='draco'?view.ships.filter(ship=>ship.type==='ancient').map(ship=>ship.sectorId):[];return {title:'Species bonus',value:score.species,sectorIds:ids,contributors:seat.faction==='planta'?labels(ids):seat.faction==='draco'?labels(ids).map(label=>`${label}: Ancient on board`):[],explanation:'This faction-specific public score uses the current board.'};}
  case 'research': {const tracks=Object.entries(seat.technologies).map(([track,ids])=>{const names=ids.map(id=>TECHNOLOGIES.find(technology=>technology.id===id)?.name??id);return `${track}: ${ids.length} technologies · ${researchTrackVp(ids.length)} VP${names.length?` (${names.join(', ')})`:''}`;});return {title:'Research',value:score.research,sectorIds:[],contributors:tracks,explanation:'Technology-track thresholds on the public player board.'};}
  case 'discoveries': return {title:'Discoveries',value:score.discoveries,sectorIds:[],contributors:[],explanation:'Kept discovery totals are public only as permitted by the player view.'};
  case 'ambassadors': return {title:'Ambassadors',value:score.ambassadors,sectorIds:[],contributors:seat.ambassadors.map(id=>view.seats.find(candidate=>candidate.id===id)?.faction??id),explanation:'Ambassador tiles retained on the public player board.'};
  case 'traitor': return {title:'Traitor penalty',value:score.traitor,sectorIds:[],contributors:[],explanation:'The current public diplomatic penalty.'};
  case 'reputation': return {title:'Reputation',value:score.reputation,sectorIds:[],contributors:[],explanation:'Reputation remains hidden until final scoring.'};
 }
}
