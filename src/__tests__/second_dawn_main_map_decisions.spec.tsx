// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import {processGameCommand} from '../../shared/eclipse/engine';
import type {PlayerView} from '../../shared/eclipse/types';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
function state(){return createGame({seed:1703,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});}
function props(view:PlayerView){return {view,candidates:legalCommands(view),connected:true,busy:false,status:'',onSubmit:vi.fn(),onMenu:vi.fn()};}
it('places exploration on the same interactive main map with rotation and confirmation in the inspector',()=>{
 const initial=state(),view=getPlayerView(initial,'a')!,p=props(view),ui=render(<SecondDawnBoard {...p}/>);
 fireEvent.click(screen.getByRole('button',{name:'View turn'}));const map=screen.getByRole('group',{name:'Galaxy map'});
 const explore=legalCommands(view).find(c=>c.command.type==='explore')!.command,result=processGameCommand(initial,'a',explore);if(!result.ok)throw Error(result.error.message);
 const next=getPlayerView(result.state,'a')!;ui.rerender(<SecondDawnBoard {...p} view={next} candidates={legalCommands(next)}/>);
 expect(screen.getAllByRole('group',{name:'Galaxy map'})).toHaveLength(1);expect(screen.getByRole('group',{name:'Galaxy map'})).toBe(map);
 expect(map.closest('[inert]')).toBeNull();expect(ui.container.querySelectorAll('.sd-map')).toHaveLength(1);
 const inspector=screen.getByRole('complementary',{name:'Selection and action details'});
 fireEvent.click(within(inspector).getByRole('button',{name:'Rotate clockwise'}));expect(p.onSubmit).not.toHaveBeenCalled();
 fireEvent.click(within(inspector).getByRole('button',{name:'Rotate counterclockwise'}));
 fireEvent.click(within(inspector).getByRole('button',{name:'Place sector'}));
 expect(p.onSubmit).toHaveBeenCalledWith(expect.objectContaining({type:'resolve',decisionId:next.pendingDecision!.id,choice:expect.objectContaining({kind:'exploration'})}));
});
it('selects upkeep abandonment on the main map and preserves it through command-center inspection',()=>{
 const s=state(),home=s.sectors.find(v=>v.owner==='a')!;s.phase='upkeep';s.activeSeatId='a';s.pendingDecision={id:'shortfall',owner:'a',kind:'bankruptcy',shortfall:1,abandonableSectorIds:[home.id]};
 const p=props(getPlayerView(s,'a')!),ui=render(<SecondDawnBoard {...p}/>);
 const map=screen.getByRole('group',{name:'Galaxy map'});expect(ui.container.querySelectorAll('.sd-map')).toHaveLength(1);
 expect(screen.getByRole('button',{name:'Abandon selected sector'})).toBeDisabled();
 fireEvent.click(within(map).getByRole('button',{name:new RegExp(`^Inspect sector ${home.tileId},`)}));
 expect(screen.getByRole('button',{name:'Abandon selected sector'})).toBeEnabled();expect(p.onSubmit).not.toHaveBeenCalled();
 fireEvent.click(within(screen.getByRole('region',{name:'Civilization roster'})).getByRole('button',{name:/Terran Directorate/}));
 fireEvent.click(screen.getByRole('button',{name:'Return to upkeep shortfall'}));
 expect(screen.getByRole('button',{name:home.tileId,exact:true})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(screen.getByRole('button',{name:'Abandon selected sector'}));
 expect(p.onSubmit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:'shortfall',choice:{kind:'bankruptcy',abandonSectorId:home.id}});
});
it('keeps influence control decisions beside the galaxy without a separate map dialog',()=>{
 const s=state(),sector=s.sectors.find(v=>!v.owner)!;s.pendingDecision={id:'control',owner:'a',kind:'control',sectorId:sector.id};
 const p=props(getPlayerView(s,'a')!),ui=render(<SecondDawnBoard {...p}/>);
 expect(screen.getAllByRole('group',{name:'Galaxy map'})).toHaveLength(1);expect(ui.container.querySelector('.dg-choice-workspace')).toBeNull();
 const inspector=screen.getByRole('complementary',{name:'Selection and action details'});
 fireEvent.click(within(inspector).getByRole('radio',{name:'Leave uncontrolled'}));
 fireEvent.click(within(inspector).getByRole('button',{name:'Confirm control'}));
 expect(p.onSubmit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:'control',choice:{kind:'control',accept:false}});
});
it('opens spatial decisions in the existing mobile sheet with a return after dismissal',()=>{
 vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const s=state(),home=s.sectors.find(v=>v.owner==='a')!;s.pendingDecision={id:'portal',owner:'a',kind:'portal-placement',sectorIds:[home.id]};
 const p=props(getPlayerView(s,'a')!),ui=render(<SecondDawnBoard {...p}/>);
 expect(ui.container.querySelectorAll('.sd-map')).toHaveLength(1);
 expect(ui.container.querySelector('.dg-mobile-sheet')).toHaveAttribute('data-sheet-state','expanded');
 fireEvent.click(screen.getByRole('button',{name:'Dismiss details'}));
 fireEvent.click(screen.getByRole('button',{name:'Return to portal placement'}));
 expect(ui.container.querySelector('.dg-mobile-sheet')).toHaveAttribute('data-sheet-state','expanded');expect(p.onSubmit).not.toHaveBeenCalled();
});
it('uses main-map highlights and the same inspector for automatic colonization',()=>{
 const s=state(),home=s.sectors.find(v=>v.owner==='a')!;home.population=[];
 s.pendingDecision={id:'colonize',owner:'a',kind:'colonization',squares:[{sectorId:home.id,squareId:'p0',resources:['money']}]};
 const p=props(getPlayerView(s,'a')!),ui=render(<SecondDawnBoard {...p}/>);
 expect(ui.container.querySelectorAll('.sd-map')).toHaveLength(1);
 const inspector=screen.getByRole('complementary',{name:'Selection and action details'});
 expect(within(inspector).getByRole('region',{name:'Colonization planner'})).toBeInTheDocument();
 expect(within(screen.getByRole('group',{name:'Galaxy map'})).getByRole('button',{name:/available planet/})).toBeInTheDocument();
 expect(p.onSubmit).not.toHaveBeenCalled();
});
it('keeps real fleet inspection available while an upkeep choice remains editable',()=>{
 const s=state(),home=s.sectors.find(v=>v.owner==='a')!;s.phase='upkeep';s.pendingDecision={id:'shortfall',owner:'a',kind:'bankruptcy',shortfall:1,abandonableSectorIds:[home.id]};
 const p=props(getPlayerView(s,'a')!);render(<SecondDawnBoard {...p}/>);
 fireEvent.click(screen.getByRole('button',{name:home.tileId,exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Hydran Progress: 1 Interceptor'}));
 expect(screen.getByRole('dialog',{name:/Fleet inspection/})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Return to plan'}));
 expect(screen.getByRole('button',{name:'Abandon selected sector'})).toBeEnabled();expect(p.onSubmit).not.toHaveBeenCalled();
});
it('keeps mandatory spatial controls visible when AI-follow returns control to the human',()=>{
 const s=state();s.seats[1].controller='ai';const view=getPlayerView(s,'a')!,p=props(view);
 const history={entries:[],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:vi.fn()};
 const ui=render(<SecondDawnBoard {...p} history={history}/>);
 const entry={revision:1,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Researched Improved Hull',details:[],presentation:{kind:'research' as const,technologyId:'improved-hull' as const}};
 ui.rerender(<SecondDawnBoard {...p} view={{...view,activeSeatId:'b',revision:1}} history={{...history,entries:[entry]}}/>);
 expect(screen.getByRole('region',{name:'AI action details'})).toBeVisible();
 const next={...view,revision:2,pendingDecision:{id:'control',owner:'a',kind:'control' as const,sectorId:view.sectors[0].id}};
 ui.rerender(<SecondDawnBoard {...p} view={next} candidates={legalCommands(next)} history={{...history,entries:[entry]}}/>);
 expect(screen.getByRole('complementary',{name:'Selection and action details'})).toBeVisible();
 expect(screen.getByRole('button',{name:'Confirm control'})).toBeInTheDocument();
});
