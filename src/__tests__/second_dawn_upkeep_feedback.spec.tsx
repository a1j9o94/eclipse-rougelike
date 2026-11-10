// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import type {PlayerView} from '../../shared/eclipse/types';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
function state(){return createGame({seed:1703,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});}
function props(view:PlayerView){return {view,candidates:legalCommands(view),connected:true,busy:false,status:'',onSubmit:vi.fn(),onMenu:vi.fn()};}

it.each([false, true])('resumes the same shortfall from galaxy browsing (mobile=%s)', mobile => {
 if (mobile) vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const s=state(),home=s.sectors.find(v=>v.owner==='a')!;
 s.phase='upkeep';
 s.pendingDecision={id:'shortfall',owner:'a',kind:'bankruptcy',shortfall:2,abandonableSectorIds:[home.id]};
 const p=props(getPlayerView(s,'a')!);
 render(<SecondDawnBoard {...p}/>);
 if (mobile) {
  fireEvent.click(within(screen.getByRole('navigation',{name:'Mobile game navigation'})).getByRole('button',{name:'Galaxy'}));
 } else {
  fireEvent.click(screen.getByRole('button',{name:'Minimize upkeep shortfall'}));
 }
 const resume=screen.getByRole('button',{name:'Return to upkeep shortfall'});
 expect(resume).toBeVisible();
 fireEvent.click(resume);
 expect(screen.getByRole('button',{name:home.tileId,exact:true})).toHaveAttribute('aria-pressed','true');
 expect(p.onSubmit).not.toHaveBeenCalled();
});

it('defaults a shortfall conversion to affordable materials for money', () => {
 const s=state(),home=s.sectors.find(v=>v.owner==='a')!;
 s.phase='upkeep';
 s.seats[0].resources={money:6,science:0,materials:4};
 s.pendingDecision={id:'shortfall',owner:'a',kind:'bankruptcy',shortfall:1,abandonableSectorIds:[home.id]};
 const p=props(getPlayerView(s,'a')!);
 render(<SecondDawnBoard {...p}/>);
 fireEvent.click(screen.getByRole('button',{name:'Convert to cover upkeep'}));
 expect(screen.getByRole('button',{name:'Receive money'})).toHaveAttribute('aria-pressed','true');
 expect(screen.getByRole('button',{name:'Pay with materials'})).toHaveAttribute('aria-pressed','true');
 expect(screen.getByRole('button',{name:'Receive science'})).toHaveAttribute('aria-disabled','true');
 expect(p.onSubmit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Confirm conversion'}));
 expect(p.onSubmit).toHaveBeenCalledExactlyOnceWith({type:'trade',from:'materials',to:'money',amount:1});
});

it('keeps sector abandonment available when neither resource can cover upkeep', () => {
 const s=state(),home=s.sectors.find(v=>v.owner==='a')!;
 s.phase='upkeep';
 s.seats[0].resources={money:6,science:0,materials:0};
 s.pendingDecision={id:'shortfall',owner:'a',kind:'bankruptcy',shortfall:1,abandonableSectorIds:[home.id]};
 const p=props(getPlayerView(s,'a')!);
 render(<SecondDawnBoard {...p}/>);
 expect(screen.queryByRole('button',{name:'Convert to cover upkeep'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:home.tileId,exact:true}));
 expect(p.onSubmit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Abandon selected sector'}));
 expect(p.onSubmit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:'shortfall',choice:{kind:'bankruptcy',abandonSectorId:home.id}});
});

it.each([false, true])('returns to unfinished upkeep from the galaxy without opening the table (mobile=%s)', mobile => {
 if (mobile) vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const s=state();
 s.phase='upkeep';
 const p=props(getPlayerView(s,'a')!);
 render(<SecondDawnBoard {...p}/>);
 const settlement=screen.getByRole('region',{name:'Upkeep settlement'});
 fireEvent.click(within(settlement.parentElement!).getByRole('button',{name:'View galaxy'}));
 expect(screen.getByRole('group',{name:'Galaxy map'})).toBeVisible();
 const resume=screen.getByRole('button',{name:'Return to upkeep',exact:true});
 expect(resume).toBeVisible();
 fireEvent.click(resume);
 expect(screen.getByRole('region',{name:'Upkeep settlement'})).toBeVisible();
 expect(p.onSubmit).not.toHaveBeenCalled();
});

it('offers the other resource when a partial payment exhausts the selected source', () => {
 const s=state(),home=s.sectors.find(v=>v.owner==='a')!;
 s.phase='upkeep';
 s.seats[0].resources={money:0,science:2,materials:4};
 s.pendingDecision={id:'shortfall',owner:'a',kind:'bankruptcy',shortfall:2,abandonableSectorIds:[home.id]};
 const p=props(getPlayerView(s,'a')!);
 const {rerender}=render(<SecondDawnBoard {...p}/>);
 fireEvent.click(screen.getByRole('button',{name:'Convert to cover upkeep'}));
 expect(screen.getByRole('button',{name:'Pay with science'})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(screen.getByRole('button',{name:'Confirm conversion'}));
 expect(p.onSubmit).toHaveBeenCalledExactlyOnceWith({type:'trade',from:'science',to:'money',amount:1});
 s.seats[0].resources={money:1,science:0,materials:4};
 s.pendingDecision.shortfall=1;
 s.revision++;
 const view=getPlayerView(s,'a')!;
 rerender(<SecondDawnBoard {...p} view={view} candidates={legalCommands(view)}/>);
 expect(screen.getByRole('button',{name:'Pay with materials'})).toHaveAttribute('aria-pressed','true');
 expect(screen.getByRole('button',{name:'Confirm conversion'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Increase received amount'}));
 expect(screen.getByRole('spinbutton',{name:'Money to receive'})).toHaveValue(2);
});
