import { describe, expect, it } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { advanceRound } from '../../shared/eclipse/rounds';
import { processGameCommand } from '../../shared/eclipse/engine';
import { eligibleDiplomacyPartners } from '../../shared/eclipse/decisions';
import type { GameState } from '../../shared/eclipse/types';
function game(): GameState {
  const state = createGame({seed: 27, warpPortals: true, seats: [
    {id:'a',faction:'terran-directorate',controller:'human'},
    {id:'b',faction:'hydran',controller:'human'},
    {id:'c',faction:'planta',controller:'human'},
    {id:'d',faction:'draco',controller:'human'},
  ]});
  for (const sector of state.sectors) if (sector.owner === 'a' || sector.owner === 'b') sector.portalVp = 1;
  state.phase = 'combat'; state.engine!.aftermath = 'done'; state.engine!.combatInitialized = true;
  state.engine!.battleSectors = []; state.seats.forEach(s => {s.passed = true;});
  return state;
}
describe('end-of-combat diplomacy', () => {
  it('persists an eligible window before upkeep and resumes it after a rejected offer', () => {
    const state = game(); advanceRound(state, []);
    expect(state.phase).toBe('combat');
    const d = state.pendingDecision;
    expect(d).toMatchObject({kind:'diplomacy-window',owner:'a',eligibleSeatIds:['b']});
    if (d?.kind !== 'diplomacy-window') return;
    const offered = processGameCommand(structuredClone(state), 'a', {type:'resolve',decisionId:d.id,choice:{kind:'diplomacy-window',offerTo:'b',resource:'money'}});
    expect(offered.ok).toBe(true); if (!offered.ok) return;
    const response = offered.state.pendingDecision;
    expect(response).toMatchObject({kind:'diplomacy',owner:'b'}); if (!response) return;
    const rejected = processGameCommand(offered.state, 'b', {type:'resolve',decisionId:response.id,choice:{kind:'diplomacy',accept:false,resource:'science'}});
    expect(rejected.ok).toBe(true); if (!rejected.ok) return;
    expect(rejected.state.pendingDecision).toMatchObject({kind:'diplomacy-window',owner:'a',declinedSeatIds:['b']});
    expect(rejected.state.phase).toBe('combat');
  });
  it('records passes once and enters upkeep only after eligible seats finish', () => {
    let state = game(); advanceRound(state, []);
    for (const actor of ['a','b']) {
      const d = state.pendingDecision!;
      expect(d.owner).toBe(actor);
      const result = processGameCommand(state, actor, {type:'resolve',decisionId:d.id,choice:{kind:'diplomacy-window',offerTo:null,resource:'money'}});
      expect(result.ok).toBe(true); if (!result.ok) return; state = result.state;
    }
    expect(state.phase).toBe('upkeep'); expect(state.pendingDecision).toBeNull();
    expect(state.engine!.diplomacyDone).toEqual(['a','b','c','d']);
  });
  it('rejects ships sharing territory and preserves ambassador limits', () => {
    const state = game();
    expect(eligibleDiplomacyPartners(state,state.seats[0])).toEqual(['b']);
    state.ships.find(s=>s.owner==='a')!.sectorId = state.ships.find(s=>s.owner==='b')!.sectorId;
    expect(eligibleDiplomacyPartners(state,state.seats[0])).toEqual([]);
  });
  it('allows a window to make space by returning reputation before exchange', () => {
    const state = game(); state.privateSeats.find(s=>s.seatId==='b')!.reputation = [1,1,1,1];
    expect(eligibleDiplomacyPartners(state,state.seats[0])).toEqual([]);
    expect(eligibleDiplomacyPartners(state,state.seats[0],true)).toEqual(['b']);
    advanceRound(state, []); expect(state.pendingDecision?.kind).toBe('diplomacy-window');
  });
  it('allows the offeree to return reputation while the offer waits, then exchanges ambassadors once', () => {
    const initial = game(); initial.privateSeats.find(s=>s.seatId==='b')!.reputation = [1,1,1,1];
    advanceRound(initial, []);
    const d = initial.pendingDecision!;
    const offered = processGameCommand(initial, 'a', {type:'resolve',decisionId:d.id,choice:{kind:'diplomacy-window',offerTo:'b',resource:'money'}});
    expect(offered.ok).toBe(true); if (!offered.ok) return;
    const response = offered.state.pendingDecision!;
    const blocked = processGameCommand(offered.state, 'b', {type:'resolve',decisionId:response.id,choice:{kind:'diplomacy',accept:true,resource:'science'}});
    expect(blocked.ok).toBe(false);
    const returned = processGameCommand(offered.state, 'b', {type:'discard-reputation',values:[1,1]});
    expect(returned.ok).toBe(true); if (!returned.ok) return;
    expect(returned.state.pendingDecision?.id).toBe(response.id);
    const accepted = processGameCommand(returned.state, 'b', {type:'resolve',decisionId:response.id,choice:{kind:'diplomacy',accept:true,resource:'science'}});
    expect(accepted.ok).toBe(true); if (!accepted.ok) return;
    expect(accepted.state.seats[0].ambassadors).toEqual(['b']);
    expect(accepted.state.seats[1].ambassadors).toEqual(['a']);
    expect(accepted.state.phase).toBe('upkeep');
  });
  it('does not duplicate a persisted window when round progression is retried', () => {
    const state = game(); advanceRound(state, []); const serialized = JSON.stringify(state);
    advanceRound(state, []); expect(JSON.stringify(state)).toBe(serialized);
  });

  it('allows action-turn offers between activations without spending the open action', () => {
    const state = game(); state.phase = 'action'; state.activeSeatId = 'a';
    state.seats.forEach(s=>{s.passed=false;}); state.engine!.action = {owner:'a',action:'explore',remaining:1};
    const offered = processGameCommand(state,'a',{type:'offer-diplomacy',to:'b',resource:'money'});
    expect(offered.ok).toBe(true); if (!offered.ok) return;
    expect(offered.state.pendingDecision?.kind).toBe('diplomacy');
    expect(offered.state.engine!.action).toEqual(state.engine!.action);
  });

});
