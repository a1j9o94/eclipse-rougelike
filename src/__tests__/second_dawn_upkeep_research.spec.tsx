// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function fixture(){
 const state=createGame({seed:19,warpPortals:true,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});
 state.phase='upkeep';state.activeSeatId='a';state.seats[0].passed=true;state.seats[0].resources.science=100;state.technologyMarket=['improved-hull'];
 return getPlayerView(state,'a')!;
}
it.each([false,true])('browses technology from upkeep and returns to its saved review on mobile=%s',mobile=>{
 if(mobile)vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const view=fixture(),onSubmit=vi.fn();render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={onSubmit} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Review upkeep'}));
 fireEvent.click(screen.getByRole('button',{name:'Browse technologies'}));
 fireEvent.click(screen.getByRole('button',{name:/Improved Hull ×/}));
 expect(screen.getByRole('region',{name:'Research Improved Hull'})).toBeVisible();
 expect(within(screen.getByRole('article',{name:'Improved Hull technology'})).queryByRole('button',{name:/Research ·/})).toBeNull();
 expect(screen.queryByRole('navigation',{name:'Current action'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Back to upkeep'}));
 expect(screen.getByRole('heading',{name:'Round 1 upkeep'})).toBeVisible();
 expect(onSubmit).not.toHaveBeenCalled();
});
it('keeps the top Research button available for inspection during upkeep',()=>{
 const view=fixture();render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Dismiss upkeep notice'}));
 const research=screen.getByRole('button',{name:'Research',exact:true});expect(research).toBeEnabled();fireEvent.click(research);
 expect(screen.getByRole('heading',{name:'Available technologies'})).toBeVisible();
});
