import {describe, expect, it} from 'vitest';
import {chooseAiCommand} from '../../shared/eclipse/ai';
import {sampleAiWorld} from '../../shared/eclipse/aiWorld';
import {processGameCommand} from '../../shared/eclipse/engine';
import {gameRules} from '../../shared/eclipse/gameRules';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {createGame, type GameSetup} from '../../shared/eclipse/setup';
const configurations: Array<{name:string;config:Pick<GameSetup,'rulesMode'|'ruleOptions'>}>=[
 {name:'ten-round Standard',config:{ruleOptions:{roundLimit:10}}},
 {name:'open Standard markets and private reputation',config:{ruleOptions:{openTechnology:true,publicDiscoveries:true}}},
 {name:'variant inventory with hidden discoveries and reputation',config:{rulesMode:'less-random-v1',ruleOptions:{publicDiscoveries:false,publicReputation:false,openTechnology:false,combatJokers:false}}},
];
describe('bounded independent rules AI matches',()=>{
 it.each(configurations)('finishes $name with valid sampled worlds and no deadlock',({config})=>{
  let state=createGame({seed:1987,warpPortals:false,...config,seats:[{id:'a',faction:'eridani',controller:'ai'},{id:'b',faction:'hydran',controller:'ai'}]});
  let steps=0,samples=0;
  while(state.phase!=='finished'&&steps<10_000){
   const actor=state.pendingDecision?.owner??state.activeSeatId;
   expect(actor,`missing actor at step ${steps}`).not.toBeNull();
   const view=getPlayerView(state,actor!);
   if(view.phase==='action'&&!view.pendingDecision&&!view.actionProgress&&!view.waitingFor&&samples<12){
    const sampled=sampleAiWorld(view,7654+steps);
    expect(gameRules(sampled)).toEqual(gameRules(state));
    if(!gameRules(state).publicReputation)expect(sampled.lessRandom?.reputationBySeat??{}).toEqual({});
    if(!gameRules(state).publicDiscoveries)expect(sampled.lessRandom?.discoverySupply??[]).toEqual([]);
    const hypothetical=chooseAiCommand(getPlayerView(sampled,actor!),1234+steps);
    expect(hypothetical,`no sampled AI choice at step ${steps}`).not.toBeNull();
    const simulated=processGameCommand(sampled,actor!,hypothetical!.command);
    expect(simulated.ok,simulated.ok?'':simulated.error.message).toBe(true);samples++;
   }
   const choice=chooseAiCommand(view,90_000+steps);
   expect(choice,`no choice at step ${steps}; decision=${state.pendingDecision?.kind??'none'}`).not.toBeNull();
   const result=processGameCommand(state,actor!,choice!.command);
   expect(result.ok,result.ok?'':`${choice!.label}: ${result.error.message}`).toBe(true);
   if(!result.ok)break;
   state=result.state;steps++;
  }
  expect(state.phase,`stopped after ${steps} steps at ${state.pendingDecision?.kind??state.activeSeatId}`).toBe('finished');
  expect(state.round).toBe(gameRules(state).roundLimit);expect(state.engine?.scores).toHaveLength(2);expect(samples).toBeGreaterThan(0);
 },30_000);
});
