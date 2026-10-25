import {describe, expect, it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import type {PendingDecision, PlayerView} from '../../shared/eclipse/types';
import {automaticCombatCommand, combatAutomationPauseReason} from '../../shared/eclipse/combatAutomation';

function view(): PlayerView {
 const state=createGame({seed:41,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});
 const result=getPlayerView(state,'a')!;
 result.battle={id:'battle',sectorId:result.sectors[0].id,attacker:'a',defender:'b',stage:'engagement',engagement:1};
 return result;
}
function allocation(dice: Extract<PendingDecision,{kind:'combat-allocation'}>['dice']): Extract<PendingDecision,{kind:'combat-allocation'}> {
 return {id:'roll',owner:'a',kind:'combat-allocation',battleId:'battle',dice};
}
describe('battle-specific automatic combat policy',()=>{
 it('fires without consuming randomness or choosing a special decision',()=>{
  const v=view(); v.pendingDecision={id:'turn',owner:'a',kind:'combat-turn',battleId:'battle',shipType:'interceptor',destinationIds:[]};
  expect(automaticCombatCommand(v)).toEqual({type:'resolve',decisionId:'turn',choice:{kind:'combat-turn',retreatTo:null}});
  v.pendingDecision={...v.pendingDecision,forcedRetreat:true}; expect(automaticCombatCommand(v)).toBeNull();
  v.pendingDecision={id:'special',owner:'a',kind:'super-joker',battleId:'battle',dice:[],remaining:2}; expect(automaticCombatCommand(v)).toBeNull();
  v.pendingDecision={id:'bomb',owner:'a',kind:'bombardment',sectorId:'s',squareIds:['p'],hits:1};expect(automaticCombatCommand(v)).toBeNull();
 });
 it('finishes two kills instead of overkilling the first target and preserves forced miss assignments',()=>{
  const v=view();const sectorId=v.battle!.sectorId;
  v.ships=[{id:'one',owner:'b',type:'interceptor',sectorId,damage:0,arrival:1},{id:'two',owner:'b',type:'interceptor',sectorId,damage:0,arrival:1}];
  v.pendingDecision=allocation([{id:'big',face:6,damage:2,targets:['one','two'],hitTargets:['one','two']},{id:'small',face:6,damage:1,targets:['one','two'],hitTargets:['one','two']},{id:'miss',face:1,damage:1,targets:['one','two'],hitTargets:[]}]);
  const command=automaticCombatCommand(v);
  expect(command?.type==='resolve'&&command.choice.kind==='combat-allocation'&&command.choice.allocations).toEqual(expect.arrayContaining([{dieId:'small',targetId:'one'},{dieId:'big',targetId:'two'},{dieId:'miss',targetId:'one'}]));
 });
 it('splits antimatter only among hittable targets and omits Rift backfire-only assignments',()=>{
  const v=view(),sectorId=v.battle!.sectorId;
  v.ships=[{id:'one',owner:'b',type:'interceptor',sectorId,damage:0,arrival:1},{id:'two',owner:'b',type:'interceptor',sectorId,damage:0,arrival:1}];
  v.pendingDecision=allocation([{id:'split',face:6,damage:4,split:true,targets:['one','two'],hitTargets:['one','two']},{id:'backfire',face:6,damage:0,weaponColor:'magenta',targets:[],hitTargets:[]}]);
  const command=automaticCombatCommand(v);
  expect(command?.type==='resolve'&&command.choice.kind==='combat-allocation'&&command.choice.allocations).toEqual(expect.arrayContaining([{dieId:'split',targetId:'one',damage:1},{dieId:'split',targetId:'two',damage:3}]));
 });
 it('pauses on friendly losses, forced retreat, own special choices and battle completion',()=>{
  const v=view(),id=v.ships.find(s=>s.owner==='a')!.id;
  v.pendingDecision={id:'turn',owner:'a',kind:'combat-turn',battleId:'battle',shipType:'interceptor',destinationIds:[]};
  expect(combatAutomationPauseReason(v,'battle',[id])).toBeNull();
  expect(combatAutomationPauseReason(v,'battle',[id,'lost'])).toBe('ship-loss');
  v.pendingDecision={...v.pendingDecision,forcedRetreat:true};expect(combatAutomationPauseReason(v,'battle',[id])).toBe('forced-retreat');
  v.pendingDecision={id:'reward',owner:'a',kind:'resource-reward',count:1,perChoice:2};expect(combatAutomationPauseReason(v,'battle',[id])).toBe('special-decision');
  v.pendingDecision=null;v.waitingFor={kind:'super-joker',owner:'b'};expect(combatAutomationPauseReason(v,'battle',[id])).toBeNull();
  v.battle={...v.battle!,id:'another'};expect(combatAutomationPauseReason(v,'battle',[id])).toBe('complete');
 });
});
