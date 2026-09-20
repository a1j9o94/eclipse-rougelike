import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import {processGameCommand} from '../../shared/eclipse/engine';
import type {GameState,PlayerView} from '../../shared/eclipse/types';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
import TurnAttentionNotice from '../second-dawn-game/TurnAttentionNotice';
import EmpireOverview from '../second-dawn-game/EmpireOverview';
import AiActivityBar from '../second-dawn-game/AiActivityBar';

beforeEach(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function fixture(done:string[]=[]){
 const state=createGame({seed:19,warpPortals:false,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'human'},{id:'c',faction:'planta',controller:'human'}]});
 state.phase='upkeep';state.activeSeatId='b';state.engine!.upkeepDone=done;
 state.sectors.find(sector=>sector.owner==='a')!.population.pop();
 return state;
}
function mobileViewport(mobile:boolean){
 if(mobile)vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),addEventListener:vi.fn(),removeEventListener:vi.fn()})));
}
const viewOf=(state:GameState)=>getPlayerView(state,'a')!;
function board(view:PlayerView,onSubmit=vi.fn()){
 return <SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={onSubmit} onMenu={()=>{}}/>;
}
it.each([false,true])('lets a non-active unfinished human review and colonize during upkeep (mobile=%s)',mobile=>{
 mobileViewport(mobile);const onSubmit=vi.fn();render(board(viewOf(fixture()),onSubmit));
 fireEvent.click(screen.getByRole('button',{name:'Review upkeep',exact:true}));
 const details=within(screen.getByRole('complementary',{name:'Selection and action details'}));
 expect(details.getByRole('heading',{name:'Round 1 upkeep'})).toBeVisible();
 fireEvent.click(details.getByRole('button',{name:'Colonize',exact:true}));
 expect(screen.getByRole('region',{name:'Colonization planner'})).toBeVisible();
 expect(onSubmit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Back to upkeep',exact:true}));
 fireEvent.click(details.getByRole('button',{name:'Finish upkeep',exact:true}));
 expect(onSubmit).toHaveBeenCalledWith({type:'finish-upkeep'});
});
it.each([false,true])('offers conversion before a non-active human finishes upkeep (mobile=%s)',mobile=>{
 mobileViewport(mobile);const onSubmit=vi.fn();render(board(viewOf(fixture()),onSubmit));
 fireEvent.click(screen.getByRole('button',{name:'Dismiss upkeep notice',exact:true}));
 if(mobile){
  fireEvent.click(screen.getByRole('button',{name:'Choose action',exact:true}));
  fireEvent.click(within(screen.getByRole('group',{name:'Choose your action'})).getByRole('button',{name:/Convert/}));
 }else fireEvent.click(screen.getByRole('button',{name:'Convert',exact:true}));
 const trade=within(screen.getByRole('region',{name:'Convert resources'}));
 fireEvent.click(trade.getByRole('button',{name:'Receive money'}));
 fireEvent.click(trade.getByRole('button',{name:'Pay with materials'}));
 const commit=trade.getByRole('button',{name:'Confirm conversion'});
 expect(commit).toBeEnabled();fireEvent.click(commit);
 expect(onSubmit).toHaveBeenCalledWith({type:'trade',from:'materials',to:'money',amount:1});
});
it.each([false,true])('shows completed upkeep progress and prevents repeat economy choices (mobile=%s)',mobile=>{
 mobileViewport(mobile);const view=viewOf(fixture(['a']));render(board(view));
 expect(screen.getAllByText('Upkeep complete',{exact:true}).length).toBeGreaterThan(0);
 expect(screen.getAllByText('1 / 3 ready',{exact:true}).length).toBeGreaterThan(0);
 expect(screen.queryByRole('dialog',{name:'Upkeep is ready'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Review upkeep',exact:true})).toBeNull();
 expect(screen.queryByRole('button',{name:'Finish upkeep',exact:true})).toBeNull();
 for(const button of screen.queryAllByRole('button',{name:'Convert',exact:true}))expect(button).toBeDisabled();
 expect(screen.queryByRole('button',{name:'Choose action',exact:true})).toBeNull();
});
it('does not reannounce upkeep when another player finishes or the compatibility active seat changes',()=>{
 const state=fixture(),onReview=vi.fn(),onOpen=vi.fn();
 const notice=(view:PlayerView)=><TurnAttentionNotice view={view} matchScope="concurrent-upkeep" onReviewUpkeep={onReview} onOpenTurn={onOpen}/>;
 const ui=render(notice(viewOf(state)));
 fireEvent.click(screen.getByRole('button',{name:'Dismiss upkeep notice'}));
 state.revision++;state.engine!.upkeepDone=['b'];state.activeSeatId='c';
 ui.rerender(notice(viewOf(state)));expect(screen.queryByRole('dialog',{name:'Upkeep is ready'})).toBeNull();
 state.revision++;state.activeSeatId='a';state.actionTurnSerial=(state.actionTurnSerial??0)+1;
 ui.rerender(notice(viewOf(state)));expect(screen.queryByRole('dialog',{name:'Upkeep is ready'})).toBeNull();
 state.round++;state.engine!.upkeepDone=[];
 ui.rerender(notice(viewOf(state)));expect(screen.getByRole('dialog',{name:'Upkeep is ready'})).toBeVisible();
 expect(onReview).not.toHaveBeenCalled();expect(onOpen).not.toHaveBeenCalled();
});
it('lets an unfinished player prepare upkeep while another player resolves bankruptcy',()=>{
 const state=fixture();state.pendingDecision={id:'bankruptcy-b',kind:'bankruptcy',owner:'b',shortfall:3,abandonableSectorIds:[state.sectors.find(sector=>sector.owner==='b')!.id]};
 const onSubmit=vi.fn();render(board(viewOf(state),onSubmit));
 fireEvent.click(screen.getByRole('button',{name:'Review upkeep',exact:true}));
 expect(screen.getByRole('heading',{name:'Round 1 upkeep'})).toBeVisible();
 expect(within(screen.getByRole('complementary',{name:'Selection and action details'})).getByRole('button',{name:'Colonize',exact:true})).toBeEnabled();
 expect(onSubmit).not.toHaveBeenCalled();
});
it('disables command-center colonization and conversion once this player has completed upkeep',()=>{
 const view=viewOf(fixture(['a'])),onNavigate=vi.fn();
 render(<EmpireOverview view={view} seatId="a" onNavigate={onNavigate} onSector={vi.fn()} onBlueprints={vi.fn()}/>);
 for(const name of [/^Colonize planets$/,/^Convert resources/]){
  const shortcut=screen.queryByRole('button',{name});
  if(shortcut){expect(shortcut).toBeDisabled();fireEvent.click(shortcut);}
 }
 expect(onNavigate).not.toHaveBeenCalled();
 expect(screen.getByRole('button',{name:'Research technology'})).toBeEnabled();
});
it('prioritizes a later mandatory choice over the completed-upkeep waiting status',()=>{
 render(<AiActivityBar upkeep="complete" humanDecision humanTurn actor={null} recent={null} finished={false} motionEnabled={false} onMotionChange={vi.fn()} onWatch={vi.fn()}/>);
 const status=screen.getByRole('status');
 expect(status).toHaveTextContent('Your decision');
 expect(status).toHaveTextContent('Resolve the current choice.');
 expect(status).not.toHaveTextContent('Upkeep complete');
 expect(status).not.toHaveTextContent('Waiting for everyone');
});

it.each([false,true])('closes mobile upkeep after accepted payment (last player=%s)',last=>{
 mobileViewport(true);const state=fixture(last?['b','c']:[]),onSubmit=vi.fn();
 state.startSeatId='a';state.firstPasser='a';
 const ui=render(board(viewOf(state),onSubmit));
 fireEvent.click(screen.getByRole('button',{name:'Review upkeep',exact:true}));
 fireEvent.click(within(screen.getByRole('complementary',{name:'Selection and action details'})).getByRole('button',{name:'Finish upkeep',exact:true}));
 expect(onSubmit).toHaveBeenCalledWith({type:'finish-upkeep'});
 const result=processGameCommand(state,'a',{type:'finish-upkeep'});
 expect(result.ok).toBe(true);if(!result.ok)return;
 result.state.revision=state.revision+1;
 const view=viewOf(result.state);
 expect(view.phase).toBe(last?'action':'upkeep');
 if(last)expect(view.activeSeatId).toBe('a');
 ui.rerender(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={onSubmit} onMenu={()=>{}} lastAcceptedCommand={{revision:view.revision,type:'finish-upkeep'}}/>);
 expect(screen.queryByRole('navigation',{name:'Current action'})).toBeNull();
 expect(screen.queryByRole('heading',{name:'Round 1 upkeep'})).toBeNull();
 if(last)expect(screen.getByRole('button',{name:'Choose action',exact:true})).toBeVisible();
 else expect(screen.getAllByText('Upkeep complete',{exact:true}).length).toBeGreaterThan(0);
});
