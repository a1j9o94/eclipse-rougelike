import {describe, expect, it} from 'vitest';
import {getPlayerView, getSpectatorView} from '../../shared/eclipse/protocol';
import {createGame} from '../../shared/eclipse/setup';

function fixture() {
  const state = createGame({seed: 71, seats: [{id:'a',faction:'hydran',controller:'human'}, {id:'b',faction:'planta',controller:'ai'}]});
  state.privateSeats.forEach((seat, index) => { seat.discoveriesKept = [`PRIVATE-${index}`]; seat.reputation = [4]; seat.storedDiscovery = `STORED-${index}`; });
  state.supplies.inner = ['HIDDEN-DECK'];
  state.pendingDecision = {id:'PRIVATE-DECISION',owner:'a',kind:'reputation',drawn:[4,3],capacity:4};
  state.engine!.scores = [{playerId:'a',sectors:1,research:2,ambassadors:0,portals:0,species:0,resourceTotal:0,reputation:4,discoveries:0,monoliths:0,traitor:0,variant:1,total:8}];
  return state;
}

describe('spectator public projection', () => {
  it('projects public board, economies and blueprints without private holdings, decisions, engine or seat identity', () => {
    const state = fixture(), saved = JSON.stringify(state), view = getSpectatorView(state);
    expect(view.kind).toBe('spectator');
    expect(view.seats).toEqual(state.seats);
    expect(view.sectors).toEqual(state.sectors);
    expect(view.technologyMarket).toEqual(state.technologyMarket);
    expect(view.waitingFor).toEqual({owner:'a',kind:'reputation'});
    expect(view.hiddenTileCounts[0]).toEqual({seatId:'a',reputation:1,discoveriesKept:1});
    for (const secret of ['PRIVATE-', 'STORED-', 'HIDDEN-DECK', 'viewerSeatId', 'privateSeats', 'pendingDecision', 'drawn', 'random', 'engine']) expect(JSON.stringify(view)).not.toContain(secret);
    expect(view).not.toHaveProperty('private');
    expect(view.scores?.[0]).toMatchObject({reputation:0,total:4});
    view.seats[0].resources.science = 900;
    expect(JSON.stringify(state)).toBe(saved);
    expect(getPlayerView(state,'a')?.private.discoveriesKept).toEqual(['PRIVATE-0']);
    expect(getPlayerView(state,'a')?.scores?.[0].reputation).toBe(4);
  });

  it('removes reputation-derived discovery bonuses until scores are public', () => {
    const state = fixture();
    state.seats[0].discoveryBonuses = ['reputation'];
    state.engine!.scores = [{...state.engine!.scores![0],reputation:9,variant:5,total:19}];
    expect(getSpectatorView(state).scores?.[0]).toMatchObject({reputation:0,variant:2,total:7});
    state.ruleOptions = {publicReputation:true};
    expect(getSpectatorView(state).scores?.[0]).toMatchObject({reputation:9,variant:5,total:19});
    state.ruleOptions.publicReputation = false;
    state.phase = 'finished';
    expect(getSpectatorView(state).scores?.[0]).toMatchObject({reputation:9,variant:5,total:19});
  });

  it.each([false,true])('respects independently configured public reputation (%s) and discoveries', publicReputation => {
    const state = fixture();
    state.rulesMode = 'less-random-v1';
    state.ruleOptions = {publicReputation,publicDiscoveries:!publicReputation};
    state.lessRandom = {explorationJokers:{a:true},outerPlacementsThisRound:{},discoverySupply:['PUBLIC-DISCOVERY'],reservedDiscoveries:{a:'PUBLIC-RESERVATION'},reputationSupply:[1,2],reputationBySeat:{a:[4]}};
    const view = getSpectatorView(state);
    expect(view.lessRandom?.reputationBySeat).toEqual(publicReputation ? {a:[4]} : {});
    expect(view.lessRandom?.discoverySupply).toEqual(publicReputation ? [] : ['PUBLIC-DISCOVERY']);
    expect(view.lessRandom?.reservedDiscoveries).toEqual(publicReputation ? {} : {a:'PUBLIC-RESERVATION'});
    expect(view.scores?.[0].reputation).toBe(publicReputation ? 4 : 0);
    expect(JSON.stringify(view)).not.toContain('PRIVATE-');
    state.phase = 'finished';
    expect(getSpectatorView(state).scores?.[0].reputation).toBe(4);
  });
});
