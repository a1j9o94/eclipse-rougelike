// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import baseStyles from '../second-dawn/second-dawn.css?raw';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();document.querySelector('[data-scroll-regression]')?.remove();localStorage.clear();});
it('keeps the command center scrollable while a minimized upkeep choice retains its map and selected sector',()=>{
 const style=document.createElement('style');style.dataset.scrollRegression='';style.textContent=baseStyles;document.head.append(style);
 const state=createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});
 state.phase='upkeep';state.activeSeatId='a';state.seats[0].passed=true;
 const sector=state.sectors.find(sector=>sector.owner==='a')!;
 state.pendingDecision={id:'upkeep-shortfall',owner:'a',kind:'bankruptcy',shortfall:1,abandonableSectorIds:[sector.id]};
 const view=getPlayerView(state,'a')!,onSubmit=vi.fn();
 const {container}=render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={onSubmit} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:sector.tileId,exact:true}));
 fireEvent.click(within(screen.getByRole('region',{name:'Civilization roster'})).getByRole('button',{name:/Terran Directorate/}));
 expect(screen.getByRole('heading',{name:'Faction abilities'})).toBeVisible();
 expect(container.querySelector('.dg-choice-workspace[hidden] .sd-map')).not.toBeNull();
 expect(getComputedStyle(container.querySelector('.sd-main')!).overflow).toBe('auto');
 fireEvent.click(screen.getByRole('button',{name:'Return to upkeep shortfall'}));
 expect(screen.getByRole('button',{name:sector.tileId,exact:true})).toHaveAttribute('aria-pressed','true');
 expect(onSubmit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Minimize upkeep shortfall'}));
 expect(getComputedStyle(container.querySelector('.sd-main')!).overflow).toBe('hidden');
});
