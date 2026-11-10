// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it.each([false,true])('clears the inspected sector when choosing an exploration frontier, mobile=%s',mobile=>{
 if(mobile)vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const state=createGame({seed:19,warpPortals:true,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});state.activeSeatId='a';
 const view=getPlayerView(state,'a')!,submit=vi.fn(),home=view.sectors.find(s=>s.owner==='a')!;
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
 const dismiss=screen.queryByRole('button',{name:'Dismiss turn notice'});if(dismiss)fireEvent.click(dismiss);
 fireEvent.click(screen.getByRole('button',{name:new RegExp(`^Inspect sector ${home.tileId},`)}));
 expect(screen.getByRole('heading',{name:'Planets & population',hidden:true})).toBeInTheDocument();
 const frontier=screen.getAllByRole('button',{name:/^Explore \(/})[0];
 const ring=frontier.getAttribute('aria-label')?.split(' · ').at(-1);
 expect(ring).toMatch(/^Ring /);
 fireEvent.click(frontier);
 expect(screen.queryByRole('heading',{name:'Planets & population',hidden:true})).toBeNull();
 const details=within(screen.getByRole('complementary',{name:'Selection and action details'}));
 expect(details.getByRole('button',{name:'Draw sector'})).toBeEnabled();
 fireEvent.click(details.getByText('Sector odds',{selector:'summary'}));
 expect(within(details.getByRole('group',{name:`${ring} next sector odds`})).getByRole('group',{name:/Science: \d+%/})).toBeVisible();
 expect(submit).not.toHaveBeenCalled();
});
