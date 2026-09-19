import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import {processGameCommand} from '../../shared/eclipse/engine';
import type {GameCommand} from '../../shared/eclipse/types';
import EmpireOverview from '../second-dawn-game/EmpireOverview';
import Board from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();localStorage.clear();});
function fixture(){const state=createGame({seed:4,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});state.seats[0].resources={money:0,science:0,materials:12};state.seats[0].technologies={military:[],grid:[],nano:[]};return {state,view:getPlayerView(state,'a')!};}
const callbacks=()=>({onSector:vi.fn(),onNavigate:vi.fn(),onBlueprints:vi.fn(),onBuild:vi.fn()});
it('shows priced build shortcuts on own ship cards and explains locked starbases',()=>{
 const {view}=fixture(),props=callbacks();render(<EmpireOverview view={view} seatId="a" {...props}/>);
 const interceptor=within(screen.getByRole('group',{name:'Interceptor fleet'})).getByRole('button',{name:'Build interceptor · 3 materials'});
 expect(interceptor).toBeEnabled();expect(interceptor.querySelector('svg')).not.toBeNull();
 fireEvent.click(interceptor);expect(props.onBuild).toHaveBeenCalledExactlyOnceWith('interceptor');
 const starbase=within(screen.getByRole('group',{name:'Starbase fleet'}));
 expect(starbase.getByRole('button',{name:'Build starbase · 3 materials'})).toBeDisabled();expect(starbase.getByText(/Research Starbase/i)).toBeVisible();
});
it('keeps affordable conversions explicit and disables unaffordable or disconnected shortcuts',()=>{
 const {view}=fixture(),props=callbacks();view.seats[0].resources={money:6,science:0,materials:0};
 const ui=render(<EmpireOverview view={view} seatId="a" {...props}/>);
 expect(screen.getByRole('button',{name:'Build interceptor · 3 materials · conversion required'})).toBeEnabled();
 expect(within(screen.getByRole('group',{name:'Interceptor fleet'})).getByText('Conversion required')).toBeVisible();
 view.seats[0].resources.money=0;ui.rerender(<EmpireOverview view={view} seatId="a" {...props}/>);
 expect(screen.getByRole('button',{name:'Build interceptor · 3 materials'})).toBeDisabled();
 view.seats[0].resources.materials=12;ui.rerender(<EmpireOverview view={view} seatId="a" {...props} buildUnavailableReason="Reconnect to build."/>);
 expect(screen.getByRole('button',{name:'Build interceptor · 3 materials'})).toBeDisabled();
 expect(within(screen.getByRole('group',{name:'Interceptor fleet'})).getByText('Reconnect to build.')).toBeVisible();
});
it('never offers build shortcuts for an inspected opponent',()=>{
 const {view}=fixture();render(<EmpireOverview view={view} seatId="b" {...callbacks()}/>);
 expect(screen.queryByRole('button',{name:/^Build /})).toBeNull();expect(screen.getByRole('button',{name:'Inspect Interceptor blueprint'})).toBeEnabled();
});
it('adds the selected ship to the existing uncommitted order and requires placement and confirmation',()=>{
 const {state,view}=fixture(),submit=vi.fn();
 render(<Board view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
 const openEmpire=()=>fireEvent.click(within(screen.getByRole('region',{name:'Civilization roster'})).getByRole('button',{name:/Terran Directorate/}));
 openEmpire();fireEvent.click(screen.getByRole('button',{name:'Build interceptor · 3 materials'}));
 expect(screen.getByRole('heading',{name:'Assemble your build order'})).toBeVisible();expect(screen.getByText(/0 placed · 1 unplaced/)).toBeVisible();expect(submit).not.toHaveBeenCalled();
 openEmpire();fireEvent.click(screen.getByRole('button',{name:'Build cruiser · 5 materials'}));
 expect(screen.getByText(/0 placed · 2 unplaced/)).toBeVisible();expect(submit).not.toHaveBeenCalled();
 const tile=view.sectors.find(sector=>sector.owner==='a')!.tileId;
 fireEvent.click(screen.getByRole('button',{name:`Place cruiser in sector ${tile}`}));
 fireEvent.click(screen.getByRole('button',{name:`Place interceptor in sector ${tile}`}));
 fireEvent.click(screen.getByRole('button',{name:'Build 2 ships · 8 materials'}));
 expect(submit).toHaveBeenCalledOnce();const command=submit.mock.calls[0][0] as GameCommand;
 expect(command).toMatchObject({type:'build',builds:[{component:'interceptor'},{component:'cruiser'}]});expect(processGameCommand(state,'a',command).ok).toBe(true);
});
