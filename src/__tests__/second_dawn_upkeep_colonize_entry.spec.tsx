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
function show(state=fixture()){
 const view=getPlayerView(state,'a')!,onSubmit=vi.fn();
 const props={view,candidates:legalCommands(view),connected:true,busy:false,status:'Saved',onSubmit,onMenu:()=>{}};
 return {onSubmit,view,props,...render(<SecondDawnBoard {...props}/>)};
}
const settlement=()=>within(screen.getByRole('region',{name:'Upkeep settlement'}));
it.each([false,true])('opens colonies from settlement and collects once without another gate (mobile=%s)',mobile=>{
 if(mobile)vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const {onSubmit}=show();
 fireEvent.click(settlement().getByRole('button',{name:/Colonize/}));
 expect(screen.getByRole('region',{name:'Colonization planner'})).toBeVisible();expect(onSubmit).not.toHaveBeenCalled();
 fireEvent.click(settlement().getByRole('button',{name:'Collect income'}));
 expect(screen.queryByRole('dialog',{name:'Colonize before upkeep'})).toBeNull();
 expect(onSubmit).toHaveBeenCalledExactlyOnceWith({type:'finish-upkeep'});
});
it.each(['no ships','no open planets','enemy present'] as const)('omits unavailable colonization when %s',reason=>{
 const state=fixture(reason!=='no open planets');
 if(reason==='no ships')state.seats[0].colonyShipsAvailable=0;
 if(reason==='enemy present')state.ships.find(ship=>ship.owner==='b')!.sectorId=state.sectors.find(sector=>sector.owner==='a')!.id;
 const {onSubmit,view}=show(state);
 expect(legalCommands(view).some(candidate=>candidate.command.type==='colonize')).toBe(false);
 expect(settlement().queryByRole('button',{name:/Colonize/})).toBeNull();
 fireEvent.click(settlement().getByRole('button',{name:'Collect income'}));
 expect(onSubmit).toHaveBeenCalledExactlyOnceWith({type:'finish-upkeep'});
});
it('updates settlement after colonizing without also collecting income',()=>{
 const state=fixture();const {onSubmit,props,rerender}=show(state);
 fireEvent.click(settlement().getByRole('button',{name:/Colonize/}));
 fireEvent.click(screen.getByRole('button',{name:/^Colonize .* planet .* in sector/}));
 fireEvent.click(screen.getByRole('button',{name:'Colonize 1 planet'}));
 const command=onSubmit.mock.calls[0][0] as GameCommand;
 const result=processGameCommand(state,'a',command);expect(result.ok).toBe(true);if(!result.ok)return;
 const view=getPlayerView({...result.state,revision:1},'a')!;
 rerender(<SecondDawnBoard {...props} view={view} candidates={legalCommands(view)} lastAcceptedCommand={{revision:1,type:'colonize'}}/>);
 expect(settlement().getByRole('button',{name:'Collect income'})).toBeEnabled();expect(onSubmit).toHaveBeenCalledTimes(1);
});
it('disables settlement controls during a connection loss',()=>{
 const {onSubmit,props,rerender}=show();rerender(<SecondDawnBoard {...props} connected={false}/>);
 const entry=settlement().getByRole('button',{name:/Colonize/});
 expect(entry).toBeDisabled();expect(settlement().getByRole('button',{name:'Collect income'})).toBeDisabled();fireEvent.click(entry);expect(onSubmit).not.toHaveBeenCalled();
});
