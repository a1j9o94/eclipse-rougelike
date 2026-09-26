import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
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
it('does not reopen old destruction notices after play advances to a follow-up decision',()=>{
 const view=fixture();view.battle=null;view.pendingDecision={id:'keep',owner:view.viewerSeatId,kind:'reputation',drawn:[1],capacity:1};view.revision=9;
 const history={entries:[{...entry(9,view.round),combatVolleys:undefined},entry(7,view.round)],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:vi.fn()};
 render(<SecondDawnBoard view={view} candidates={[]} history={history} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 expect(screen.queryByRole('region',{name:'Recent combat impacts'})).not.toBeInTheDocument();
});

it('preserves the final casualty when automatic cleanup advances to the next round',()=>{
 const view=fixture();view.battle=null;view.revision=10;const lastBattle=entry(7,view.round-1);
 expect(latestCombatPlayback(view,[lastBattle])?.revision).toBe(7);
});
it('keeps the private reputation result as the last step in combat results',()=>{
 const view=fixture();view.battle=null;view.pendingDecision=null;view.revision=9;
 view.private.reputationSummary={id:'combat-reputation',round:view.round,battleId:'b',sectorId:'s',drawn:[1,4,2],selected:4,kept:[4],returned:[1,2]};
 const history={entries:[entry(7,view.round)],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:vi.fn()};
 render(<SecondDawnBoard view={view} candidates={[]} history={history} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 const dialog=screen.getByRole('dialog',{name:'Combat results'});
 const playback=within(dialog).getByRole('region',{name:'Recent combat impacts'}),reputation=within(dialog).getByRole('region',{name:'Your reputation result'});
 expect(playback.compareDocumentPosition(reputation)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(screen.queryByRole('region',{name:'Your reputation result',hidden:true})?.closest('.dg-reputation-notice')).toBeNull();
 fireEvent.click(within(dialog).getByRole('button',{name:'Dismiss reputation result'}));
 expect(screen.queryByRole('dialog',{name:'Combat results'})).toBeNull();
});
it('puts an explicit public-reputation choice after the battle overview in its choice dialog',()=>{
 const view=fixture();view.pendingDecision={id:'public-reputation',owner:view.viewerSeatId,kind:'less-random-reputation',draws:2,capacity:4};
 render(<SecondDawnBoard view={view} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 const dialog=screen.getByRole('dialog',{name:'Reputation upgrades choice'}),overview=within(dialog).getByRole('region',{name:'Active battle overview'}),choice=within(dialog).getByRole('heading',{name:'Build your reputation'});
 expect(overview.compareDocumentPosition(choice)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it('keeps the battle on screen while an opponent resolves their firing decision',()=>{
 const view=fixture();view.pendingDecision=null;view.waitingFor={kind:'combat-turn',owner:view.battle!.defender};
 render(<SecondDawnBoard view={view} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 expect(screen.getByRole('region',{name:'Active battle overview'})).toBeVisible();
 expect(screen.getByText(/Waiting for.*combat decision/)).toBeVisible();
 expect(screen.queryByRole('button',{name:'Roll dice'})).toBeNull();
});
it('uses OS reduced motion as the default but honors an explicit in-game animation preference',()=>{
 const key='eclipse.second-dawn.motion.v1',view=fixture();view.pendingDecision=null;view.battle=null;
 const saved=localStorage.getItem(key);
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 try{
  localStorage.removeItem(key);
  render(<SecondDawnBoard view={view} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
  expect(document.querySelector('.dg-app')).toHaveAttribute('data-motion','off');
  cleanup();localStorage.setItem(key,'on');
  render(<SecondDawnBoard view={view} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
  expect(document.querySelector('.dg-app')).toHaveAttribute('data-motion','on');
 }finally{cleanup();if(saved===null)localStorage.removeItem(key);else localStorage.setItem(key,saved);vi.unstubAllGlobals();}
});
