import {describe,expect,it} from 'vitest';
import type {PlayerView} from '../../shared/eclipse/types';
import {queuePlanningView} from './queuePlanningView';

describe('queuePlanningView',()=>{
 it('permits off-turn drafting without changing the authoritative view',()=>{
  const live={phase:'upkeep',viewerSeatId:'human',activeSeatId:'ai',actionProgress:null,pendingDecision:null,waitingFor:'ai',seats:[{id:'human',passed:true}]} as unknown as PlayerView;
  const planned=queuePlanningView(live,true);
  expect(planned.phase).toBe('action');
  expect(planned.activeSeatId).toBe('human');
  expect(planned.seats[0].passed).toBe(false);
  expect(live.phase).toBe('upkeep');
  expect(live.seats[0].passed).toBe(true);
  expect(queuePlanningView(live,false)).toBe(live);
 });
});
