// @vitest-environment jsdom
import {fireEvent,render,screen} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import FactionAbilityControls from '../second-dawn-game/FactionAbilityControls';
function view(){return getPlayerView(createGame({seed:9,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]}),'a')!;}
it('makes colony conversion outcome explicit without spending until clicked',()=>{
 const v=view();v.seats[0].faction='magellan';const submit=vi.fn();
 render(<FactionAbilityControls view={v} candidates={[{command:{type:'convert-colony-ship',resource:'science'},label:'Convert',description:''}]} disabled={false} onSubmit={submit} onAction={vi.fn()}/>);
 expect(screen.getByText(/1 colony ship/i)).toBeVisible();expect(submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:/Gain 1 science/}));expect(submit).toHaveBeenCalledWith({type:'convert-colony-ship',resource:'science'});
});
it('prices Midas continuation using discs remaining and offers a clear finish',()=>{
 const v=view();v.seats[0].faction='midas';v.seats[0].influenceOnTrack=6;v.actionProgress={owner:'a',action:'research',remaining:0};const submit=vi.fn(),activate=vi.fn();
 render(<FactionAbilityControls view={v} candidates={[{command:{type:'buy-activation',action:'research'},label:'Extra',description:''},{command:{type:'end-action'},label:'Done',description:''}]} disabled={false} onSubmit={submit} onAction={activate}/>);
 fireEvent.click(screen.getByRole('button',{name:/Extra Research.*4 Money/}));expect(submit).toHaveBeenCalledWith({type:'buy-activation',action:'research'});expect(activate).toHaveBeenCalledWith('research');
 fireEvent.click(screen.getByRole('button',{name:'Finish action'}));expect(submit).toHaveBeenLastCalledWith({type:'end-action'});
});
it('exposes Ragnarok remaining types separately and switches without committing',()=>{
 const v=view();v.seats[0].faction='ragnarok';v.actionProgress={owner:'a',action:'build',remaining:0,budgets:{build:0,move:1}};const action=vi.fn(),submit=vi.fn();
 render(<FactionAbilityControls view={v} candidates={[]} disabled={false} onSubmit={submit} onAction={action}/>);
 expect(screen.getByRole('button',{name:'Build · 0 left'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Move · 1 left'}));expect(action).toHaveBeenCalledWith('move');expect(submit).not.toHaveBeenCalled();
});

it('uses the mixed movement allowance even when the primary Build allowance is exhausted',async()=>{
 const {movementPlan}=await import('../second-dawn-game/movementPlanning');const {analyzeBuildOrder,emptyBuildOrder}=await import('../second-dawn-game/buildPlanning');
 const v=view();v.actionProgress={owner:'a',action:'build',remaining:0,budgets:{build:0,move:1}};
 expect(movementPlan(v,null,[]).capacity).toBe(1);expect(analyzeBuildOrder(v,emptyBuildOrder()).limit).toBe(0);
});
it('does not offer Rho Indi a Dreadnought despite base-game component supply',async()=>{
 const {empireBuildOptions}=await import('../second-dawn-game/empireBuildOptions');const {emptyBuildOrder}=await import('../second-dawn-game/buildPlanning');
 const v=view();v.seats[0].faction='rho-indi';v.seats[0].resources.materials=20;
 expect(empireBuildOptions(v,emptyBuildOrder()).find(c=>c.shipType==='dreadnought')?.disabledReason).toMatch(/does not build Dreadnoughts/);
});
it('keeps legal colony conversion available during upkeep',()=>{
 const v=view();v.phase='upkeep';v.seats[0].faction='magellan';const submit=vi.fn();
 render(<FactionAbilityControls view={v} candidates={[{command:{type:'convert-colony-ship',resource:'money'},label:'Convert',description:''}]} disabled={false} onSubmit={submit} onAction={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:/Gain 1 money/}));expect(submit).toHaveBeenCalledWith({type:'convert-colony-ship',resource:'money'});
});
it('includes Magellan historic parts in public score without exposing reputation',async()=>{
 const {runningScore}=await import('../second-dawn-game/runningScore');const {scoreInspection}=await import('../second-dawn-game/publicInspection');
 const v=view();v.seats[0].faction='magellan';v.seats[0].ancientPartsUsed=3;v.private.reputation=[4,3];
 expect(runningScore(v,'a').breakdown.species).toBe(3);expect(runningScore(v,'a').breakdown.reputation).toBe(0);
 expect(scoreInspection(v,'a','species').explanation).toMatch(/later removed/);
});
it('restores the active mixed workflow and explains remaining budgets without charging another disc',async()=>{
 const {default:Board}=await import('../second-dawn-game/SecondDawnBoard');const v=view();v.seats[0].faction='ragnarok';v.actionProgress={owner:'a',action:'build',remaining:2,budgets:{build:1,move:1}};
 render(<Board view={v} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 expect(screen.getByRole('button',{name:'Build',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(screen.getByText('Build & move: 1 build · 1 move remaining. No extra action disc.')).toBeVisible();
});
