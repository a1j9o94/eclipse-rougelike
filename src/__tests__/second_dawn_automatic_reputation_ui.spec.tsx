import {act,cleanup,render,screen,fireEvent} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import Board from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();vi.useRealTimers();});
function fixture(){const state=createGame({seed:4,warpPortals:true,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});state.pendingDecision={id:'old-reputation',kind:'reputation',owner:'a',drawn:[1,4,2],capacity:4};return getPlayerView(state,'a')!;}
it('automatically settles a saved reputation decision once, waiting for connection and preserving explicit retry',()=>{
 const view=fixture(),submit=vi.fn(),p={view,candidates:legalCommands(view),busy:false,status:'',onSubmit:submit,onMenu:vi.fn()};
 const ui=render(<Board {...p} connected={false}/>);expect(submit).not.toHaveBeenCalled();
 ui.rerender(<Board {...p} connected/>);expect(submit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:'old-reputation',choice:{kind:'reputation'}});
 ui.rerender(<Board {...p} connected status="Connection interrupted"/>);expect(submit).toHaveBeenCalledTimes(1);
 expect(screen.queryByRole('checkbox',{name:/Keep .*VP reputation/})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Finish keeping best reputation'}));expect(submit).toHaveBeenCalledTimes(2);
});
it.each(['dismiss','expire'])('shows a private result without confirmation and supports %s',mode=>{
 vi.useFakeTimers();const view=fixture();view.pendingDecision=null;view.private.reputationSummary={id:'result-1',round:1,battleId:null,sectorId:null,drawn:[1,4,2],selected:4,kept:[4],returned:[1,2]};
 render(<Board view={view} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 expect(screen.getByRole('region',{name:'Your reputation result'})).toBeVisible();
 expect(screen.queryByRole('button',{name:'Confirm reputation'})).toBeNull();
 if(mode==='dismiss')fireEvent.click(screen.getByRole('button',{name:'Dismiss reputation result'}));else act(()=>vi.advanceTimersByTime(10001));
 expect(screen.queryByRole('region',{name:'Your reputation result'})).toBeNull();
});
