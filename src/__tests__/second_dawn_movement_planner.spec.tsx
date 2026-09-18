// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { processGameCommand } from '../../shared/eclipse/engine';
import MovementPlanner from '../second-dawn-game/MovementPlanner';
import { movementPlan } from '../second-dawn-game/movementPlanning';
import { SECTORS } from '../../shared/eclipse/sectors';
afterEach(cleanup);
function fixture() {
 const state=createGame({seed:4,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 const source=state.sectors.find(s=>s.owner==='a')!;const target=state.sectors.find(s=>s.owner==='b')!;
 source.portalVp=1;target.portalVp=1;
 state.ships.push({...state.ships.find(s=>s.owner==='a')!,id:'second'});
 return {state,source,target,view:getPlayerView(state,'a')!};
}
function chainFixture() {
 const state=createGame({seed:4,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 const source=state.sectors.find(s=>s.owner==='a')!;
 const middle=state.sectors.find(s=>s.owner===null)!;
 const target=state.sectors.find(s=>s.owner==='b')!;
 const tiles=SECTORS.filter(tile=>tile.wormholes.includes(0)&&tile.wormholes.includes(3)&&!tile.warpPortal).slice(0,3);
 state.sectors=[source,middle,target];
 state.sectors.forEach((sector,index)=>{sector.position={q:index,r:0};sector.rotation=0;sector.tileId=String(tiles[index].id);sector.portalVp=undefined;});
 state.ships=state.ships.filter(ship=>ship.owner==='a');
 return {state,source,middle,target,ship:state.ships[0]};
}
describe('visual movement planning',()=>{
 it('spends two activations on a speed-one ship in one command and only one influence disc',()=>{
  const {state,source,middle,target,ship}=chainFixture();
  const before=state.seats[0].influenceOnTrack;
  const destination=movementPlan(getPlayerView(state,'a')!,source.id,[ship.id]).destinations.find(d=>d.sectorId===target.id);
  expect(destination?.command.moves).toEqual([{shipId:ship.id,path:[middle.id]},{shipId:ship.id,path:[target.id]}]);
  const result=processGameCommand(state,'a',destination!.command);
  expect(result.ok).toBe(true);
  if(result.ok){expect(result.state.seats[0].influenceOnTrack).toBe(before-1);expect(result.state.engine?.action?.remaining).toBe(1);expect(result.state.ships.find(s=>s.id===ship.id)?.sectorId).toBe(target.id);}
  expect(state.seats[0].influenceOnTrack).toBe(before);
 });
 it('excludes a distant destination when only one activation remains and stops at an intermediate pin',()=>{
  const {state,source,middle,target,ship}=chainFixture();
  state.engine!.action={owner:'a',action:'move',remaining:1};
  expect(movementPlan(getPlayerView(state,'a')!,source.id,[ship.id]).destinations.map(d=>d.sectorId)).not.toContain(target.id);
  state.engine!.action=null;
  state.ships.push({...ship,id:'enemy-pin',owner:'b',sectorId:middle.id});
  const destinations=movementPlan(getPlayerView(state,'a')!,source.id,[ship.id]).destinations.map(d=>d.sectorId);
  expect(destinations).toContain(middle.id);expect(destinations).not.toContain(target.id);
  expect(processGameCommand(state,'a',{type:'move',moves:[{shipId:ship.id,path:[middle.id]},{shipId:ship.id,path:[target.id]}]}).ok).toBe(false);
 });
 it('retains a single activation for a speed-two ship across two sectors',()=>{
  const {state,source,middle,target,ship}=chainFixture();
  const blueprint=state.seats[0].blueprints.find(b=>b.shipType==='interceptor')!;
  blueprint.parts[1]='fusion-source';blueprint.parts[2]='fusion-drive';
  const destination=movementPlan(getPlayerView(state,'a')!,source.id,[ship.id]).destinations.find(d=>d.sectorId===target.id);
  expect(destination?.command.moves).toEqual([{shipId:ship.id,path:[middle.id,target.id]}]);
  expect(processGameCommand(state,'a',destination!.command).ok).toBe(true);
 });
 it('budgets activations across a mixed-speed fleet instead of counting each ship once',()=>{
  const {state,source,target,ship}=chainFixture();
  state.ships.push({...ship,id:'fast-cruiser',type:'cruiser'});
  const blueprint=state.seats[0].blueprints.find(b=>b.shipType==='cruiser')!;
  blueprint.parts[3]='fusion-source';blueprint.parts[4]='fusion-drive';
  const ids=[ship.id,'fast-cruiser'];
  const destination=movementPlan(getPlayerView(state,'a')!,source.id,ids).destinations.find(d=>d.sectorId===target.id);
  expect(destination?.command.moves).toHaveLength(3);
  expect(processGameCommand(state,'a',destination!.command).ok).toBe(true);
  state.engine!.action={owner:'a',action:'move',remaining:2};
  expect(movementPlan(getPlayerView(state,'a')!,source.id,ids).destinations.map(d=>d.sectorId)).not.toContain(target.id);
 });
 it('shows one combined ship route and its real activation count before confirming the repeated move once',()=>{
  const {state,source,target,ship}=chainFixture();const submit=vi.fn();
  const rendered=render(<MovementPlanner view={getPlayerView(state,'a')!} sourceSectorId={source.id} selectedTargetId={target.id} disabled={false} onTargetsChange={vi.fn()} onClose={vi.fn()} onSubmit={submit}/>);
  fireEvent.click(screen.getByRole('checkbox',{name:'Interceptor 1'}));
  expect(screen.getByText('2 / 3 move activations selected')).toBeInTheDocument();
  expect(rendered.container.querySelectorAll('.dg-movement-route p')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button',{name:/Confirm move.*2 activations/}));
  expect(submit).toHaveBeenCalledTimes(1);expect(submit.mock.calls[0][0].moves.map((move:{shipId:string})=>move.shipId)).toEqual([ship.id,ship.id]);
 });
 it('derives an exact multi-ship command accepted by the authoritative engine',()=>{
  const {state,source,target,view}=fixture(); const ids=state.ships.filter(s=>s.owner==='a').map(s=>s.id);
  const plan=movementPlan(view,source.id,ids); const route=plan.destinations.find(d=>d.sectorId===target.id)!;
  expect(route.command.moves).toHaveLength(2);expect(processGameCommand(state,'a',route.command).ok).toBe(true);
 });
 it('prevents moving both ships when one must remain to pin an enemy',()=>{
  const {state,source}=fixture();state.ships.find(s=>s.owner==='b')!.sectorId=source.id;
  const ids=state.ships.filter(s=>s.owner==='a').map(s=>s.id);const view=getPlayerView(state,'a')!;
  expect(movementPlan(view,source.id,[ids[0]]).destinations.length).toBeGreaterThan(0);
  expect(movementPlan(view,source.id,ids).destinations).toEqual([]);
  expect(movementPlan(view,source.id,ids).message).toMatch(/remain|pinn/i);
 });
 it('selects ship cards and a galaxy-selected target before confirming once',()=>{
  const {view,source,target}=fixture();const submit=vi.fn();const targets=vi.fn();
  const props={view,sourceSectorId:source.id,selectedTargetId:null,disabled:false,onTargetsChange:targets,onClose:vi.fn(),onSubmit:submit};
  const rendered=render(<MovementPlanner {...props}/>);
  fireEvent.click(screen.getByRole('checkbox',{name:/Interceptor 1/}));
  expect(targets).toHaveBeenLastCalledWith(expect.arrayContaining([target.id]));expect(submit).not.toHaveBeenCalled();
  rendered.rerender(<MovementPlanner {...props} selectedTargetId={target.id}/>);
  fireEvent.click(screen.getByRole('button',{name:/Confirm move/}));expect(submit).toHaveBeenCalledTimes(1);
 });
 it('explains stationary starbases and asks for a source rather than a dropdown',()=>{
  const {state,source}=fixture();state.ships.push({...state.ships[0],id:'base',owner:'a',sectorId:source.id,type:'starbase'});
  render(<MovementPlanner view={getPlayerView(state,'a')!} sourceSectorId={source.id} selectedTargetId={null} disabled={false} onTargetsChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()}/>);
  expect(screen.getByText(/Starbases cannot move/)).toBeInTheDocument();expect(screen.queryByRole('combobox')).toBeNull();
 });
 it('limits a passed reaction to one ship and retains remaining action activations',()=>{
  const {state,source}=fixture();state.seats[0].passed=true;const ids=state.ships.filter(s=>s.owner==='a').map(s=>s.id);
  expect(movementPlan(getPlayerView(state,'a')!,source.id,ids).capacity).toBe(1);
  expect(movementPlan(getPlayerView(state,'a')!,source.id,ids).destinations).toEqual([]);
  state.seats[0].passed=false;state.engine!.action={owner:'a',action:'move',remaining:1};
  expect(movementPlan(getPlayerView(state,'a')!,source.id,ids).capacity).toBe(1);
 });
 it('does not expose targets during an unrelated outstanding decision',()=>{
  const {state,source}=fixture();state.pendingDecision={id:'choice',kind:'resource-reward',owner:'a',count:1,perChoice:1};
  const ids=state.ships.filter(s=>s.owner==='a').map(s=>s.id);
  expect(movementPlan(getPlayerView(state,'a')!,source.id,ids).destinations).toEqual([]);
 });

 it('includes Improved Logistics in the new action capacity',()=>{
  const {state,source}=fixture();state.seats[0].technologies.military.push('improved-logistics');
  expect(movementPlan(getPlayerView(state,'a')!,source.id,[]).capacity).toBe(4);
 });

});
