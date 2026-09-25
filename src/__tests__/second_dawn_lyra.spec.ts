import {describe, expect, it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {processGameCommand} from '../../shared/eclipse/engine';
import {getFaction} from '../../shared/eclipse/catalog';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import {calculateScore} from '../../shared/eclipse/scoring';
import {hasTech} from '../../shared/eclipse/rulesState';
import {resolveCombatChoice} from '../../shared/eclipse/battleEngine';
import {chooseAiCommand} from '../../shared/eclipse/ai';

const game = () => createGame({seed:238,warpPortals:true,seats:[{id:'lyra',faction:'lyra',controller:'human'},{id:'other',faction:'eridani',controller:'human'}],factionProfile:'expanded-v2'});

describe('Enlightened of Lyra',()=>{
 it('starts with its printed faction resources and nine unbuilt Shrines',()=>{
  const state=game(), seat=state.seats[0];
  expect(getFaction('lyra').homeSector).toBe(238);
  expect(seat.resources).toEqual({materials:3,science:4,money:2});
  expect(seat.shrines).toEqual([]);
 });
 it('places a Shrine during Research next to a matching planet and charges its board cost',()=>{
  const state=game();
  const home=state.sectors.find(s=>s.owner==='lyra')!;
  const result=processGameCommand(state,'lyra',{type:'place-shrine',sectorId:home.id,planetIndex:1,row:'science',column:0});
  expect(result.ok).toBe(true);
  if(result.ok){expect(result.state.seats[0].resources.science).toBe(2);expect(result.state.seats[0].shrines).toHaveLength(1);}
 });
 it('rejects a second Shrine in the same Research action',()=>{
  const state=game();const home=state.sectors.find(s=>s.owner==='lyra')!;
  const first=processGameCommand(state,'lyra',{type:'place-shrine',sectorId:home.id,planetIndex:1,row:'science',column:0});
  expect(first.ok).toBe(true);
  if(first.ok) expect(processGameCommand(first.state,'lyra',{type:'place-shrine',sectorId:home.id,planetIndex:1,row:'science',column:0}).ok).toBe(false);
 });
 it('allows the optional Shrine after the only technology activation is spent',()=>{
  const state=game();state.seats[0].resources.science=100;
  const research=legalCommands(getPlayerView(state,'lyra')!).find(candidate=>candidate.command.type==='research')?.command;
  expect(research?.type).toBe('research');if(!research)return;
  const bought=processGameCommand(state,'lyra',research);
  expect(bought.ok).toBe(true);if(!bought.ok)return;
  expect(bought.state.engine?.action?.remaining).toBe(0);
  const home=bought.state.sectors.find(sector=>sector.owner==='lyra')!;
  expect(processGameCommand(bought.state,'lyra',{type:'place-shrine',sectorId:home.id,planetIndex:1,row:'science',column:0}).ok).toBe(true);
 });
 it('scores only Shrines in sectors Lyra still controls',()=>{
  const base={playerId:'lyra',faction:'lyra' as const,reputation:[],ambassadors:0,discoveriesKeptForVp:0,traitor:false,researchTracks:[0,0,0] as const,ancientsOnBoard:0,resources:{materials:0,science:0,money:0}};
  const owned=calculateScore({...base,sectors:[{id:'a',printedVp:0,monoliths:0,portalVp:0 as const,shrines:2}]});
  const lost=calculateScore({...base,sectors:[]});
  expect(owned.species).toBe(2);expect(lost.species).toBe(0);
 });
 it('grants the wormhole generator ability when all three science Shrines leave the board',()=>{
  let state=game();state.seats[0].resources.science=100;
  const home=state.sectors.find(sector=>sector.owner==='lyra')!;
  for(let column=0;column<3;column++){
    const sector={...structuredClone(home),id:`lyra-shrine-${column}`,position:{q:column+10,r:0}};
    state.sectors.push(sector);
    state.engine!.action=null;
    const result=processGameCommand(state,'lyra',{type:'place-shrine',sectorId:sector.id,planetIndex:1,row:'science',column:column as 0|1|2});
    expect(result.ok).toBe(true);if(!result.ok)return;state=result.state;
  }
  expect(state.seats[0].shrines).toHaveLength(3);
  expect(hasTech(state.seats[0],'wormhole-generator')).toBe(true);
 });
 it('spends exactly one colony ship to reroll exactly one die',()=>{
  const state=game();const seat=state.seats[0];
  const dice=[{id:'a',face:1,damage:1,computer:0,weaponColor:'yellow' as const},{id:'b',face:6,damage:1,computer:0,weaponColor:'orange' as const}];
  state.engine!.battle={id:'battle',sectorId:'sector',attacker:'lyra',defender:'other',stage:'engagement',engagement:1,groups:[],groupIndex:0,retreats:[],kills:[],participants:['lyra','other'],retreated:[],dice:structuredClone(dice),attackingOwner:'lyra'};
  const decision={id:'reroll',owner:'lyra',kind:'super-joker' as const,battleId:'battle',dice:structuredClone(dice),remaining:0};
  state.pendingDecision=decision;
  resolveCombatChoice(state,'lyra',decision,{kind:'super-joker',action:'colony-reroll',dieId:'a'},[]);
  expect(seat.colonyShipsAvailable).toBe(2);
  expect(state.engine!.battle!.dice?.[1]).toEqual(dice[1]);
  expect(state.pendingDecision?.kind).toBe('super-joker');
 });
 it('recovers an open Research action and Shrine state from a saved snapshot',()=>{
  const state=game(),home=state.sectors.find(sector=>sector.owner==='lyra')!;
  const placed=processGameCommand(state,'lyra',{type:'place-shrine',sectorId:home.id,planetIndex:1,row:'science',column:0});
  expect(placed.ok).toBe(true);if(!placed.ok)return;
  const saved=JSON.parse(JSON.stringify(placed.state)) as typeof state;
  expect(saved.seats[0].shrines).toHaveLength(1);
  expect(saved.engine?.action?.shrinePlaced).toBe(true);
  expect(legalCommands(getPlayerView(saved,'lyra')!).some(candidate=>candidate.command.type==='place-shrine')).toBe(false);
  expect(processGameCommand(saved,'lyra',{type:'end-action'}).ok).toBe(true);
 });
 it('lets Lyra AI finish a seeded match without an illegal Shrine or reroll command',()=>{
  let state=createGame({seed:238,warpPortals:false,factionProfile:'expanded-v2',ruleOptions:{roundLimit:4},seats:[{id:'lyra',faction:'lyra',controller:'ai',pieceColor:'red'},{id:'other',faction:'orion',controller:'ai',pieceColor:'black'}]});
  let steps=0;
  while(state.phase!=='finished'&&steps<2500){
    const actor=state.pendingDecision?.owner??state.activeSeatId;
    expect(actor).toBeTruthy();if(!actor)break;
    const chosen=chooseAiCommand(getPlayerView(state,actor)!,238+steps);
    expect(chosen).toBeTruthy();if(!chosen)break;
    const result=processGameCommand(state,actor,chosen.command);
    expect(result.ok,JSON.stringify(chosen.command)).toBe(true);
    if(!result.ok)break;
    state=result.state;steps++;
  }
  expect(state.phase,`Stopped after ${steps} commands`).toBe('finished');
 },30000);
});
