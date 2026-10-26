import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import type {GameState,PlayerView} from '../../shared/eclipse/types';
import fixtures from '../second-dawn-game/reviewFixtures.json';
import Board from '../second-dawn-game/SecondDawnBoard';

afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function battleView(){
 const state=structuredClone(fixtures.combat) as GameState;
 return getPlayerView(state,state.pendingDecision!.owner);
}
it.each([false,true])('hands a completed battle to sector control without covering the map or committing a choice (mobile=%s)',mobile=>{
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:mobile,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const view=battleView(),submit=vi.fn();
 const props={connected:true,busy:false,status:'Saved',onSubmit:submit,onMenu:vi.fn()};
 const ui=render(<Board {...props} view={view} candidates={legalCommands(view)}/>);
 const battle=screen.getByRole('region',{name:'Battle workspace'});
 const next:PlayerView={...view,revision:view.revision+1,battle:undefined,pendingDecision:{id:'claim-after-battle',owner:view.viewerSeatId,kind:'control',sectorId:view.battle!.sectorId}};
 ui.rerender(<Board {...props} view={next} candidates={legalCommands(next)}/>);
 expect(screen.getByRole('region',{name:'Battle workspace'})).toBe(battle);
 expect(screen.getByRole('button',{name:'Continue to sector control'})).toBeVisible();
 expect(screen.queryByRole('button',{name:'Return to sector control'})).toBeNull();
 expect(ui.container.querySelector('.dg-board-surface')).toHaveAttribute('hidden');
 fireEvent.click(screen.getByRole('button',{name:'Continue to sector control'}));
 expect(battle).not.toBeVisible();
 expect(ui.container.querySelector('.dg-in-battle')).toBeNull();
 expect(ui.container.querySelector('.dg-board-surface')).not.toHaveAttribute('hidden');
 const control=screen.getByRole('region',{name:'sector control controls'});
 expect(control).toBeVisible();
 expect(submit).not.toHaveBeenCalled();
 fireEvent.click(within(control).getByRole('radio',{name:'Leave uncontrolled'}));
 fireEvent.click(within(control).getByRole('button',{name:'Confirm control'}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:'claim-after-battle',choice:{kind:'control',accept:false}});
 const followUp:PlayerView={...next,revision:next.revision+1,pendingDecision:{id:'portal-after-control',owner:view.viewerSeatId,kind:'portal-placement',sectorIds:[view.battle!.sectorId]}};
 ui.rerender(<Board {...props} view={followUp} candidates={legalCommands(followUp)}/>);
 expect(screen.getByRole('region',{name:'portal placement controls'})).toBeVisible();
 expect(battle).not.toBeVisible();
 expect(screen.queryByRole('button',{name:'Continue to portal placement'})).toBeNull();
});
it('provides an explicit continuation from the battle result to upkeep without collecting income',()=>{
 const view=battleView(),submit=vi.fn(),props={connected:true,busy:false,status:'Saved',onSubmit:submit,onMenu:vi.fn()};
 const ui=render(<Board {...props} view={view} candidates={legalCommands(view)}/>);
 const next:PlayerView={...view,revision:view.revision+1,phase:'upkeep',activeSeatId:view.viewerSeatId,upkeepDone:[],battle:undefined,pendingDecision:null,private:{...view.private,reputationSummary:{id:'battle-reputation',battleId:view.battle!.id!,sectorId:view.battle!.sectorId,round:view.round,drawn:[3],selected:3,kept:[3],returned:[]}}};
 ui.rerender(<Board {...props} view={next} candidates={legalCommands(next)}/>);
 expect(screen.getByRole('region',{name:'Your reputation result'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Continue to upkeep'}));
 expect(screen.queryByRole('region',{name:'Battle workspace'})).toBeNull();
 expect(screen.getByRole('region',{name:'Upkeep settlement'})).toBeVisible();
 expect(submit).not.toHaveBeenCalled();
});
