import { describe, expect, it } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { advanceRound } from '../../shared/eclipse/rounds';

function conqueredDiscovery() {
  const state=createGame({seed:83,warpPortals:false,rulesMode:'less-random-v1',seats:[
    {id:'a',faction:'hydran',controller:'human'},
    {id:'b',faction:'planta',controller:'human'},
  ]});
  state.pendingDecision=null;state.engine!.decisions=[];state.phase='combat';state.engine!.aftermath='discovery';
  const sector=state.sectors.find(candidate=>candidate.owner==='a')!;
  sector.discovery=true;
  state.ships=state.ships.filter(ship=>ship.owner!=='a');
  state.ships.find(ship=>ship.owner==='b')!.sectorId=sector.id;
  expect(state.engine!.sectorDiscoveries).toEqual([]);
  return {state,sector};
}

describe('Less Random combat-aftermath discoveries',()=>{
  it('awards an undefended Ancient or Guardian discovery from the public supply without a hidden mapping',()=>{
    const {state,sector}=conqueredDiscovery(),available=[...state.lessRandom!.discoverySupply];
    advanceRound(state,[]);
    expect(state.pendingDecision).toMatchObject({kind:'discovery',owner:'b',sectorId:sector.id,tileId:'',availableTileIds:available});
    expect(sector.discovery).toBe(false);
    expect(state.engine!.sectorDiscoveries).toEqual([]);
  });

  it('clears an exhausted discovery token and completes aftermath without an empty choice',()=>{
    const {state,sector}=conqueredDiscovery();
    state.lessRandom!.discoverySupply=[];state.supplies.discovery=[];
    advanceRound(state,[]);
    expect(sector.discovery).toBe(false);
    expect(state.pendingDecision).toBeNull();
    expect(state.phase).toBe('upkeep');
  });
});
