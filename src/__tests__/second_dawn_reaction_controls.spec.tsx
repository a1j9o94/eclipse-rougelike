import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import Board from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function fixture(){const state=createGame({seed:6,warpPortals:true,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});state.seats[0].passed=true;state.firstPasser='a';return state;}
it.each([false,true])('restricts the passed action picker to reactions (mobile=%s)',mobile=>{
 if(mobile)vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const state=fixture(),view=getPlayerView(state,'a')!,submit=vi.fn();
 render(<Board view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={submit} onMenu={vi.fn()}/>);
 if(mobile)fireEvent.click(screen.getByRole('button',{name:'Choose action'}));
 const controls=mobile?within(screen.getByRole('group',{name:'Choose your action'})):screen;
 for(const name of ['Explore','Influence','Research']){const button=controls.getByRole('button',{name:mobile?new RegExp(`^${name}`):name,exact:!mobile});expect(button).toBeDisabled();fireEvent.click(button);}
 for(const name of ['Upgrade','Build','Move'])expect(controls.getByRole('button',{name:mobile?new RegExp(`^${name}`):name,exact:!mobile})).toBeEnabled();
 expect(submit).not.toHaveBeenCalled();
});
