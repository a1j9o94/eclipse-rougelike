import {describe,it,expect} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {runningScore} from '../second-dawn-game/runningScore';
import {scoreSeat} from '../../shared/eclipse/rounds';

describe('public Less Random scoring',()=>{
 it('shows public reputation, unused joker, discovery bonuses and filled lab consistently',()=>{
  const state=createGame({seed:18,rulesMode:'less-random-v1',warpPortals:false,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'orion',controller:'human'}]});
  const b=state.seats[1];state.privateSeats[1].reputation=[3,4];state.lessRandom!.reputationBySeat.b=[3,4];b.discoveryBonuses=['reputation'];b.developments=[{id:'quantum-labs',technologyId:'improved-hull'}];
  const score=runningScore(getPlayerView(state,'a')!,'b');
  expect(score.hiddenReputation).toBe(false);expect(score.breakdown.reputation).toBe(7);expect(score.breakdown.variant).toBe(5);expect(score.breakdown.total).toBe(scoreSeat(state,b).total);
  delete state.rulesMode;delete state.lessRandom;b.developments=[];b.discoveryBonuses=[];
  expect(runningScore(getPlayerView(state,'a')!,'b').breakdown.reputation).toBe(0);
 });
});
