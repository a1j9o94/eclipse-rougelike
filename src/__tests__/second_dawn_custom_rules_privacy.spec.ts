import {describe,expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {sampleAiWorld} from '../../shared/eclipse/aiWorld';
import {scoreSeat} from '../../shared/eclipse/rounds';
import {minorSpeciesFutureValue,evaluateMinorSpeciesPurchase} from '../../shared/eclipse/aiMinorSpecies';

function game(){return createGame({seed:19,warpPortals:false,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'orion',controller:'ai'}]});}
function bookkeeping(){return {explorationJokers:{a:true,b:true},outerPlacementsThisRound:{a:0,b:0},discoverySupply:['money'],reputationSupply:[1,2,3],reputationBySeat:{a:[1],b:[4,3]},reservedDiscoveries:{a:null,b:'science'}};}

describe('independent rules protocol and AI worlds',()=>{
 it('carries custom game length and public discoveries through views and sampled worlds without publishing reputation',()=>{
  const state=game();state.ruleOptions={roundLimit:10,publicDiscoveries:true};state.lessRandom=bookkeeping();
  const view=getPlayerView(state,'a')!;
  expect(view.ruleOptions).toEqual(state.ruleOptions);
  expect(view.lessRandom?.reputationSupply).toEqual([]);expect(view.lessRandom?.reputationBySeat).toEqual({});
  expect(view.lessRandom?.discoverySupply).toEqual(['money']);
  const world=sampleAiWorld(view,17);
  expect(world.ruleOptions).toEqual(state.ruleOptions);expect(world.supplies.discovery).toEqual(['money']);
  expect(world.engine?.sectorDiscoveries).toEqual([]);expect(world.privateSeats[1].storedDiscovery).toBe('science');
 });
 it('public reputation never publishes hidden discovery supply or reserved tiles',()=>{
  const state=game();state.ruleOptions={publicReputation:true};state.lessRandom=bookkeeping();
  state.privateSeats[1].reputation=[4,3];
  const view=getPlayerView(state,'a')!;
  expect(view.lessRandom?.reputationBySeat.b).toEqual([4,3]);expect(view.lessRandom?.discoverySupply).toEqual([]);expect(view.lessRandom?.reservedDiscoveries).toEqual({});
  const world=sampleAiWorld(view,21);
  expect(world.privateSeats[1].reputation).toEqual([4,3]);expect(world.privateSeats[1].storedDiscovery).toBeUndefined();
  expect(world.supplies.discovery).toHaveLength(view.supplyCounts!.discovery);
 });
 it('conceals reputation-derived Ancient Might points in opponent frozen scores until game end',()=>{
  const state=game();state.ruleOptions={discoveryVariant:true,publicDiscoveries:true};
  state.privateSeats[1].reputation=[4,3];state.seats[1].discoveryBonuses=['reputation'];state.seats[1].eliminated=true;
  const score=scoreSeat(state,state.seats[1]);state.engine!.scores=[score];
  const hidden=getPlayerView(state,'a')!.scores![0];expect(hidden.reputation).toBe(0);expect(hidden.variant).toBe((score.variant??0)-2);expect(hidden.total).toBe(score.total-9);
  expect(getPlayerView(state,'b')!.scores![0]).toEqual(score);
  state.phase='finished';expect(getPlayerView(state,'a')!.scores![0]).toEqual(score);
 });
 it('samples the variant component catalog independently from revealing technology and discoveries',()=>{
  const state=game();state.ruleOptions={technologyVariant:true,discoveryVariant:true};
  const view=getPlayerView(state,'a')!;view.technologyMarket=[];view.supplyCounts!.technology=1000;view.supplyCounts!.discovery=1000;
  const world=sampleAiWorld(view,22);
  expect(world.supplies.technology).not.toContain('neutron-absorber');expect(world.supplies.technology).not.toContain('flux-missile');
  expect(world.supplies.discovery).toContain('artifact-codex');expect(world.supplies.discovery).not.toContain('ion-missile');
  view.ruleOptions={openTechnology:true};expect(sampleAiWorld(view,22).supplies.technology).toEqual([]);
 });
 it('values population purchases using the custom income horizon',()=>{
  const view=getPlayerView(game(),'a')!;view.round=8;
  const command={type:'buy-minor-species',minorSpeciesId:'population',resource:'science'} as const;
  const standard=evaluateMinorSpeciesPurchase(view,command);view.ruleOptions={roundLimit:10};
  expect(evaluateMinorSpeciesPurchase(view,command)).toBeGreaterThan(standard);
 });
 it('bases future species value on the chosen final round',()=>{
  const view=getPlayerView(game(),'a')!;view.round=8;view.ruleOptions={roundLimit:10};view.seats[0].minorSpecies=[{id:'researchers'}];
  expect(minorSpeciesFutureValue(view,view.seats[0])).toBeGreaterThan(0);
 });
});
