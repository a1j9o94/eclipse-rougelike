// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(cleanup);
it('shows current loadouts and switches all ship classes without discarding an uncommitted draft',()=>{
const state=createGame({seed:11,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'terran-federation',controller:'ai'}]});const view=getPlayerView(state,'a')!;const submit=vi.fn();
render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
fireEvent.click(screen.getByRole('button',{name:'Blueprints',exact:true}));
const classes=screen.getByRole('navigation',{name:'Ship classes'});
for(const name of ['Interceptor','Cruiser','Dreadnought','Starbase'])expect(within(classes).getByRole('button',{name})).toBeTruthy();
expect(screen.getAllByRole('group',{name:/Ion Cannon statistics/}).length).toBeGreaterThan(0);
fireEvent.click(within(classes).getByRole('button',{name:'Interceptor'}));
fireEvent.click(screen.getByRole('button',{name:'Slot 4: Empty slot'}));
fireEvent.click(screen.getByRole('button',{name:'Install Hull in slot 4'}));
fireEvent.click(within(classes).getByRole('button',{name:'Cruiser'}));
expect(screen.getByRole('heading',{name:'Edit cruiser'})).toBeTruthy();
fireEvent.click(within(classes).getByRole('button',{name:'Interceptor'}));
fireEvent.click(screen.getByRole('button',{name:'Slot 4: Hull'}));
expect(screen.getByRole('button',{name:'Install Hull in slot 4'})).toHaveAttribute('aria-pressed','true');
expect(submit).not.toHaveBeenCalled();
});
