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
it('opens combat controls alongside the fleet details without an extra entry click',()=>{
 const view=fixture();view.pendingDecision={id:'fire',owner:view.viewerSeatId,kind:'combat-turn',battleId:'b',shipType:'interceptor',destinationIds:[]};
 render(<SecondDawnBoard view={view} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 const controls=screen.getByRole('region',{name:'Combat controls'}),fleet=screen.getByRole('region',{name:'Active battle overview'});
 expect(fleet).toContainElement(controls);
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
 const view=fixture(),battle=view.battle!;
 const controls={candidates:[],connected:true,busy:false,status:'',onSubmit:vi.fn(),onMenu:vi.fn()};
 const ui=render(<SecondDawnBoard {...controls} view={view}/>);
 const finished={...view,battle:null,pendingDecision:null,revision:view.revision+1,private:{...view.private,reputationSummary:{id:'combat-reputation',round:view.round,battleId:battle.id!,sectorId:battle.sectorId,drawn:[1,4,2],selected:4,kept:[4],returned:[1,2]}}};
 const volley=entry(finished.revision,view.round);
 const history={entries:[{...volley,combatVolleys:[{...volley.combatVolleys![0],battleId:battle.id!,sectorId:battle.sectorId,attacker:battle.attacker}]}],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:vi.fn()};
 ui.rerender(<SecondDawnBoard {...controls} view={finished} history={history}/>);
 const workspace=screen.getByRole('region',{name:'Battle workspace'});
 const playback=within(workspace).getByLabelText('Last volley'),reputation=within(workspace).getByRole('region',{name:'Your reputation result'});
 expect(playback.compareDocumentPosition(reputation)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(reputation).toHaveTextContent('Kept 4 VP');
 fireEvent.click(within(workspace).getByRole('button',{name:'Return to galaxy'}));
 expect(screen.queryByRole('region',{name:'Battle workspace'})).toBeNull();
 expect(controls.onSubmit).not.toHaveBeenCalled();
});
it('shows persisted private combat reputation on a cold reload without an active battle',()=>{
 const view=fixture(),battle=view.battle!;
 view.phase='upkeep';
 view.upkeepDone=[];
 view.activeSeatId=view.viewerSeatId;
 view.battle=null;
 view.pendingDecision=null;
 view.private.reputationSummary={id:'saved-combat-reputation',round:view.round,battleId:battle.id!,sectorId:battle.sectorId,drawn:[1,4],selected:4,kept:[4],returned:[1]};
 const submit=vi.fn();
 render(<SecondDawnBoard view={view} candidates={[]} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
 expect(screen.queryByRole('region',{name:'Battle workspace'})).toBeNull();
 expect(screen.getByRole('region',{name:'Upkeep settlement'})).toBeVisible();
 const reputation=screen.getByRole('region',{name:'Your reputation result'});
 expect(reputation).toHaveTextContent('Kept 4 VP');
 fireEvent.click(within(reputation).getByRole('button',{name:'Dismiss reputation result'}));
 expect(reputation).not.toBeInTheDocument();
 expect(submit).not.toHaveBeenCalled();
});
it('puts an explicit public-reputation choice within the battle workspace alongside the fleet',()=>{
 const view=fixture();view.pendingDecision={id:'public-reputation',owner:view.viewerSeatId,kind:'less-random-reputation',draws:2,capacity:4};
 render(<SecondDawnBoard view={view} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 const workspace=screen.getByRole('region',{name:'Battle workspace'});
 const overview=within(workspace).getByRole('region',{name:'Active battle overview'});
 expect(within(overview).getByRole('heading',{name:'Build your reputation'})).toBeVisible();
});
it('keeps the battle on screen while an opponent resolves their firing decision',()=>{
 const view=fixture();view.pendingDecision=null;view.waitingFor={kind:'combat-turn',owner:view.battle!.defender};
 render(<SecondDawnBoard view={view} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 expect(screen.getByRole('region',{name:'Active battle overview'})).toBeVisible();
 expect(within(screen.getByRole('region',{name:'Battle workspace'})).getByText(/^Waiting for /)).toBeVisible();
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
