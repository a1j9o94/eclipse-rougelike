import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import {processGameCommand} from '../../shared/eclipse/engine';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();localStorage.clear();});
function fixture(){const state=createGame({seed:4,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});state.activeSeatId='a';state.seats[0].resources.materials=30;const own=state.sectors.find(s=>s.owner==='a')!;const other=state.sectors.find(s=>s.owner===null)!;other.owner='a';return {state,own,other};}
it('assembles first, places on two map sectors, inspects safely and submits one build',()=>{
 const {state,own,other}=fixture(),submit=vi.fn(),view=getPlayerView(state,'a')!;
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={submit} onMenu={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Build',exact:true}));
 expect(screen.getByRole('group',{name:'Galaxy map'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Add interceptor'}));fireEvent.click(screen.getByRole('button',{name:'Add cruiser'}));
 fireEvent.click(screen.getByRole('button',{name:new RegExp(`^Inspect sector ${own.tileId},`)}));
 fireEvent.click(screen.getByRole('button',{name:new RegExp(`^Inspect sector ${other.tileId},`)}));
 expect(screen.getByText(/2 placed · 0 unplaced/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Inspect fleet in selected sector'}));
 fireEvent.click(within(screen.getByRole('dialog',{name:/Fleet inspection/})).getByRole('button',{name:'Return to plan'}));
 expect(screen.getByText(/2 placed · 0 unplaced/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/^Build 2/}));
 expect(submit).toHaveBeenCalledOnce();const command=submit.mock.calls[0][0];expect(new Set(command.builds.map((b:{sectorId:string})=>b.sectorId)).size).toBe(2);expect(processGameCommand(state,'a',command).ok).toBe(true);
});

it('switches from a build order to movement without losing the order',()=>{
 const {state}=fixture(),view=getPlayerView(state,'a')!;
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={vi.fn()} onMenu={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Build',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Add interceptor'}));
 fireEvent.click(screen.getByRole('button',{name:'Move',exact:true}));
 expect(screen.getByRole('region',{name:'Move fleet'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Build',exact:true}));
 expect(screen.getByText(/0 placed · 1 unplaced/)).toBeInTheDocument();
 expect(screen.getByRole('button',{name:/^Pass(?: \+2 money)?$/})).toBeInTheDocument();
});
