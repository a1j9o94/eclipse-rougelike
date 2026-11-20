import { describe, expect, it } from 'vitest';
import { forecastFinalScores } from '../../shared/eclipse/aiEvaluation';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { scoreSeat } from '../../shared/eclipse/rounds';
import { createGame } from '../../shared/eclipse/setup';

function position(roundLimit = 8) {
  return createGame({ seed: 172, ruleOptions: { roundLimit }, seats: [
    { id: 'a', faction: 'orion', controller: 'ai' }, { id: 'b', faction: 'hydran', controller: 'ai' },
  ] });
}

describe('expected final victory points', () => {
  it('forecasts from the time and productive capacity left on the board', () => {
    const longGame = position(20);
    const early = getPlayerView(longGame, 'a')!;
    const shorter = { ...early, ruleOptions: { ...early.ruleOptions, roundLimit: 1 } };
    const predict = (view: typeof early) => forecastFinalScores(view).find(s => s.seatId === 'a')!.expectedVp;
    expect(predict(early)).toBeGreaterThan(predict(shorter));
    const middle = { ...early, round: 17 };
    const richer = structuredClone(middle);
    richer.seats[0].populationTracks.materials += 2;
    expect(predict(richer)).toBeGreaterThan(predict(middle));
    longGame.seats[0].technologies.grid.push('fusion-source', 'positron-computer', 'improved-computer', 'advanced-economy');
    expect(predict(getPlayerView(longGame, 'a')!)).toBeGreaterThan(predict(early));
  });

  it('uses actual score sheets at the end, including private bonuses and a resource tie', () => {
    const state = position();
    state.privateSeats[1].reputation = [4];
    state.phase = 'finished';
    state.engine!.scores = state.seats.map(s => scoreSeat(state, s));
    const view = getPlayerView(state, 'a')!;
    expect(forecastFinalScores(view)).toEqual(state.engine!.scores.map(s => ({ seatId: s.playerId, expectedVp: s.total })));
  });

  it('carries a frozen score forward and estimates the hidden part using only public counts', () => {
    const state = position();
    const rival = state.seats[1];
    rival.discoveryBonuses = ['reputation'];
    state.privateSeats[1].reputation = [2, 4];
    state.engine!.scores = [scoreSeat(state, rival)];
    rival.eliminated = true;
    const view = getPlayerView(state, 'a')!;
    const predict = () => forecastFinalScores(getPlayerView(state, 'a')!).find(s => s.seatId === 'b')!.expectedVp;
    const frozen = predict();
    expect(frozen).toBeGreaterThan(view.scores![0].total);
    state.round++;
    state.privateSeats[1].reputation = [1, 1];
    for (const sector of state.sectors) if (sector.owner === rival.id) sector.owner = null;
    expect(predict()).toBe(frozen);
    expect(forecastFinalScores(getPlayerView(state, 'b')!).find(s => s.seatId === 'b')!.expectedVp).toBe(state.engine!.scores[0].total);
  });
});
