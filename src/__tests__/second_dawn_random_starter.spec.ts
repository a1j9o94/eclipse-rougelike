import {describe,expect,it} from 'vitest';
import {createGame,type GameSetup} from '../../shared/eclipse/setup';
import {BASE_FACTIONS} from '../../shared/eclipse/catalog';
import {randomInt} from '../../shared/eclipse/random';
import {processGameCommand} from '../../shared/eclipse/engine';
import {advanceRound} from '../../shared/eclipse/rounds';

function config(count=3,seed=19):GameSetup{return {seed,warpPortals:true,seats:BASE_FACTIONS.filter(f=>f.species==='alien').slice(0,count).map((f,i)=>({id:`seat-${i+1}`,faction:f.id,controller:i?'ai':'human'}))};}
describe('fair initial starter',()=>{
 it.each([2,3,4,5,6])('uses the persisted unbiased stream and reaches every seat in %i-player games',count=>{
  const starters=new Set<string|null>();
  for(let seed=0;seed<48;seed++){
   const fixed=createGame(config(count,seed)),draw=randomInt(fixed.random,count);
   const randomized=createGame({...config(count,seed),randomizeStartingPlayer:true});
   expect(randomized.activeSeatId).toBe(fixed.seats[draw.value].id);
   expect(randomized.startSeatId).toBe(randomized.activeSeatId);
   expect(randomized.random).toEqual(draw.state);
   expect(randomized.seats).toEqual(fixed.seats);
   expect(randomized.supplies).toEqual(fixed.supplies);
   expect(randomized.sectors).toEqual(fixed.sectors);
   expect(randomized.seats[draw.value].resources).toEqual(fixed.seats[draw.value].resources);
   starters.add(randomized.activeSeatId);
  }
  expect(starters.size).toBe(count);
 });
 it('keeps existing deterministic fixtures and explicit opt-out identical',()=>{
  const c=config();expect(createGame({...c,randomizeStartingPlayer:false})).toEqual(createGame(c));
  expect(createGame({...c,randomizeStartingPlayer:true})).toEqual(createGame({...c,randomizeStartingPlayer:true}));
 });
 it('keeps clockwise seat order after a randomized start and first passer starts the following round',()=>{
  let state=createGame({...config(3,19),randomizeStartingPlayer:true});
  const first=state.activeSeatId!,index=state.seats.findIndex(s=>s.id===first),money=state.seats[index].resources.money;
  const result=processGameCommand(state,first,{type:'pass'});expect(result.ok).toBe(true);if(!result.ok)return;state=result.state;
  expect(state.activeSeatId).toBe(state.seats[(index+1)%3].id);
  expect(state.startSeatId).toBe(first);expect(state.firstPasser).toBe(first);
  expect(state.seats[index].resources.money).toBe(money+2);
  state.phase='cleanup';const draws=state.random.draws;advanceRound(state,[]);
  expect(state.round).toBe(2);expect(state.activeSeatId).toBe(first);expect(state.firstPasser).toBeNull();expect(state.random.draws).toBe(draws);
 });
});
