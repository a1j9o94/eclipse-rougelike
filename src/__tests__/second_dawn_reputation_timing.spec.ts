import { describe,it,expect } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { commitCommand } from '../../shared/eclipse/protocol';
import { processGameCommand } from '../../shared/eclipse/engine';
describe('reputation return timing at authoritative boundary',()=>{
 it('allows an owned seat to return reputation outside its action turn',()=>{
  const state=createGame({seed:1,warpPortals:true,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'human'}]});const value=state.privateSeats[1].reputation[0];
  const result=commitCommand({state,journal:[]},'b',{commandId:'return',expectedRevision:0,command:{type:'discard-reputation',values:[value]}},{rulesVersion:state.rulesVersion,catalogVersion:state.catalogVersion},processGameCommand);
  expect(result.ok).toBe(true);if(result.ok){expect(result.aggregate.state.privateSeats[1].reputation).toHaveLength(1);expect(result.aggregate.state.activeSeatId).toBe('a');}
 });
});
