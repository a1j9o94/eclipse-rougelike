import { describe, expect, it } from 'vitest';
import { movableShipCount, validateMovementGroup, type MovementShip, type MovementSector } from '../../shared/eclipse/geometry';
const abilities = {wormholeGenerator:false,cloakingDevice:false,descendantsOfDraco:false};
const fleet:MovementShip[]=[{id:'lead',owner:'p',sectorId:'a',kind:'cruiser',movement:2},{id:'escort',owner:'p',sectorId:'a',kind:'interceptor',movement:2}];
const sectors:MovementSector[]=[{id:'a',q:0,r:0,rotation:0,wormholes:[0],warpPortal:false,controller:'p'},{id:'b',q:1,r:0,rotation:0,wormholes:[0,3],warpPortal:false,controller:null},{id:'c',q:2,r:0,rotation:0,wormholes:[3],warpPortal:false,controller:null}];
describe('sci-fi movement contracts',()=>{
 it('excludes Guild ships from pinning without treating them as peaceful occupants',()=>{
  const guildShip={id:'guild',owner:'g',sectorId:'a',kind:'interceptor' as const,movement:1,doesNotPin:true};
  expect(movableShipCount('p','a',[fleet[0],guildShip],abilities)).toBe(1);
 });
 it('allows a coordinated group to cover each other through a hostile intermediate sector',()=>{
  const enemy:MovementShip={id:'enemy',owner:'e',sectorId:'b',kind:'interceptor',movement:1};
  // Three friendlies are needed to move a two-ship convoy past one pinning opponent.
  const cover={...fleet[1],id:'cover',sectorId:'b'};
  expect(validateMovementGroup({player:'p',shipIds:['lead','escort'],path:['b','c'],ships:[...fleet,enemy,cover],sectors,abilities}).ok).toBe(true);
  expect(validateMovementGroup({player:'p',shipIds:['lead','escort'],path:['b','c'],ships:[...fleet,enemy],sectors,abilities}).ok).toBe(false);
 });
 it('rejects groups larger than the unpinned departure fleet',()=>{
  const enemy={...fleet[0],id:'enemy',owner:'e'};
  expect(validateMovementGroup({player:'p',shipIds:['lead','escort'],path:['b'],ships:[...fleet,enemy],sectors,abilities}).ok).toBe(false);
 });
});

import { createGame } from '../../shared/eclipse/setup';
import { processGameCommand } from '../../shared/eclipse/engine';
import { availableTechnologyMarket, clearScifiRoundState, guildMovementTolls, handleScifiCommand, remoteExplorationSources } from '../../shared/eclipse/scifiActions';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { previewCommand } from '../../shared/eclipse/commandPreview';
import type { FactionId } from '../../shared/eclipse/catalog';
function fixture(){
 const state=createGame({seed:22,warpPortals:true,seats:[{id:'p',faction:'eridani',controller:'human'},{id:'g',faction:'hydran',controller:'human'}]});
 state.phase='action';state.activeSeatId='p';state.pendingDecision=null;state.engine!.decisions=[];
 state.seats[0].resources={money:20,science:20,materials:20};state.seats[1].resources={money:20,science:20,materials:20};
 for(const seat of state.seats)seat.technologies={military:[],grid:[],nano:[]};
 return state;
}
describe('sci-fi optional economy and routes',()=>{
 it('escrows standing offers, atomically fills and refunds only unused volume',()=>{
  const state=fixture();state.seats[1].faction='spacing-guild' as FactionId;state.activeSeatId='g';
  handleScifiCommand(state,state.seats[1],{type:'guild-offer',give:'materials',receive:'science',amount:5},[]);
  expect(state.seats[1].resources.materials).toBe(15);const offer=state.guildOffers![0];
  state.activeSeatId='p';handleScifiCommand(state,state.seats[0],{type:'accept-guild-offer',offerId:offer.id,amount:3},[]);
  expect(state.seats[0].resources).toEqual({money:20,science:17,materials:23});expect(state.seats[1].resources.science).toBe(23);
  clearScifiRoundState(state,[]);expect(state.seats[1].resources.materials).toBe(17);expect(state.guildOffers).toEqual([]);
 });
 it('rejects stale or excessive offer fills without changing the authoritative snapshot',()=>{
  const state=fixture();state.guildOffers=[{id:'offer',owner:'g',give:'materials',receive:'science',remaining:2}];state.seats[1].faction='spacing-guild' as FactionId;
  const saved=structuredClone(state);const result=processGameCommand(state,'p',{type:'accept-guild-offer',offerId:'offer',amount:3});
  expect(result.ok).toBe(false);expect(state).toEqual(saved);
 });
 it('charges once per ship per action and stops charging after conquest',()=>{
  const state=fixture();state.seats[1].faction='spacing-guild' as FactionId;
  state.sectors=[{...state.sectors[0],id:'a',position:{q:0,r:0},owner:'g',guildPortalOwner:'g'},{...state.sectors[1],id:'b',position:{q:5,r:0},owner:'p',guildPortalOwner:'g'}];
  expect(guildMovementTolls(state,'p',['lead','escort'],'a',['b','a','b'])).toEqual([{owner:'g',shipId:'lead',amount:1},{owner:'g',shipId:'escort',amount:1}]);
  expect(guildMovementTolls(state,'p',['lead'],'a',['b'],['lead'])).toEqual([]);
  state.sectors[0].owner='p';expect(guildMovementTolls(state,'p',['lead'],'a',['b'])).toEqual([]);
 });
 it('reserves only one physical copy and leaves the owner unrestricted',()=>{
  const state=fixture();state.technologyMarket=['fusion-drive','fusion-drive','plasma-cannon'];state.technologyReservations=[{owner:'g',tileId:'fusion-drive',round:1,turnSerial:0}];
  expect(availableTechnologyMarket(state,'p')).toEqual(['fusion-drive','plasma-cannon']);expect(availableTechnologyMarket(state,'g')).toEqual(state.technologyMarket);
 });
 it('allows only outer remote prospecting and consumes its per-round permission',()=>{
  const state=fixture();const seat=state.seats[0];seat.faction='spacing-guild' as FactionId;
  state.sectors=[{...state.sectors[0],id:'opponent',owner:'g',position:{q:2,r:0}}];
  expect(remoteExplorationSources(state,seat,{q:3,r:0})).toHaveLength(1);
  expect(remoteExplorationSources(state,seat,{q:1,r:0})).toHaveLength(0);
  seat.scifi={remoteExploreRound:state.round};expect(remoteExplorationSources(state,seat,{q:3,r:0})).toHaveLength(0);
 });
 it('includes convoy tolls and brokerage escrow in the public resource preview',()=>{
  const state=fixture();state.seats[1].faction='spacing-guild' as FactionId;
  state.sectors=[{...state.sectors[0],id:'a',owner:'p',position:{q:0,r:0},guildPortalOwner:'p'},{...state.sectors[1],id:'b',owner:'g',position:{q:5,r:0},guildPortalOwner:'g'}];
  state.ships=state.ships.filter(s=>s.owner==='p').map(s=>({...s,id:'lead',sectorId:'a'}));state.ships.push({...state.ships[0],id:'escort'});
  const view=getPlayerView(state,'p')!;
  expect(previewCommand(view,{type:'move',moves:[{shipId:'lead',path:['b'],escorts:['escort']}]}).resourcesAfter.money).toBe(18);
  expect(previewCommand(view,{type:'guild-offer',give:'materials',receive:'science',amount:4}).resourcesAfter.materials).toBe(16);
 });
});

describe('sci-fi command integration',()=>{
 it('loads Bob factories through the real processor and preserves population when moving',()=>{
  const state=fixture();state.seats[0].faction='bobiverse' as FactionId;const ship=state.ships.find(s=>s.owner==='p')!;const before=state.seats[0].populationTracks.materials;
  const loaded=processGameCommand(state,'p',{type:'load-factory',shipId:ship.id});
  expect(loaded.ok).toBe(true);if(!loaded.ok)return;
  expect(loaded.state.seats[0].populationTracks.materials).toBe(before+1);expect(loaded.state.ships.find(s=>s.id===ship.id)?.factoryPopulation).toBe(true);
  const origin=loaded.state.sectors.find(s=>s.id===ship.sectorId)!;const destination=loaded.state.sectors.find(s=>s.owner==='g')!;origin.guildPortalOwner='p';destination.guildPortalOwner='p';
  const moved=processGameCommand(loaded.state,'p',{type:'move',moves:[{shipId:ship.id,path:[destination.id]}]});expect(moved.ok).toBe(true);if(moved.ok){expect(moved.state.ships.find(s=>s.id===ship.id)?.factoryPopulation).toBe(true);expect(moved.state.seats[0].populationTracks.materials).toBe(before+1);}
 });
 it('settles accepted Guild offers through the real processor and rejects reaction trading',()=>{
  const state=fixture();state.seats[1].faction='spacing-guild' as FactionId;state.guildOffers=[{id:'offer',owner:'g',give:'materials',receive:'science',remaining:2}];
  const accepted=processGameCommand(state,'p',{type:'accept-guild-offer',offerId:'offer',amount:1});expect(accepted.ok).toBe(true);if(!accepted.ok)return;
  expect(accepted.state.seats[0].resources.materials).toBe(21);expect(accepted.state.guildOffers![0].remaining).toBe(1);
  accepted.state.seats[0].passed=true;const reacted=processGameCommand(accepted.state,'p',{type:'accept-guild-offer',offerId:'offer',amount:1});expect(reacted.ok).toBe(false);
 });
});

import { legalCommands } from '../../shared/eclipse/legal';
import { mapSector } from '../../shared/eclipse/rulesState';
function portalBattleFixture(){
 const state=fixture();
 state.sectors=[{...state.sectors[0],id:'a',position:{q:0,r:0},owner:'p',guildPortalOwner:'p'},{...state.sectors[1],id:'b',position:{q:5,r:0},owner:'g',guildPortalOwner:'g'}];
 state.ships=[{id:'lead',owner:'p',type:'cruiser',sectorId:'a',damage:0},{id:'escort1',owner:'p',type:'interceptor',sectorId:'a',damage:0},{id:'escort2',owner:'p',type:'interceptor',sectorId:'a',damage:0}];
 return state;
}
describe('sci-fi full action rules',()=>{
 it('moves Formic convoys for one activation and charges every Guild passenger',()=>{
  const state=portalBattleFixture();state.seats[0].faction='formics';state.seats[1].faction='spacing-guild';
  const moved=processGameCommand(state,'p',{type:'move',moves:[{shipId:'lead',path:['b'],escorts:['escort1','escort2']}]});
  expect(moved.ok).toBe(true);if(!moved.ok)return;
  expect(moved.state.ships.every(s=>s.sectorId==='b')).toBe(true);expect(moved.state.seats[0].resources.money).toBe(17);expect(moved.state.seats[1].resources.money).toBe(23);
  expect(moved.state.engine!.action?.remaining).toBe(1);
  const back=processGameCommand(moved.state,'p',{type:'move',moves:[{shipId:'lead',path:['a'],escorts:['escort1','escort2']}]});
  expect(back.ok).toBe(true);if(back.ok)expect(back.state.seats[0].resources.money).toBe(17);
 });
 it('rejects reaction convoys and unaffordable portal groups atomically',()=>{
  const state=portalBattleFixture();state.seats[0].faction='formics';state.seats[1].faction='spacing-guild';
  const command={type:'move' as const,moves:[{shipId:'lead',path:['b'],escorts:['escort1','escort2']}]};
  state.seats[0].passed=true;expect(processGameCommand(state,'p',command).ok).toBe(false);state.seats[0].passed=false;state.seats[0].resources.money=2;
  const saved=structuredClone(state);const denied=processGameCommand(state,'p',command);expect(denied.ok).toBe(false);expect(state).toEqual(saved);
  const view=getPlayerView(state,'p')!;expect(legalCommands(view).some(candidate=>candidate.command.type==='move'&&candidate.command.moves[0].escorts?.length===2)).toBe(false);
 });
 it('permits natural adjacent links between portal sectors without collecting a toll',()=>{
  const state=portalBattleFixture();state.seats[1].faction='spacing-guild';state.sectors[0].tileId='1';state.sectors[1].tileId='1';state.sectors[1].position={q:1,r:0};
  expect(guildMovementTolls(state,'p',['lead'],'a',['b'])).toEqual([]);expect(mapSector(state.sectors[0]).warpPortal).toBe(true);
 });
 it('offers a reservation after Trisolaran research and expires it at its next turn',()=>{
  const state=fixture();state.seats[0].faction='trisolarans';state.technologyMarket=['fusion-drive','plasma-cannon'];
  const researched=processGameCommand(state,'p',{type:'research',tileId:'fusion-drive',track:'nano'});expect(researched.ok,researched.ok?'':researched.error.message).toBe(true);if(!researched.ok)return;
  const decision=researched.state.pendingDecision;expect(decision?.kind).toBe('technology-reservation');if(decision?.kind!=='technology-reservation')return;
  const reserved=processGameCommand(researched.state,'p',{type:'resolve',decisionId:decision.id,choice:{kind:'technology-reservation',tileId:'plasma-cannon'}});expect(reserved.ok).toBe(true);if(!reserved.ok)return;
  expect(processGameCommand(reserved.state,'g',{type:'research',tileId:'plasma-cannon',track:'military'}).ok).toBe(false);
  const next=processGameCommand(reserved.state,'g',{type:'pass'});expect(next.ok).toBe(true);if(next.ok){expect(next.state.activeSeatId).toBe('p');expect(next.state.technologyReservations).toEqual([]);}
 });
 it('copies research without using the market and creates one ordinary physical ancient part',()=>{
  const state=fixture();state.seats[0].faction='portiids';state.technologyMarket=[];state.seats[0].scifi={reverseEngineeringProject:{kind:'technology',id:'absorption-shield'}};
  const copied=processGameCommand(state,'p',{type:'reverse-engineer',track:'nano'});expect(copied.ok,copied.ok?'':copied.error.message).toBe(true);if(!copied.ok)return;
  expect(copied.state.seats[0].technologies.nano).toContain('absorption-shield');expect(copied.state.technologyMarket).toEqual([]);
  const hardware=fixture();hardware.seats[0].faction='portiids';hardware.seats[0].scifi={reverseEngineeringProject:{kind:'ancient-part',id:'ion-turret'}};hardware.seats[1].storedParts=['ion-turret'];
  const replicated=processGameCommand(hardware,'p',{type:'reverse-engineer',track:'nano'});expect(replicated.ok).toBe(true);if(!replicated.ok)return;
  expect(replicated.state.seats[0].resources.science).toBe(14);const decision=replicated.state.pendingDecision;expect(decision?.kind).toBe('ancient-part');if(decision?.kind!=='ancient-part')return;
  const stored=processGameCommand(replicated.state,'p',{type:'resolve',decisionId:decision.id,choice:{kind:'ancient-part',blueprint:null}});expect(stored.ok).toBe(true);if(!stored.ok)return;
  expect(stored.state.seats[0].storedParts).toContain('ion-turret');expect(stored.state.seats[0].scifi?.copiedAncientParts).toEqual(['ion-turret']);
  stored.state.activeSeatId='p';stored.state.seats[0].scifi!.reverseEngineeringProject={kind:'ancient-part',id:'ion-turret'};expect(processGameCommand(stored.state,'p',{type:'reverse-engineer',track:'nano'}).ok).toBe(false);
 });
 it('provides candidates for discovery drafts and reverse-engineering selections',()=>{
  const state=fixture();state.seats[0].faction='exfor';state.pendingDecision={id:'draft',owner:'p',kind:'discovery-draft',tileIds:['ancient-tech','ancient-cruiser','ancient-orbital'],keepCount:2};
  expect(legalCommands(getPlayerView(state,'p')!).filter(c=>c.command.type==='resolve')).toHaveLength(3);
  state.seats[0].faction='portiids';state.pendingDecision={id:'project',owner:'p',kind:'reverse-engineering',battleId:'b',projects:[{kind:'technology',id:'fusion-drive'}]};
  expect(legalCommands(getPlayerView(state,'p')!).filter(c=>c.command.type==='resolve')).toHaveLength(2);
 });
});

describe('Guild permanent outposts',()=>{
 it('commits a remote outer draw once per round and keeps ordinary inward exploration',()=>{
  const state=fixture();state.seats[0].faction='spacing-guild';state.sectors=[{...state.sectors[1],position:{q:2,r:0},owner:'g'}];
  const drawn=processGameCommand(state,'p',{type:'explore',position:{q:3,r:-1},remote:true});expect(drawn.ok).toBe(true);if(!drawn.ok)return;
  expect(drawn.state.seats[0].scifi?.remoteExploreRound).toBe(state.round);const decision=drawn.state.pendingDecision;expect(decision?.kind).toBe('exploration');if(decision?.kind!=='exploration')return;
  const discarded=processGameCommand(drawn.state,'p',{type:'resolve',decisionId:decision.id,choice:{kind:'exploration',tileId:null,rotation:0}});expect(discarded.ok).toBe(true);if(!discarded.ok)return;
  discarded.state.activeSeatId='p';expect(processGameCommand(discarded.state,'p',{type:'explore',position:{q:3,r:-1},remote:true}).ok).toBe(false);
  discarded.state.sectors.push({...discarded.state.sectors[0],id:'outpost',tileId:'1',position:{q:3,r:-1},owner:'p',rotation:0});
  const expected=discarded.state.supplies.middle[0];const inward=processGameCommand(discarded.state,'p',{type:'explore',position:{q:2,r:-1}});expect(inward.ok).toBe(true);if(inward.ok&&inward.state.pendingDecision?.kind==='exploration')expect(inward.state.pendingDecision.drawnTileIds).toContain(expected);
 });
 it('places permanent markers without VP and cannot replace a captured marker',()=>{
  const state=fixture();state.seats[0].faction='spacing-guild';state.seats[0].scifi={guildPortalMarkers:1};const own=state.sectors.find(s=>s.owner==='p')!;
  const placed=processGameCommand(state,'p',{type:'place-guild-portal',sectorId:own.id});expect(placed.ok).toBe(true);if(!placed.ok)return;
  expect(placed.state.sectors.find(s=>s.id===own.id)?.guildPortalOwner).toBe('p');expect(placed.state.sectors.find(s=>s.id===own.id)?.portalVp).toBeUndefined();expect(placed.state.seats[0].scifi?.guildPortalMarkers).toBe(0);
  placed.state.sectors.find(s=>s.id===own.id)!.owner='g';const another=placed.state.sectors.find(s=>s.id!==own.id)!;another.owner='p';
  expect(processGameCommand(placed.state,'p',{type:'place-guild-portal',sectorId:another.id}).ok).toBe(false);expect(mapSector(placed.state.sectors.find(s=>s.id===own.id)!).warpPortal).toBe(true);
 });
});
