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
function browseTechnologies(mobile:boolean){
 if(mobile){
  fireEvent.click(screen.getByRole('button',{name:'Choose action',exact:true}));
  fireEvent.click(within(screen.getByRole('group',{name:'Choose your action'})).getByRole('button',{name:/Research/}));
 }else fireEvent.click(screen.getByRole('button',{name:'Research',exact:true}));
}
it.each([false,true])('browses technology while preserving its income settlement on mobile=%s',mobile=>{
 if(mobile)vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const view=fixture(),onSubmit=vi.fn();render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={onSubmit} onMenu={vi.fn()}/>);
 const settlement=screen.getByRole('region',{name:'Upkeep settlement'});
 const balances=settlement.textContent;
 browseTechnologies(mobile);
 fireEvent.click(screen.getByRole('button',{name:/Improved Hull ×/}));
 expect(screen.getByRole('region',{name:'Research Improved Hull'})).toBeVisible();
 expect(within(screen.getByRole('article',{name:'Improved Hull technology'})).queryByRole('button',{name:/Research ·/})).toBeNull();
 expect(screen.queryByRole('navigation',{name:'Current action'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Collect income',exact:true})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Return to upkeep'}));
 expect(screen.getByRole('heading',{name:'Collect income'})).toBeVisible();
 expect(screen.getByRole('region',{name:'Upkeep settlement'}).textContent).toBe(balances);
 expect(screen.getAllByRole('button',{name:'Collect income',exact:true})).toHaveLength(1);
 expect(onSubmit).not.toHaveBeenCalled();
});
it('keeps the top Research button available for inspection during upkeep',()=>{
 const view=fixture();render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 const research=screen.getByRole('button',{name:'Research',exact:true});expect(research).toBeEnabled();fireEvent.click(research);
 expect(screen.getByRole('region',{name:'Research workspace'})).toBeVisible();
});
it.each([false,true])('returns from Research to the full galaxy and can inspect before finishing upkeep, mobile=%s',mobile=>{
 if(mobile)vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const view=fixture(),onSubmit=vi.fn();render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={onSubmit} onMenu={vi.fn()}/>);
 const settlement=screen.getByRole('region',{name:'Upkeep settlement'});
 const balances=settlement.textContent;
 browseTechnologies(mobile);
 if(mobile)fireEvent.click(within(screen.getByRole('navigation',{name:'Mobile game navigation'})).getByRole('button',{name:'Galaxy'}));
 else {
  fireEvent.click(screen.getByRole('button',{name:'Table & activity'}));
  fireEvent.click(screen.getByRole('button',{name:'View galaxy'}));
  fireEvent.click(screen.getByRole('button',{name:'Close table details'}));
 }
 expect(screen.queryByRole('region',{name:'Research workspace'})).toBeNull();
 expect(screen.getByRole('button',{name:/^Inspect sector 001,/})).toBeVisible();
 expect(screen.queryByRole('navigation',{name:'Current action'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/^Inspect sector 001,/}));
 expect(screen.getByRole('heading',{name:'Fleet',hidden:mobile})).toBeInTheDocument();
 expect(screen.queryByRole('region',{name:'Upkeep settlement'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Return to upkeep'}));
 expect(screen.getByRole('heading',{name:'Collect income'})).toBeVisible();
 expect(screen.getByRole('region',{name:'Upkeep settlement'}).textContent).toBe(balances);
 expect(screen.getAllByRole('button',{name:'Collect income',exact:true})).toHaveLength(1);
 expect(onSubmit).not.toHaveBeenCalled();
});
