// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import {processGameCommand} from '../../shared/eclipse/engine';
import type {GameCommand, GameState} from '../../shared/eclipse/types';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();localStorage.clear();});
function fixture(){
 const state=createGame({seed:4,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 state.activeSeatId='a';state.sectors.forEach(s=>{s.portalVp=1;});
 const source=state.sectors.find(s=>s.owner==='a')!;
 state.ships=state.ships.filter(s=>s.owner==='a');state.ships.push({...state.ships[0],id:'second'});
 return {state,source,targets:state.sectors.filter(s=>s.id!==source.id)};
}
function board(state:GameState,submit:(command:GameCommand)=>void,receipt?:{revision:number;type:GameCommand['type']},busy=false){
 const view=getPlayerView(state,'a')!;
 return <SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={busy} status="" onSubmit={submit} onMenu={()=>{}} lastAcceptedCommand={receipt}/>;
}
function destination(tileId:string){return screen.getAllByRole('button',{name:new RegExp(`^Inspect sector ${tileId},`)})[0];}
function startMove(tileId:string){
 fireEvent.click(screen.getByRole('button',{name:'Move',exact:true}));
 fireEvent.click(screen.getByRole('checkbox',{name:'Interceptor 1'}));
 fireEvent.click(destination(tileId));
 fireEvent.click(screen.getByRole('button',{name:/Execute 1 route/}));
}
it('keeps the departure context and moves a second ship elsewhere without reopening',()=>{
 const {state,source,targets}=fixture();const submit=vi.fn();const ui=render(board(state,submit));
 startMove(targets[0].tileId);
 expect(screen.getByRole('region',{name:'Move fleet'})).toBeInTheDocument();
 const first=processGameCommand(state,'a',submit.mock.calls[0][0]);expect(first.ok).toBe(true);if(!first.ok)return;first.state.revision=state.revision+1;
 ui.rerender(board(first.state,submit,{revision:first.state.revision,type:'move'}));
 expect(screen.getByRole('heading',{name:`Depart sector ${source.tileId}`})).toBeInTheDocument();
 expect(screen.getByText('2 moves left in this action')).toBeInTheDocument();
 expect(screen.getByRole('checkbox',{name:'Interceptor 1'})).not.toBeChecked();
 fireEvent.click(screen.getByRole('checkbox',{name:'Interceptor 1'}));fireEvent.click(destination(targets[1].tileId));
 fireEvent.click(screen.getByRole('button',{name:/Execute 1 route/}));expect(submit).toHaveBeenCalledTimes(2);
 const second=processGameCommand(first.state,'a',submit.mock.calls[1][0]);expect(second.ok).toBe(true);if(!second.ok)return;
 expect(second.state.ships.map(s=>s.sectorId)).toEqual([targets[0].id,targets[1].id]);
 expect(second.state.seats[0].influenceOnTrack).toBe(state.seats[0].influenceOnTrack-1);
});
it('retains an unaccepted move and selection after busy clears',()=>{
 const {state,targets}=fixture();const submit=vi.fn();const ui=render(board(state,submit));startMove(targets[0].tileId);
 ui.rerender(board(state,submit,undefined,true));ui.rerender(board(state,submit));
 expect(screen.getByRole('checkbox',{name:'Interceptor 1'})).toBeChecked();
 expect(screen.getByRole('button',{name:/Execute 1 route/})).toBeEnabled();
});
it('waits for the accepted board before completing an exhausted move action',()=>{
 const {state,targets}=fixture();state.engine!.action={owner:'a',action:'move',remaining:1};
 const submit=vi.fn();const ui=render(board(state,submit));startMove(targets[0].tileId);
 const result=processGameCommand(state,'a',submit.mock.calls[0][0]);expect(result.ok).toBe(true);if(!result.ok)return;result.state.revision=state.revision+1;
 const receipt={revision:result.state.revision,type:'move' as const};
 ui.rerender(board(state,submit,receipt));expect(screen.getByRole('region',{name:'Move fleet'})).toBeInTheDocument();
 expect(within(screen.getByRole('region',{name:'Move fleet'})).getByRole('button',{name:/Execute 0 routes/})).toBeDisabled();
 ui.rerender(board(result.state,submit,receipt));expect(screen.queryByRole('region',{name:'Move fleet'})).toBeNull();
});

it('ends the current move action with Done moving and closes on acceptance',()=>{
 const {state}=fixture();state.engine!.action={owner:'a',action:'move',remaining:2};
 const submit=vi.fn();const ui=render(board(state,submit));fireEvent.click(screen.getByRole('button',{name:'Move',exact:true}));
 fireEvent.click(within(screen.getByRole('region',{name:'Move fleet'})).getByRole('button',{name:/Done moving/}));expect(submit).toHaveBeenCalledWith({type:'end-action'});
 expect(screen.getByRole('region',{name:'Move fleet'})).toBeInTheDocument();
 ui.rerender(board(state,submit,undefined,true));ui.rerender(board(state,submit));
 expect(within(screen.getByRole('region',{name:'Move fleet'})).getByRole('button',{name:/Done moving/})).toBeEnabled();
 const result=processGameCommand(state,'a',submit.mock.calls[0][0]);expect(result.ok).toBe(true);if(!result.ok)return;
 result.state.revision=state.revision+1;ui.rerender(board(result.state,submit,{revision:result.state.revision,type:'end-action'}));
 expect(screen.queryByRole('region',{name:'Move fleet'})).toBeNull();
});
