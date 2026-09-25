import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import {processGameCommand} from '../../shared/eclipse/engine';
import type {GameCommand} from '../../shared/eclipse/types';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';

afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function fixture(openPlanet=true){
 const state=createGame({seed:19,warpPortals:false,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 state.phase='upkeep';state.activeSeatId='a';
 if(openPlanet)state.sectors.find(sector=>sector.owner==='a')!.population.pop();
 return state;
}
function show(state=fixture(),connected=true){
 const view=getPlayerView(state,'a')!,onSubmit=vi.fn();
 const rendered=render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected={connected} busy={false} status="Saved" onSubmit={onSubmit} onMenu={()=>{}}/>);
 return {onSubmit,view,...rendered};
}
it.each([false,true])('opens colonization from upkeep review and returns without finishing upkeep (mobile=%s)',mobile=>{
 if(mobile)vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const {onSubmit}=show();
 fireEvent.click(screen.getByRole('button',{name:'Review upkeep'}));
 const details=screen.getByRole('complementary',{name:'Selection and action details'});
 fireEvent.click(within(details).getByRole('button',{name:'Colonize',exact:true}));
 expect(screen.getByRole('region',{name:'Colonization planner'})).toBeVisible();
 expect(onSubmit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Back to upkeep'}));
 expect(within(details).getByRole('heading',{name:'Round 1 upkeep'})).toBeVisible();
 expect(onSubmit).not.toHaveBeenCalled();
 fireEvent.click(within(details).getByRole('button',{name:'Finish upkeep',exact:true}));
 const review=screen.getByRole('dialog',{name:'Colonize before upkeep'});
 expect(within(review).getByRole('region',{name:'Colonization planner'})).toBeVisible();
 expect(onSubmit).not.toHaveBeenCalled();
 fireEvent.click(within(review).getByRole('button',{name:'Finish upkeep anyway'}));
 expect(onSubmit).toHaveBeenCalledExactlyOnceWith({type:'finish-upkeep'});
});
it.each(['no ships','no open planets','enemy present'] as const)('does not offer colonization when %s',reason=>{
 const state=fixture(reason!=='no open planets');
 if(reason==='no ships')state.seats[0].colonyShipsAvailable=0;
 if(reason==='enemy present')state.ships.find(ship=>ship.owner==='b')!.sectorId=state.sectors.find(sector=>sector.owner==='a')!.id;
 const {onSubmit,view}=show(state);
 expect(legalCommands(view).some(candidate=>candidate.command.type==='colonize')).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Review upkeep'}));
 expect(within(screen.getByRole('complementary',{name:'Selection and action details'})).queryByRole('button',{name:'Colonize',exact:true})).toBeNull();
 fireEvent.click(within(screen.getByRole('complementary',{name:'Selection and action details'})).getByRole('button',{name:'Finish upkeep',exact:true}));
 expect(screen.queryByRole('dialog',{name:'Colonize before upkeep'})).toBeNull();
 expect(onSubmit).toHaveBeenCalledExactlyOnceWith({type:'finish-upkeep'});
});
it('offers direct colonization from the upkeep notice without submitting',()=>{
 const {onSubmit}=show();
 fireEvent.click(within(screen.getByRole('dialog',{name:'Upkeep is ready'})).getByRole('button',{name:'Colonize',exact:true}));
 expect(screen.getByRole('region',{name:'Colonization planner'})).toBeVisible();
 expect(onSubmit).not.toHaveBeenCalled();
});
it('colonizes directly in the finish-upkeep review without also finishing upkeep',()=>{
 const {onSubmit}=show();
 fireEvent.click(screen.getByRole('button',{name:'Review upkeep'}));
 fireEvent.click(within(screen.getByRole('complementary',{name:'Selection and action details'})).getByRole('button',{name:'Finish upkeep',exact:true}));
 const review=screen.getByRole('dialog',{name:'Colonize before upkeep'});
 fireEvent.click(within(review).getByRole('button',{name:/^Colonize .* planet .* in sector/}));
 fireEvent.click(within(review).getByRole('button',{name:'Colonize 1 planet'}));
 expect(onSubmit).toHaveBeenCalledTimes(1);
 expect(onSubmit.mock.calls[0][0]).toMatchObject({type:'colonize',placements:[{}]});
 expect(screen.queryByRole('dialog',{name:'Colonize before upkeep'})).toBeNull();
});
it('returns to updated upkeep after confirming a legal population placement',()=>{
 const state=fixture();const {onSubmit,rerender}=show(state);
 fireEvent.click(within(screen.getByRole('dialog',{name:'Upkeep is ready'})).getByRole('button',{name:'Colonize',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:/^Colonize .* planet .* in sector/}));
 fireEvent.click(screen.getByRole('button',{name:'Colonize 1 planet'}));
 const command=onSubmit.mock.calls[0][0] as GameCommand;
 expect(command.type).toBe('colonize');
 const result=processGameCommand(state,'a',command);expect(result.ok).toBe(true);if(!result.ok)return;
 const view=getPlayerView(result.state,'a')!;
 rerender(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={onSubmit} onMenu={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Back to upkeep'}));
 expect(screen.getByRole('heading',{name:'Round 1 upkeep'})).toBeVisible();
 expect(onSubmit).toHaveBeenCalledTimes(1);
});
it('disables the upkeep entry if connection drops while reviewing',()=>{
 const {view,onSubmit,rerender}=show();fireEvent.click(screen.getByRole('button',{name:'Review upkeep'}));
 rerender(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected={false} busy={false} status="Offline" onSubmit={onSubmit} onMenu={()=>{}}/>);
 const entry=within(screen.getByRole('complementary',{name:'Selection and action details'})).getByRole('button',{name:'Colonize',exact:true});
 expect(entry).toBeDisabled();fireEvent.click(entry);expect(onSubmit).not.toHaveBeenCalled();
});
