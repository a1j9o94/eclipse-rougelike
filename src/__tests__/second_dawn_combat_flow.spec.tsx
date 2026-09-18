import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {getPlayerView} from '../../shared/eclipse/protocol';
import type {GameState} from '../../shared/eclipse/types';
import type {PublicHistoryEntry} from '../../shared/eclipse/history';
import fixturesJson from '../second-dawn-game/reviewFixtures.json?raw';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
import {latestCombatPlayback} from '../second-dawn-game/combatPlayback';
afterEach(cleanup);
function fixture(){const state=(JSON.parse(fixturesJson) as Record<string,GameState>).combat;return getPlayerView(state,state.pendingDecision!.owner)!;}
function entry(revision:number,round:number):PublicHistoryEntry{return {revision,round,actorSeatId:'a',actorName:'Fleet',summary:'Volley resolved',details:[],combatVolleys:[{battleId:'b',sectorId:'s',attacker:'a',dice:[],impacts:[],targets:[{id:'lost',hpBefore:1,hpAfter:0,excess:0,destroyed:true}]}]};}
it('retains a resolved volley through later non-volley decisions without showing future or stale events',()=>{
 const view=fixture();view.battle=null;view.revision=9;
 const current=entry(7,view.round),old=entry(3,view.round-2),future=entry(12,view.round);
 const followup={...entry(9,view.round),combatVolleys:undefined};
 expect(latestCombatPlayback(view,[future,followup,current,old])?.revision).toBe(7);
 expect(latestCombatPlayback(view,[old])).toBeNull();
});
it('keeps other sectors and engagements out of the active battle playback',()=>{
 const view=fixture();view.revision=9;
 expect(latestCombatPlayback(view,[entry(7,view.round)])).toBeNull();
});
it('opens combat controls ahead of the fleet details without an extra entry click',()=>{
 const view=fixture();view.pendingDecision={id:'fire',owner:view.viewerSeatId,kind:'combat-turn',battleId:'b',shipType:'interceptor',destinationIds:[]};
 render(<SecondDawnBoard view={view} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 const controls=screen.getByRole('region',{name:'Combat controls'}),fleet=screen.getByRole('region',{name:'Active battle overview'});
 expect(controls.compareDocumentPosition(fleet)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(screen.getByRole('button',{name:'Roll dice'})).toBeVisible();
});
it('keeps the final destruction visible after the battle disappears and through a follow-up decision',()=>{
 const view=fixture();view.battle=null;view.pendingDecision={id:'keep',owner:view.viewerSeatId,kind:'reputation',drawn:[1],capacity:1};view.revision=9;
 const history={entries:[{...entry(9,view.round),combatVolleys:undefined},entry(7,view.round)],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:vi.fn()};
 render(<SecondDawnBoard view={view} candidates={[]} history={history} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 expect(screen.getByRole('region',{name:'Recent combat impacts'})).toHaveTextContent('1 ship destroyed');
});

it('preserves the final casualty when automatic cleanup advances to the next round',()=>{
 const view=fixture();view.battle=null;view.revision=10;const lastBattle=entry(7,view.round-1);
 expect(latestCombatPlayback(view,[lastBattle])?.revision).toBe(7);
});
it('keeps the battle on screen while an opponent resolves their firing decision',()=>{
 const view=fixture();view.pendingDecision=null;view.waitingFor={kind:'combat-turn',owner:view.battle!.defender};
 render(<SecondDawnBoard view={view} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 expect(screen.getByRole('region',{name:'Active battle overview'})).toBeVisible();
 expect(screen.getByText(/Waiting for.*combat decision/)).toBeVisible();
 expect(screen.queryByRole('button',{name:'Roll dice'})).toBeNull();
});
