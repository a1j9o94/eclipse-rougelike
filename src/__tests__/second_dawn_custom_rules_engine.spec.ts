import {describe, expect, it} from 'vitest';
import {createGame, type GameSetup} from '../../shared/eclipse/setup';
import {discoveryAt} from '../../shared/eclipse/actions';
import {legalCommands} from '../../shared/eclipse/legal';
import {advanceRound} from '../../shared/eclipse/rounds';
import {processGameCommand} from '../../shared/eclipse/engine';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {gameRules, type GameRuleOptions} from '../../shared/eclipse/gameRules';
const base: GameSetup={seed:44,warpPortals:false,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]};
function game(ruleOptions:GameRuleOptions){return createGame({...base,ruleOptions});}
describe('independent game rules engine',()=>{
 it('plays ten Standard rounds without enabling variant supplies',()=>{
  const state=game({roundLimit:10});
  expect(state.lessRandom).toBeUndefined();expect(state.supplies.technology.length).toBeGreaterThan(0);
  state.phase='cleanup';state.round=8;advanceRound(state,[]);expect(state.round).toBe(9);expect(state.phase).toBe('action');
  state.phase='cleanup';state.round=10;advanceRound(state,[]);expect(state.phase).toBe('finished');
 });
 it.each([0,21,1.5,NaN])('rejects invalid round limit %s',(roundLimit)=>expect(()=>game({roundLimit})).toThrow());
 it('offers all Standard technologies without exploration or public information',()=>{
  const state=game({openTechnology:true});expect(state.supplies.technology).toEqual([]);expect(state.technologyMarket).toContain('flux-missile');expect(state.lessRandom).toBeUndefined();
 });
 it('offers public Standard discoveries without exposing hidden starting reputation',()=>{
  const state=game({publicDiscoveries:true});expect(state.lessRandom?.discoverySupply.length).toBeGreaterThan(0);
  expect(state.engine?.sectorDiscoveries).toEqual([]);expect(state.privateSeats[0].reputation).toHaveLength(2);
  expect(state.lessRandom?.reputationBySeat).toEqual({});expect(state.lessRandom?.reputationSupply).toEqual([]);
  expect(getPlayerView(state,'b')?.lessRandom?.reputationBySeat).toEqual({});
  const result=processGameCommand(state,'a',{type:'discard-reputation',values:[state.privateSeats[0].reputation[0]]});expect(result.ok).toBe(true);
  if(result.ok)expect(result.state.lessRandom?.reputationBySeat).toEqual({});
 });
 it('enables public reputation without public discoveries or jokers',()=>{
  const state=game({publicReputation:true});expect(state.pendingDecision?.kind).toBe('less-random-reputation');expect(state.lessRandom?.discoverySupply).toEqual([]);expect(state.seats[0].superJokers).toBeUndefined();
 });
 it('enables variant inventory and developments while keeping discoveries private',()=>{
  const state=game({technologyVariant:true,discoveryVariant:true});
  expect([...state.technologyMarket,...state.supplies.technology]).not.toContain('flux-missile');expect(state.supplies.technology.length).toBeGreaterThan(0);
  expect(state.lessRandom).toBeUndefined();state.seats[0].resources.money=30;
  const before=state.supplies.discovery.length;
  const result=processGameCommand(state,'a',{type:'research-development',developmentId:'ancient-labs-development'});expect(result.ok).toBe(true);
  if(result.ok){expect(result.state.pendingDecision?.kind).toBe('discovery');expect(result.state.pendingDecision?.availableTileIds).toBeUndefined();expect(result.state.supplies.discovery).toHaveLength(before-1);}
 });
 it('enables exploration without leaking other supplies or granting combat jokers',()=>{
  const state=game({explorationRules:true});expect(state.supplies.outer.length).toBeGreaterThan(createGame(base).supplies.outer.length);expect(state.lessRandom?.explorationJokers).toEqual({a:true,b:true});expect(state.lessRandom?.discoverySupply).toEqual([]);expect(state.lessRandom?.reputationBySeat).toEqual({});expect(state.seats[0].superJokers).toBeUndefined();
 });
 it('can turn features off in the complete preset',()=>{
  const state=createGame({...base,rulesMode:'less-random-v1',ruleOptions:{publicReputation:false,openTechnology:false,combatJokers:false}});
  expect(state.privateSeats[0].reputation).toHaveLength(2);expect(state.lessRandom?.reputationBySeat).toEqual({});expect(state.supplies.technology.length).toBeGreaterThan(0);expect(state.seats[0].superJokers).toBeUndefined();
 });
 it('rejects incompatible Rift Cannon options',()=>{
  expect(()=>createGame({...base,riftCannons:true,ruleOptions:{combatJokers:true}})).toThrow();expect(()=>createGame({...base,riftCannons:true,ruleOptions:{technologyVariant:true}})).toThrow();
 });
 it('uses public discovery choices with ordinary inventory and consumes the selected copy',()=>{
  const state=game({publicDiscoveries:true});const sector=state.sectors.find(s=>s.owner==='a')!;sector.discovery=true;
  discoveryAt(state,state.seats[0],sector);
  state.pendingDecision=state.engine!.decisions.shift()!;
  const decision=state.pendingDecision!;expect(decision.availableTileIds).toContain('money');
  const before=state.supplies.discovery.length;
  const result=processGameCommand(state,'a',{type:'resolve',decisionId:decision.id,choice:{kind:'discovery',option:'use',discoveryId:'money'}});
  expect(result.ok).toBe(true);if(result.ok){expect(result.state.supplies.discovery).toHaveLength(before-1);expect(result.state.lessRandom?.discoverySupply).toEqual(result.state.supplies.discovery);expect(result.state.seats[0].resources.money).toBe(state.seats[0].resources.money+8);}
 });
 it('draws two exploration choices independently and leaves discoveries hidden',()=>{
  const state=game({explorationRules:true});const command=legalCommands(getPlayerView(state,'a')).find(c=>c.command.type==='explore')!.command;
  const result=processGameCommand(state,'a',command);expect(result.ok).toBe(true);
  if(result.ok){expect(result.state.pendingDecision).toMatchObject({kind:'exploration',redrawAvailable:true});if(result.state.pendingDecision?.kind==='exploration')expect(result.state.pendingDecision.drawnTileIds).toHaveLength(2);}
 });
 it('enables faction trades separately from inventory and game length',()=>{
  const state=game({factionVariant:true});state.seats[0].resources.money=10;
  const result=processGameCommand(state,'a',{type:'trade',from:'money',to:'science',amount:3});expect(result.ok).toBe(true);
  if(result.ok)expect(result.state.seats[0].resources.money).toBe(5);
  const standard=createGame(base);standard.seats[0].resources.money=10;
  const ordinary=processGameCommand(standard,'a',{type:'trade',from:'money',to:'science',amount:3});expect(ordinary.ok).toBe(true);
  if(ordinary.ok)expect(ordinary.state.seats[0].resources.money).toBe(1);
 });
 it('requires Terran faction bans only when faction amendments are enabled',()=>{
  const config={...base,seats:[{id:'a',faction:'terran-directorate' as const,controller:'human' as const},{id:'b',faction:'hydran' as const,controller:'human' as const}]};
  expect(()=>createGame({...config,ruleOptions:{openTechnology:true}})).not.toThrow();
  expect(()=>createGame({...config,ruleOptions:{factionVariant:true}})).toThrow();
  expect(()=>createGame({...config,ruleOptions:{factionVariant:true},seats:[{...config.seats[0],bannedFaction:'planta'},config.seats[1]]})).not.toThrow();
 });

 it('honors custom portal modules while preserving historical preset setup',()=>{
  const historical=createGame({...base,rulesMode:'less-random-v1',warpPortals:true});expect(historical.engine?.warpPortals).toBe(false);
  const customized=createGame({...base,rulesMode:'less-random-v1',warpPortals:true,ruleOptions:{}});expect(customized.engine?.warpPortals).toBe(true);expect(customized.technologyMarket).not.toContain('warp-portal');
  const independent=createGame({...base,warpPortals:true,ruleOptions:{openTechnology:true}});expect(independent.engine?.warpPortals).toBe(true);expect(independent.technologyMarket).toContain('warp-portal');
 });

 it('sets up all 256 combinations with independent inventories, legal choices and private reputation',()=>{
  const flags=['openTechnology','publicDiscoveries','publicReputation','explorationRules','combatJokers','technologyVariant','discoveryVariant','factionVariant'] as const;
  for(let mask=0;mask<256;mask++){
   const options:GameRuleOptions={roundLimit:10};flags.forEach((flag,index)=>{options[flag]=Boolean(mask&(1<<index));});
   const state=createGame({...base,riftCannons:false,ruleOptions:options});
   expect(gameRules(state),`resolved options ${mask}`).toEqual(options);
   expect(state.supplies.technology.length===0,`technology visibility ${mask}`).toBe(options.openTechnology);
   expect([...state.technologyMarket,...state.supplies.technology].includes('flux-missile'),`technology inventory ${mask}`).toBe(!options.technologyVariant);
   expect(state.seats[0].superJokers===5,`combat Jokers ${mask}`).toBe(options.combatJokers);
   expect(state.lessRandom?.explorationJokers.a===true,`exploration Joker ${mask}`).toBe(options.explorationRules);
   const actor=state.pendingDecision?.owner??state.activeSeatId!;
   const actorView=getPlayerView(state,actor)!;
   expect(legalCommands(actorView).length,`legal choices ${mask}`).toBeGreaterThan(0);
   const opponentView=getPlayerView(state,'b')!;
   if(!options.publicReputation){
    expect(state.privateSeats[0].reputation,`private starting reputation ${mask}`).toHaveLength(2);
    expect(opponentView.lessRandom?.reputationBySeat??{},`public reputation holdings ${mask}`).toEqual({});
    expect(opponentView.lessRandom?.reputationSupply??[],`public reputation supply ${mask}`).toEqual([]);
   }else expect(state.pendingDecision?.kind,`public reputation choice ${mask}`).toBe('less-random-reputation');
   if(!options.publicDiscoveries)expect(opponentView.lessRandom?.discoverySupply??[],`hidden discovery supply ${mask}`).toEqual([]);
   else expect(opponentView.lessRandom?.discoverySupply,`public discovery supply ${mask}`).toEqual(state.supplies.discovery);
  }
 });

 it.each([{name:'hidden variant',options:{discoveryVariant:true}},{name:'public reserved redemption',options:{publicDiscoveries:true}}])('rejects replacement discovery IDs for $name while accepting legacy omission',({options})=>{
  const state=game(options);state.pendingDecision={id:'fixed-discovery',kind:'discovery',owner:'a',tileId:'money',options:['keep','use']};
  const before=structuredClone(state);
  const rejected=processGameCommand(state,'a',{type:'resolve',decisionId:'fixed-discovery',choice:{kind:'discovery',option:'use',discoveryId:'ancient-might'}});
  expect(rejected.ok).toBe(false);expect(state).toEqual(before);
  const accepted=processGameCommand(state,'a',{type:'resolve',decisionId:'fixed-discovery',choice:{kind:'discovery',option:'use'}});
  expect(accepted.ok).toBe(true);if(accepted.ok)expect(accepted.state.seats[0].resources.money).toBe(state.seats[0].resources.money+8);
 });
 it('rejects unavailable discovery replacements in public choices',()=>{
  const state=game({publicDiscoveries:true});state.pendingDecision={id:'public-discovery',kind:'discovery',owner:'a',tileId:'',availableTileIds:['money'],options:['keep','use']};
  const result=processGameCommand(state,'a',{type:'resolve',decisionId:'public-discovery',choice:{kind:'discovery',option:'use',discoveryId:'ancient-might'}});
  expect(result.ok).toBe(false);
 });

});
