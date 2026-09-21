import {getMinorSpecies} from './minorSpecies';
import { getFaction } from './catalog';
import { researchTechnology } from './actions';
import { gameRules } from './gameRules';
import { beginAction, consumeActivations, emit, hasTech, queueDecision, requireRule, uniqueId } from './rulesState';
import { getTechnology, TECHNOLOGIES, RESEARCH_DISCOUNTS, type TechnologyId } from './technologies';
import type { GameCommand, GameEvent, GameState, Seat, Track } from './types';

export type DevelopmentId = 'ancient-labs-development' | 'quantum-labs';
export const DEVELOPMENTS = [
  {id:'ancient-labs-development',name:'Ancient Labs',resource:'money',cost:8,description:'Gain a discovery using this game’s discovery rules. Placed outside your research tracks.'},
  {id:'quantum-labs',name:'Quantum Labs',resource:'materials',cost:7,description:'Research one later technology for 6 less science, even below its minimum. Uses an extra slot outside your tracks; worth 1 VP when filled.'},
] as const;
export function developmentAvailable(state: Pick<GameState,'rulesMode'|'ruleOptions'|'seats'>,id:DevelopmentId):boolean {
  return gameRules(state).technologyVariant && !state.seats.some(seat => seat.developments?.some(d => d.id === id));
}
export function quantumResearchCost(seat:Seat,id:TechnologyId,track:Track):number|null {
  if(!seat.developments?.some(d=>d.id==='quantum-labs'&&!d.technologyId) || hasTech(seat,id)) return null;
  const tech=getTechnology(id);
  if(tech.track!=='rare'&&tech.track!==track)return null;
  // The source's worked example applies the ordinary track discount/minimum first.
  const extra=(seat.minorSpecies??[]).reduce((sum,tile)=>{const effect=getMinorSpecies(tile.id).effect;return sum+(effect.kind==='research-discount'?effect.amount:0);},0);
  const discount=RESEARCH_DISCOUNTS[Math.min(6,seat.technologies[track].length)]+extra;
  return Math.max(0,Math.max(tech.minimumCost,tech.baseCost-discount)-6);
}
export function performDevelopment(state:GameState,seat:Seat,command:Extract<GameCommand,{type:'research-development'|'quantum-research'}>,events:GameEvent[]):void {
  requireRule(gameRules(state).technologyVariant,'Enable the variant technology inventory to use developments.');
  beginAction(state,seat,'research');
  if(command.type==='research-development') {
    const item=DEVELOPMENTS.find(d=>d.id===command.developmentId);
    requireRule(!!item&&developmentAvailable(state,item.id),'This development has already been acquired or is unavailable.');
    requireRule(seat.resources[item.resource]>=item.cost,`${item.name} requires ${item.cost} ${item.resource}.`,'INSUFFICIENT_RESOURCES');
    seat.resources[item.resource]-=item.cost;
    (seat.developments??=[]).push({id:item.id});
    if(item.id==='ancient-labs-development'&&state.supplies.discovery.length>0) {
      const home=state.sectors.find(s=>Number(s.tileId)===getFaction(seat.faction).homeSector&&s.owner===seat.id);
      // Public tiles are consumed on selection; hidden tiles are drawn now.
      const publicDiscovery = gameRules(state).publicDiscoveries;
      const tileId = publicDiscovery ? '' : state.supplies.discovery.shift()!;
      queueDecision(state,{id:uniqueId(state,'discovery'),owner:seat.id,kind:'discovery',tileId,...(publicDiscovery?{availableTileIds:[...new Set(state.supplies.discovery)]}:{}),options:['keep','use'],...(home?{sectorId:home.id}:{})});
    }
    emit(events,seat.id,`${getFaction(seat.faction).name} acquires ${item.name} for ${item.cost} ${item.resource}.`);
  } else {
    const tech=TECHNOLOGIES.find(t=>t.id===command.tileId);
    requireRule(!!tech,'Choose a technology in this catalog.','INVALID_COMMAND');
    const cost=quantumResearchCost(seat,tech.id,command.track);
    requireRule(cost!==null,'Quantum Labs is already filled, this technology is owned, or its track is incorrect.');
    requireRule(seat.resources.science>=cost,`Quantum research requires ${cost} science.`,'INSUFFICIENT_RESOURCES');
    const lab=seat.developments!.find(d=>d.id==='quantum-labs')!;
    researchTechnology(state,seat,tech.id,command.track,true,true);
    seat.resources.science-=cost;
    lab.technologyId=tech.id;
    emit(events,seat.id,`${getFaction(seat.faction).name} researches ${tech.name} in Quantum Labs for ${cost} science.`);
  }
  consumeActivations(state,1,'research');
}
