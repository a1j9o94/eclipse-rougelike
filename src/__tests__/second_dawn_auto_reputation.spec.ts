import {describe,expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {advanceCombat,reputationCapacity} from '../../shared/eclipse/battleEngine';
import {processGameCommand} from '../../shared/eclipse/engine';
import {commitCommand,getPlayerView,visibleEvents} from '../../shared/eclipse/protocol';
import {BASE_FACTIONS} from '../../shared/eclipse/catalog';
import {projectHistoryEntry} from '../../shared/eclipse/history';
import type {GameEvent,GameState} from '../../shared/eclipse/types';
function game(count=2){return createGame({seed:72,seats:BASE_FACTIONS.filter(f=>f.species==='alien').slice(0,count).map((f,i)=>({id:String.fromCharCode(97+i),faction:f.id,controller:'human'}))});}
function saved(owned:number[],drawn:number[],capacity=4){const state=game();state.privateSeats[0].reputation=owned;state.supplies.reputation=[1,2,3];state.pendingDecision={id:'old-reputation',owner:'a',kind:'reputation',drawn,capacity};return state;}
function resolve(state:GameState,kept?:number[]){const result=processGameCommand(state,'a',{type:'resolve',decisionId:state.pendingDecision!.id,choice:{kind:'reputation',...(kept?{kept}:{})}});expect(result.ok).toBe(true);if(!result.ok)throw new Error(result.error.message);return result;}
function total(state:GameState){return [...state.supplies.reputation,...state.privateSeats.flatMap(s=>s.reputation),...(state.pendingDecision?.kind==='reputation'?state.pendingDecision.drawn:[])].sort();}
describe('automatic best reputation award',()=>{
 it('keeps only the highest single new draw even when several spaces are free',()=>{
  const state=saved([2],[1,4,3]),before=total(state),result=resolve(state);
  expect(result.state.privateSeats[0].reputation).toEqual([4,2]);expect(total(result.state)).toEqual(before);
  expect(result.state.privateSeats[0].reputationSummary).toMatchObject({drawn:[1,4,3],selected:4,kept:[4,2],returned:[1,3],round:1});
  expect(result.state.pendingDecision).toBeNull();expect(state.pendingDecision?.kind).toBe('reputation');
 });

 it.each([0,1,2,3,4,5])('retains at most one new tile for a draw of %i tiles',count=>{
  const drawn=[1,4,3,4,2].slice(0,count),state=saved([],drawn),result=resolve(state);
  expect(result.state.privateSeats[0].reputation).toEqual(count?[Math.max(...drawn)]:[]);
  expect(total(result.state)).toEqual(total(state));
 });
 it('replaces the lowest owned value when a full track improves',()=>{
  const state=saved([1,3,3,4],[2,4,1]),result=resolve(state);
  expect(result.state.privateSeats[0].reputation).toEqual([4,4,3,3]);expect(result.state.privateSeats[0].reputationSummary?.selected).toBe(4);expect(total(result.state)).toEqual(total(state));
 });
 it('keeps existing tiles on tied or worse draws and returns every unused tile',()=>{
  for(const drawn of [[1,2,3],[3,3],[4,4]]){
   const state=saved([4,4,4,4],drawn),result=resolve(state);
   expect(result.state.privateSeats[0].reputation).toEqual([4,4,4,4]);expect(result.state.privateSeats[0].reputationSummary?.selected).toBeNull();expect(total(result.state)).toEqual(total(state));
  }
 });
 it('does not honor a legacy client selecting a lower-value but otherwise legal tile',()=>{
  const result=resolve(saved([3],[1,4]),[3,1]);expect(result.state.privateSeats[0].reputation).toEqual([4,3]);
 });
 it.each(BASE_FACTIONS.map(f=>[f.id] as const))('obeys %s slots and ambassadors while conserving the entire multiset',faction=>{
  for(let ambassadors=0;ambassadors<=5;ambassadors++){
   const state=saved([1,2,3,4],[1,2,3,4,4]);state.seats[0].faction=faction;state.seats[0].ambassadors=Array.from({length:ambassadors},(_,i)=>`ally${i}`);
   const capacity=reputationCapacity(state.seats[0]);state.pendingDecision={...state.pendingDecision!,capacity};
   const result=resolve(state),held=result.state.privateSeats[0].reputation;
   expect(held).toEqual([4,4,3,2,1].slice(0,capacity));expect(total(result.state)).toEqual(total(state));
  }
 });
 it('filters draw, selected, kept and returned values from every opponent view and public history',()=>{
  const state=saved([1],[4,3]),result=resolve(state),summary=result.state.privateSeats[0].reputationSummary;
  expect(summary).toBeDefined();expect(getPlayerView(result.state,'a')?.private.reputationSummary).toEqual(summary);
  expect(getPlayerView(result.state,'b')?.private.reputationSummary).toBeUndefined();expect(JSON.stringify(getPlayerView(result.state,'b'))).not.toContain('reputationSummary');
  expect(visibleEvents(result.events,'a').some(e=>e.visibility!=='public')).toBe(true);
  expect(visibleEvents(result.events,'b').every(e=>e.visibility==='public')).toBe(true);
  const entry={actor:'a',request:{commandId:'award',expectedRevision:0,command:{type:'resolve' as const,decisionId:'old-reputation',choice:{kind:'reputation' as const}}},receipt:{commandId:'award',revision:1,eventCount:result.events.length},events:result.events};
  expect(JSON.stringify(projectHistoryEntry(entry,state.seats,1))).not.toContain('Drew reputation');
 });
 it('resumes old decisions with normal identity, stale and duplicate enforcement',()=>{
  const state=saved([2],[4,3]),pin={rulesVersion:state.rulesVersion,catalogVersion:state.catalogVersion},request={commandId:'resume',expectedRevision:0,command:{type:'resolve' as const,decisionId:'old-reputation',choice:{kind:'reputation' as const}}};
  const committed=commitCommand({state,journal:[]},'a',request,pin,processGameCommand);expect(committed.ok).toBe(true);if(!committed.ok)return;
  expect(commitCommand(committed.aggregate,'a',request,pin,processGameCommand)).toMatchObject({ok:true,duplicate:true});
  expect(commitCommand({state,journal:[]},'b',request,pin,processGameCommand)).toMatchObject({ok:false,error:{code:'DECISION_PENDING'}});
  expect(commitCommand(committed.aggregate,'a',{...request,commandId:'stale'},pin,processGameCommand)).toMatchObject({ok:false,error:{code:'STALE_REVISION'}});
 });
 it.each([2,3,4,5,6])('settles fresh draws in %i-seat games without prompts, with replay and conserved tiles',count=>{
  const state=game(count);for(const seat of state.privateSeats){state.supplies.reputation.push(...seat.reputation);seat.reputation=[];}state.phase='combat';state.activeSeatId=null;state.seats.forEach(s=>{s.passed=true;});
  const target=state.sectors.find(s=>s.owner==='a')!;state.ships=state.ships.filter(s=>s.owner==='a'||s.owner==='b');state.ships.forEach(s=>{s.sectorId=target.id;});
  advanceCombat(state,[]);expect(state.engine!.battle).not.toBeNull();state.engine!.battle!.kills=Array.from({length:6},()=>({owner:'a',value:3}));state.ships=state.ships.filter(s=>s.owner==='a');state.pendingDecision=null;
  const copy=structuredClone(state),before=total(state),events:GameEvent[]=[],copyEvents:GameEvent[]=[];
  advanceCombat(state,events);advanceCombat(copy,copyEvents);
  expect(state.pendingDecision?.kind).not.toBe('reputation');expect(state.privateSeats[0].reputationSummary?.drawn).toHaveLength(5);
  expect(state.privateSeats.every(s=>s.reputation.length<=1)).toBe(true);expect(total(state)).toEqual(before);expect(copy).toEqual(state);expect(copyEvents).toEqual(events);
 });
});
