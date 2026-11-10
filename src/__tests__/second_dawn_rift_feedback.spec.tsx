import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {processGameCommand} from '../../shared/eclipse/engine';
import type {PendingDecision} from '../../shared/eclipse/types';
import BattleOverview,{CombatPlayback} from '../second-dawn-game/BattleOverview';
import DecisionPanel from '../second-dawn-game/DecisionPanel';
import {riftCombatReviewFixture} from '../second-dawn-game/riftReviewFixture';

afterEach(cleanup);
it.each([false,true])('allows skipping extra assignments only when all opposing ships will be destroyed (surviving ship: %s)',survivor=>{
 const state=riftCombatReviewFixture(),view=getPlayerView(state,state.pendingDecision!.owner)!;
 const original=view.pendingDecision as Extract<PendingDecision,{kind:'combat-allocation'}>;
 const die=original.dice[0],targetId=die.targets[0];
 const decision={...original,dice:[die,{...die,id:'split-surplus',face:6,weaponColor:'red' as const,damage:4,split:true}]};
 // A split-only hit list can omit ships, so the whole opposing fleet comes from the battle.
 if(survivor)view.ships.push({...view.ships.find(ship=>ship.id===targetId)!,id:'surviving-opponent'});
 const onSubmit=vi.fn();
 render(<DecisionPanel view={view} decision={decision} reputation={[]} disabled={false} onSubmit={onSubmit} motionEnabled={false}/>);
 const resolve=screen.getByRole('button',{name:'Resolve volley'});
 expect(resolve).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:`Target ${targetId} · hit`}));
 if(survivor)expect(resolve).toBeDisabled();
 else {
  expect(resolve).toBeEnabled();
  expect(screen.getByRole('region',{name:'Commit action'})).toHaveTextContent('Surplus damage is optional');
  fireEvent.click(resolve);
  expect(onSubmit).toHaveBeenCalledWith({type:'resolve',decisionId:decision.id,choice:{kind:'combat-allocation',allocations:[{dieId:die.id,targetId}]}});
 }
});
it.each([5,6])('distinguishes Rift backfire from a miss in the compact die and commit summary (face %s)',face=>{
 const state=riftCombatReviewFixture(),view=getPlayerView(state,state.pendingDecision!.owner);
 const original=view.pendingDecision as Extract<PendingDecision,{kind:'combat-allocation'}>;
 const decision={...original,dice:original.dice.map(die=>({...die,face,damage:face===5?3:0,targets:face===5?die.targets:[],hitTargets:face===5?die.hitTargets:[]}))};
 view.pendingDecision=decision;
 render(<BattleOverview view={view} integrated fastPlayback controls={<DecisionPanel view={view} decision={decision} targetLabels={{}} reputation={[]} disabled={false} onSubmit={vi.fn()} motionEnabled={false}/>}/>);
 const die=screen.getByRole('button',{name:/Die 1,.*1 self-damage/});
 expect(within(die).getByText('1 self-damage',{exact:true})).toBeVisible();
 expect(die).not.toHaveClass('is-auto-miss');
 expect(die.querySelector('.dg-die-state')).not.toHaveTextContent('×');
 const commit=screen.getByRole('region',{name:'Commit action'});
 expect(commit).toHaveTextContent('1 self-damage');
 expect(within(commit).queryByText('No damage',{exact:true})).toBeNull();
});
it('does not imply self-damage for a genuinely blank Rift face',()=>{
 const state=riftCombatReviewFixture(),view=getPlayerView(state,state.pendingDecision!.owner);
 const original=view.pendingDecision as Extract<PendingDecision,{kind:'combat-allocation'}>;
 const decision={...original,dice:original.dice.map(die=>({...die,face:1,damage:0,targets:[],hitTargets:[]}))};view.pendingDecision=decision;
 render(<BattleOverview view={view} integrated fastPlayback controls={<DecisionPanel view={view} decision={decision} targetLabels={{}} reputation={[]} disabled={false} onSubmit={vi.fn()} motionEnabled={false}/>}/>);
 expect(screen.queryByText(/backfire still applies/i)).toBeNull();
 expect(screen.queryByText('1 self-damage',{exact:true})).toBeNull();
 expect(screen.getByRole('region',{name:'Commit action'})).toHaveTextContent('No damage');
});
it('shows the actual backfire loss in the inline receipt and on the same friendly ship',()=>{
 const state=riftCombatReviewFixture(),view=getPlayerView(state,state.pendingDecision!.owner);
 const decision=view.pendingDecision as Extract<PendingDecision,{kind:'combat-allocation'}>;
 const result=processGameCommand(state,view.viewerSeatId,{type:'resolve',decisionId:decision.id,choice:{kind:'combat-allocation',allocations:decision.dice.map(die=>({dieId:die.id,targetId:die.targets[0]}))}});
 expect(result.ok).toBe(true);if(!result.ok)return;
 const volleys=result.events.flatMap(event=>event.combatVolley?[event.combatVolley]:[]);
 const next={...getPlayerView(result.state,view.viewerSeatId),battle:view.battle};
 const ui=render(<BattleOverview view={view} integrated fastPlayback/>);
 ui.rerender(<BattleOverview view={next} integrated fastPlayback recentVolleys={volleys} knownShips={view.ships}/>);
 const own=ui.container.querySelector('[data-ship-id="rift-interceptor"]')!;
 expect(within(own as HTMLElement).getByText('Rift backfire · 1 damage')).toBeVisible();
 expect(within(own as HTMLElement).getByText('Destroyed')).toBeVisible();
 expect(screen.getByLabelText('Last volley')).toHaveTextContent('1 self-damage');
 cleanup();
 render(<CombatPlayback inline volleys={volleys} view={next} fast/>);
 expect(screen.getByRole('img',{name:'Rift die: 3 damage, 1 self-damage'})).toBeVisible();
});
