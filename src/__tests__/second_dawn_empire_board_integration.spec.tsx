// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();localStorage.clear();});
function renderBoard(){const state=createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});state.activeSeatId='a';state.seats[0].resources.materials=20;const view=getPlayerView(state,'a')!,onSubmit=vi.fn();render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={onSubmit} onMenu={vi.fn()}/>);return{view,onSubmit};}
it('opens settings without leaving the game and saves the dice preference without another confirmation',()=>{
 renderBoard();const settings=screen.getByRole('button',{name:'Settings',exact:true});settings.focus();fireEvent.click(settings);
 const dialog=screen.getByRole('dialog',{name:'Game settings'});const dice=within(dialog).getByRole('checkbox',{name:/3D combat dice/});expect(dice).toBeChecked();fireEvent.click(dice);expect(localStorage.getItem('eclipse.second-dawn.dice3d.v1')).toBe('off');fireEvent.keyDown(dialog,{key:'Escape'});expect(screen.queryByRole('dialog',{name:'Game settings'})).toBeNull();expect(settings).toHaveFocus();
});
it('inspects an empire location without spending or editing an unfinished build order',()=>{
 const {onSubmit}=renderBoard();fireEvent.click(screen.getAllByRole('button',{name:'Build',exact:true})[0]);fireEvent.click(screen.getByRole('button',{name:'Add cruiser'}));
 fireEvent.click(within(screen.getByRole('region',{name:'Civilization roster'})).getByRole('button',{name:/Terran Directorate/}));
 expect(screen.getByRole('heading',{name:'Faction abilities'})).toBeVisible();
 const planet=screen.getAllByRole('button',{name:/Inspect sector .*planet/})[0];fireEvent.click(planet);
 expect(screen.getByRole('heading',{name:'Planets & population'})).toBeVisible();expect(screen.queryByRole('heading',{name:'Assemble your build order'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Back to empire'}));fireEvent.click(screen.getAllByRole('button',{name:'Build',exact:true})[0]);expect(screen.getByRole('button',{name:'Remove cruiser from order'})).toBeInTheDocument();expect(onSubmit).not.toHaveBeenCalled();
});
