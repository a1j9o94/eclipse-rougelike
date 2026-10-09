import { upkeepSeatUnfinished } from './upkeep';
import { queueAncientPart } from './ancientAcquisition';
import { researchCostForSeat } from './minorSpecies';
import { TECHNOLOGIES } from './technologies';
import { SHIP_PARTS } from './parts';
import { adjacentPosition, connectionBetween, type HexEdge } from './geometry';
import { beginAction, consumeActivations, emit, hasEnemy, hasTech, mapSector, player, queueDecision, requireRule, uniqueId } from './rulesState';
import { researchTechnology } from './actions';
import type { Coordinate, DecisionChoice, GameCommand, GameEvent, GameState, PlayerView, Seat } from './types';

type MarketState = Pick<GameState,'technologyMarket'|'technologyReservations'>;
/** A reservation removes one physical copy, never every copy of a technology. */
export function availableTechnologyMarket(state:MarketState,seatId:string):string[] {
 const available=[...state.technologyMarket];
 for(const reservation of state.technologyReservations??[]) if(reservation.owner!==seatId){
  const index=available.indexOf(reservation.tileId);if(index>=0)available.splice(index,1);
 }
 return available;
}
export function expireScifiReservations(state:GameState):void {
 if(!state.technologyReservations)return;
 state.technologyReservations=state.technologyReservations.filter(reservation=>reservation.round===state.round && !(state.activeSeatId===reservation.owner&&(state.actionTurnSerial??0)>reservation.turnSerial));
}
export function clearScifiRoundState(state:GameState,events:GameEvent[]):void {
 for(const offer of state.guildOffers??[]) {
  player(state,offer.owner).resources[offer.give]+=offer.remaining;
  if(offer.remaining)emit(events,offer.owner,`Guild offer expired: returned ${offer.remaining} ${offer.give}.`);
 }
 if(state.guildOffers)state.guildOffers=[];if(state.technologyReservations)state.technologyReservations=[];
}
export function finishResearchScifi(state:GameState,seat:Seat):void {
 if(seat.faction!=='trisolarans'||seat.scifi?.reservationRound===state.round||seat.passed)return;
 const tileIds=[...new Set(availableTechnologyMarket(state,seat.id))];if(!tileIds.length)return;
 seat.scifi??={};seat.scifi.reservationRound=state.round;
 queueDecision(state,{id:uniqueId(state,'reservation'),owner:seat.id,kind:'technology-reservation',tileIds});
}
export function resolveScifiChoice(state:GameState,seat:Seat,choice:DecisionChoice,events:GameEvent[]):boolean {
 const decision=state.pendingDecision;
 if(decision?.kind!=='technology-reservation'||choice.kind!=='technology-reservation')return false;
 requireRule(decision.owner===seat.id,'This reservation decision belongs to another civilization.');
 if(choice.tileId!==null){
  requireRule(decision.tileIds.includes(choice.tileId)&&availableTechnologyMarket(state,seat.id).includes(choice.tileId),'This physical technology tile is no longer available.');
  state.technologyReservations=(state.technologyReservations??[]).filter(r=>r.owner!==seat.id);
  state.technologyReservations.push({owner:seat.id,tileId:choice.tileId,round:state.round,turnSerial:state.actionTurnSerial??0});
  emit(events,seat.id,`Reserved ${choice.tileId} until the next turn or round end.`);
 }
 state.pendingDecision=null;return true;
}
function guildExplorationSources(state:Pick<GameState,'sectors'|'round'>,seat:Seat,position:Coordinate,legacyClosedEdges:boolean):GameState['sectors'] {
 if(seat.faction!=='spacing-guild'||seat.passed||Math.max(Math.abs(position.q),Math.abs(position.r),Math.abs(position.q+position.r))<3)return [];
 return state.sectors.filter(sector=>([0,1,2,3,4,5] as HexEdge[]).some(edge=>{
  const p=adjacentPosition(sector.position,edge);
  return p.q===position.q&&p.r===position.r&&(legacyClosedEdges||hasTech(seat,'wormhole-generator')||mapSector(sector).wormholes.some(w=>(w+sector.rotation)%6===edge));
 }));
}
export function remoteExplorationSources(state:Pick<GameState,'sectors'|'round'>,seat:Seat,position:Coordinate):GameState['sectors'] {
 return guildExplorationSources(state,seat,position,false);
}
/** Trusted history recovery only: reproduce draws accepted before source-edge validation. */
export function historicalRemoteExplorationSources(state:Pick<GameState,'sectors'|'round'>,seat:Seat,position:Coordinate):GameState['sectors'] {
 return guildExplorationSources(state,seat,position,true);
}
/** Toll quote and execution share this pure helper, including once-per-action ship accounting. */
export function guildMovementTolls(state:Pick<GameState,'sectors'|'seats'>,seatId:string,shipIds:readonly string[],origin:string,path:readonly string[],alreadyPaid:readonly string[]=[]):{owner:string;shipId:string;amount:number}[] {
 const guilds=state.seats.filter(seat=>seat.faction==='spacing-guild'&&seat.id!==seatId&&!seat.eliminated);
 if(!guilds.length)return [];
 const result:{owner:string;shipId:string;amount:number}[]=[];
 let current=origin;
 for(const next of path){
  const from=state.sectors.find(s=>s.id===current),to=state.sectors.find(s=>s.id===next);
  if(from&&to){
   const a=mapSector(from),b=mapSector(to);
   // Prefer an available ordinary connection: adjoining portals do not force paid travel.
   const payer=state.seats.find(seat=>seat.id===seatId);
   const ordinary=connectionBetween({...a,warpPortal:false},{...b,warpPortal:false},payer?hasTech(payer,'wormhole-generator'):false);
   if(ordinary==='none'&&connectionBetween(a,b,false)==='warp'){
    const guild=guilds.find(g=>(a.warpPortal&&from.owner===g.id)||(b.warpPortal&&to.owner===g.id));
    if(guild)for(const shipId of shipIds)if(!alreadyPaid.includes(shipId)&&!result.some(toll=>toll.shipId===shipId))result.push({owner:guild.id,shipId,amount:1});
   }
  }
  current=next;
 }
 return result;
}
function requireOptionalTurn(state:GameState,seat:Seat):void {
 requireRule(state.phase==='action'&&state.activeSeatId===seat.id,'Use this ability during your action turn.','NOT_YOUR_TURN');
 requireRule(!state.pendingDecision&&!seat.passed,'Finish pending decisions; optional abilities are unavailable during reactions.');
}
export function handleScifiCommand(state:GameState,seat:Seat,command:GameCommand,events:GameEvent[]):boolean {
 switch(command.type){
 case 'load-factory':{
  requireRule(!state.pendingDecision,'Resolve the outstanding choice first.','DECISION_PENDING');
  requireRule(seat.faction==='bobiverse','Only Bobiverse can populate interceptor factories.');
  requireRule((state.phase==='action'&&state.activeSeatId===seat.id)||upkeepSeatUnfinished(state,seat.id),'Load factories during your turn or upkeep.','NOT_YOUR_TURN');
  const ship=state.ships.find(s=>s.id===command.shipId);
  requireRule(!!ship&&ship.owner===seat.id&&ship.type==='interceptor'&&!ship.factoryPopulation,'Choose an empty interceptor factory.');
  requireRule(state.sectors.some(s=>s.id===ship!.sectorId&&s.owner===seat.id),'Load factories in controlled sectors.');
  requireRule(state.phase!=='upkeep'||!hasEnemy(state,seat,ship!.sectorId),'Enemy ships prevent upkeep factory loading.');
  requireRule(seat.colonyShipsAvailable>0&&seat.populationTracks.materials<11,'Loading needs a colony ship and a materials population cube.');
  ship!.factoryPopulation=true;seat.colonyShipsAvailable--;seat.populationTracks.materials++;break;
 }
 case 'place-guild-portal':{
  requireRule(seat.faction==='spacing-guild','Only the Guild can place network markers.');requireOptionalTurn(state,seat);
  const sector=state.sectors.find(s=>s.id===command.sectorId);
  requireRule(!!sector&&sector.owner===seat.id&&!mapSector(sector).warpPortal,'Place a portal in a controlled sector without a portal.');
  requireRule((seat.scifi?.guildPortalMarkers??0)>0,'No undeployed Guild portal markers remain.');
  sector!.guildPortalOwner=seat.id;seat.scifi!.guildPortalMarkers!--;break;
 }
 case 'guild-offer':{
  requireRule(seat.faction==='spacing-guild','Only the Guild can post brokerage offers.');requireOptionalTurn(state,seat);
  requireRule(command.give!==command.receive&&Number.isInteger(command.amount)&&command.amount>0&&command.amount<=16,'Offer 1 to 16 equal units of different resources.');
  requireRule((state.guildOffers??[]).filter(o=>o.owner===seat.id).length<3,'Only three standing Guild offers are allowed.');
  requireRule(seat.resources[command.give]>=command.amount,'Insufficient outgoing resources for escrow.','INSUFFICIENT_RESOURCES');
  seat.resources[command.give]-=command.amount;state.guildOffers??=[];
  state.guildOffers.push({id:uniqueId(state,'guild-offer'),owner:seat.id,give:command.give,receive:command.receive,remaining:command.amount});break;
 }
 case 'accept-guild-offer':{
  requireOptionalTurn(state,seat);
  const offer=state.guildOffers?.find(o=>o.id===command.offerId);
  requireRule(!!offer&&offer.owner!==seat.id,'This Guild offer is unavailable.');
  const guild=player(state,offer!.owner);requireRule(guild.faction==='spacing-guild'&&!guild.eliminated,'This Guild has left the game.');
  requireRule(Number.isInteger(command.amount)&&command.amount>0&&command.amount<=offer!.remaining,'The offer has insufficient remaining inventory.');
  requireRule(seat.resources[offer!.receive]>=command.amount,'Insufficient resources to accept this offer.','INSUFFICIENT_RESOURCES');
  seat.resources[offer!.receive]-=command.amount;guild.resources[offer!.receive]+=command.amount;seat.resources[offer!.give]+=command.amount;offer!.remaining-=command.amount;
  state.guildOffers=state.guildOffers!.filter(o=>o.remaining>0);break;
 }
 case 'cancel-guild-offer':{
  requireOptionalTurn(state,seat);const offer=state.guildOffers?.find(o=>o.id===command.offerId);
  requireRule(!!offer&&offer.owner===seat.id,'Only the posting Guild can cancel this offer.');
  seat.resources[offer!.give]+=offer!.remaining;state.guildOffers=state.guildOffers!.filter(o=>o.id!==offer!.id);break;
 }
 case 'reverse-engineer':{
  requireRule(!state.pendingDecision,'Resolve the outstanding choice first.','DECISION_PENDING');
  requireRule(seat.faction==='portiids'&&!seat.passed,'Only active Portiids can reverse engineer.');
  const project=seat.scifi?.reverseEngineeringProject;requireRule(!!project,'No reverse-engineering project is recorded.');
  const tech=project!.kind==='technology'?TECHNOLOGIES.find(t=>t.id===project!.id):null;
  const cost=tech?researchCostForSeat(tech.id,command.track,seat):null;
  requireRule(project!.kind!=='technology'||!!cost?.ok,'This technology cannot be copied into that track.');
  const science=cost?.ok?cost.scienceCost:6;
  requireRule(seat.resources.science>=science,`Reverse engineering requires ${science} science.`,'INSUFFICIENT_RESOURCES');
  if(project!.kind==='ancient-part')requireRule(SHIP_PARTS.some(p=>p.id===project!.id&&p.access.kind==='ancient')&&!(seat.scifi?.copiedAncientParts??[]).includes(project!.id),'This ancient part was already copied or is unavailable.');
  beginAction(state,seat,'research');
  if(project!.kind==='technology')researchTechnology(state,seat,project!.id,command.track,false,false,false);
  else{
   seat.resources.science-=science;seat.scifi!.copiedAncientParts??=[];seat.scifi!.copiedAncientParts.push(project!.id);
   queueAncientPart(state,seat,project!.id,true);
  }
  delete seat.scifi!.reverseEngineeringProject;consumeActivations(state,1);break;
 }
 default:return false;
 }
 emit(events,seat.id,`${command.type}.`);return true;
}
/** The same metadata is used by controls, AI candidates and previews. */
export function scifiOptionalCommands(view:PlayerView,seat:Seat):GameCommand[] {
 const commands:GameCommand[]=[];
 const factoryWindow=(view.phase==='action'&&view.activeSeatId===seat.id)||(view.phase==='upkeep'&&!(view.upkeepDone??[]).includes(seat.id));
 if(factoryWindow&&!view.pendingDecision&&!view.waitingFor&&seat.faction==='bobiverse'&&seat.colonyShipsAvailable>0&&seat.populationTracks.materials<11)for(const ship of view.ships)if(ship.owner===seat.id&&ship.type==='interceptor'&&!ship.factoryPopulation&&view.sectors.some(s=>s.id===ship.sectorId&&s.owner===seat.id)&&(view.phase!=='upkeep'||!view.ships.some(enemy=>enemy.owner!==seat.id&&enemy.sectorId===ship.sectorId)))commands.push({type:'load-factory',shipId:ship.id});
 if(view.phase!=='action'||view.activeSeatId!==seat.id||seat.passed||view.pendingDecision||view.waitingFor)return commands;
 if(seat.faction==='spacing-guild'){
  if((seat.scifi?.guildPortalMarkers??0)>0)for(const sector of view.sectors)if(sector.owner===seat.id&&!mapSector(sector).warpPortal)commands.push({type:'place-guild-portal',sectorId:sector.id});
  if((view.guildOffers??[]).filter(o=>o.owner===seat.id).length<3)for(const give of ['money','science','materials'] as const)for(const receive of ['money','science','materials'] as const)if(give!==receive&&seat.resources[give]>0)commands.push({type:'guild-offer',give,receive,amount:Math.min(3,seat.resources[give])});
  for(const offer of view.guildOffers??[])if(offer.owner===seat.id)commands.push({type:'cancel-guild-offer',offerId:offer.id});
 }
 for(const offer of view.guildOffers??[])if(offer.owner!==seat.id&&seat.resources[offer.receive]>0)commands.push({type:'accept-guild-offer',offerId:offer.id,amount:Math.min(offer.remaining,seat.resources[offer.receive])});
 return commands;
}
