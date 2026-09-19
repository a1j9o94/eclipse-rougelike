import {describe,it,expect} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {processGameCommand} from '../../shared/eclipse/engine';
import {sampleAiWorld} from '../../shared/eclipse/aiWorld';
import {chooseStrategicAiCommand} from '../../shared/eclipse/aiSearch';
import {evaluateStrategicPosition} from '../../shared/eclipse/aiEvaluation';
import {calculateScore} from '../../shared/eclipse/scoring';

function game(){return createGame({seed:27,warpPortals:true,seats:[{id:'a',faction:'orion',controller:'ai'},{id:'b',faction:'hydran',controller:'ai'}]});}
describe('bounded strategic AI search',()=>{
 it('samples hypothetical worlds from observable information and independent RNG',()=>{
  const state=game(), before=structuredClone(state), view=getPlayerView(state,'a')!;
  const world=sampleAiWorld(view,91);
  expect(world.sectors).toEqual(state.sectors);expect(world.seats).toEqual(state.seats);
  expect(world.privateSeats.find(p=>p.seatId==='a')).toEqual(view.private);
  expect(world.supplies.inner).toHaveLength(view.supplyCounts!.inner);
  expect(world.supplies.technology).toHaveLength(view.supplyCounts!.technology);
  expect(world).toEqual(sampleAiWorld(view,91));expect(state).toEqual(before);
  const other=structuredClone(state);other.supplies.inner.reverse();other.random={...other.random,value:1};other.privateSeats[1].reputation.fill(4);
  expect(sampleAiWorld(getPlayerView(other,'a')!,91)).toEqual(world);
 });
 it('returns the same legal decision with a deterministic work budget despite different actual hidden state',()=>{
  const state=game(), view=getPlayerView(state,'a')!, before=structuredClone(state);
  const options={difficulty:'hard' as const,maxNodes:12,budgetMs:1000,now:()=>0};
  const result=chooseStrategicAiCommand(view,15,options)!;
  expect(result).toEqual(chooseStrategicAiCommand(view,15,options));
  expect(result.search.nodes).toBeLessThanOrEqual(12);
  expect(processGameCommand(state,'a',result.command).ok).toBe(true);expect(state).toEqual(before);
 });
 it('honors an exhausted deadline and retains a legal fallback without pretending to have searched',()=>{
  const state=game();let time=0;
  const result=chooseStrategicAiCommand(getPlayerView(state,'a')!,31,{difficulty:'expert',budgetMs:0,maxNodes:0,now:()=>time++})!;
  expect(result.search.nodes).toBe(0);expect(result.search.completedDepth).toBe(0);
  expect(processGameCommand(state,'a',result.command).ok).toBe(true);
 });
 it('searches multiple complete own actions with intervening opponent turns',()=>{
  const state=game();
  const result=chooseStrategicAiCommand(getPlayerView(state,'a')!,88,{difficulty:'hard',maxNodes:80,budgetMs:1000,now:()=>0})!;
  expect(result.search.completedDepth).toBe(4);
  expect(result.search.opponentCommands).toBeGreaterThan(0);
  expect(result.search.principalVariation.length).toBeGreaterThanOrEqual(2);
 });
 it('values productive early economies but scores a finished game by actual outcome',()=>{
  const state=game(), view=getPlayerView(state,'a')!, richer=structuredClone(view);
  richer.seats[0].populationTracks.materials+=2;
  expect(evaluateStrategicPosition(richer,'a')).toBeGreaterThan(evaluateStrategicPosition(view,'a'));
 });
 it('treats a tied VP score with fewer resources as a loss',()=>{
  const view=getPlayerView(game(),'a')!;
  const score=calculateScore({playerId:'a',faction:'orion',reputation:[],ambassadors:0,sectors:[],discoveriesKeptForVp:0,traitor:false,researchTracks:[0,0,0],ancientsOnBoard:0,resources:{money:0,science:0,materials:0}});
  view.phase='finished';view.scores=[score,{...score,playerId:'b',resourceTotal:1}];
  expect(evaluateStrategicPosition(view,'a')).toBeLessThan(-90);
 });
 it('does not sample a unique ancient part already visible on a blueprint',()=>{
  const view=getPlayerView(game(),'a')!;view.seats[0].storedParts=['shard-hull'];
  const world=sampleAiWorld(view,5);
  const unknown=[...world.supplies.discovery,...world.engine!.sectorDiscoveries.map(d=>d.discoveryId),...world.privateSeats.filter(p=>p.seatId!=='a').flatMap(p=>p.discoveriesKept)];
  expect(unknown).not.toContain('shard-hull');
 });
 it('does not claim a complete search horizon after comparing just one root option',()=>{
  const result=chooseStrategicAiCommand(getPlayerView(game(),'a')!,51,{difficulty:'hard',maxNodes:1,budgetMs:1000,now:()=>0})!;
  expect(result.search.nodes).toBe(1);expect(result.search.cutoff).toBe(true);expect(result.search.completedDepth).toBe(0);
 });
 it('recognizes future production from colonizable planets and available colony ships',()=>{
  const view=getPlayerView(game(),'a')!;
  const sector=structuredClone(view.sectors.find(s=>s.owner==='b')!);sector.id='expansion';sector.owner='a';sector.population=[];sector.position={q:8,r:0};view.sectors.push(sector);
  view.seats[0].colonyShipsAvailable=3;
  const exhausted=structuredClone(view);exhausted.seats[0].colonyShipsAvailable=0;
  expect(evaluateStrategicPosition(view,'a')).toBeGreaterThan(evaluateStrategicPosition(exhausted,'a'));
 });
 it('values a favorable contested invasion before the end-of-round battle resolves',()=>{
  const view=getPlayerView(game(),'a')!, invasion=structuredClone(view);
  invasion.ships.find(s=>s.owner==='a')!.sectorId=invasion.sectors.find(s=>s.owner==='b')!.id;
  expect(evaluateStrategicPosition(invasion,'a')).toBeGreaterThan(evaluateStrategicPosition(view,'a'));
 });
 it('reaches five complete actions on Expert under a fixed work budget',()=>{
  const result=chooseStrategicAiCommand(getPlayerView(game(),'a')!,88,{difficulty:'expert',maxNodes:160,budgetMs:1000,now:()=>0})!;
  expect(result.search.completedDepth).toBe(5);expect(result.search.nodes).toBeLessThanOrEqual(160);
 });
 it('keeps Normal on the tournament-verified fast policy',()=>{
  const result=chooseStrategicAiCommand(getPlayerView(game(),'a')!,88,{difficulty:'normal'})!;
  expect(result.search.nodes).toBe(0);expect(result.search.completedDepth).toBe(0);
 });
});
