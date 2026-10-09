import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear();});
function fixture(){
 const state=createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});
 state.activeSeatId='b';state.seats[0].resources={money:20,science:20,materials:20};
 return getPlayerView(state,'a')!;
}
it('keeps off-turn build choices interactive during an opponent decision and queues only after confirmation',()=>{
 const view={...fixture(),waitingFor:{owner:'b',kind:'control' as const}},onSubmit=vi.fn(),onQueue=vi.fn();
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={onSubmit} onQueue={onQueue} onMenu={vi.fn()}/>);
 expect(screen.getByText('Action · opponent decision')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Build',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Add interceptor'}));
 const sector=view.sectors.find(sector=>sector.owner==='a')!;
 fireEvent.click(screen.getByRole('button',{name:`Place interceptor in sector ${sector.tileId}`}));
 fireEvent.click(screen.getByRole('button',{name:/Build 1 ship/}));
 const confirmation=screen.getByRole('dialog',{name:'Queue Build'});
 expect(within(confirmation).getByText('Will execute on your turn.')).toBeVisible();
 expect(onQueue).not.toHaveBeenCalled();expect(onSubmit).not.toHaveBeenCalled();
 fireEvent.click(within(confirmation).getByRole('button',{name:'Confirm · will execute on your turn'}));
 expect(onQueue).toHaveBeenCalledExactlyOnceWith({type:'build',builds:[{component:'interceptor',sectorId:sector.id}]});
 expect(onSubmit).not.toHaveBeenCalled();
});
it('allows canceling the saved next action and confirms replacement through the ordinary workflow',()=>{
 const view=fixture(),onQueue=vi.fn(),command={type:'pass' as const};
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={vi.fn()} onQueue={onQueue} queuedAction={{command,status:'pending'}} onMenu={vi.fn()}/>);
 expect(screen.getByRole('region',{name:'Queued next action'})).toHaveTextContent('Pass · will execute on your turn');
 fireEvent.click(screen.getByRole('button',{name:'Cancel queued action'}));expect(onQueue).toHaveBeenCalledWith(null);
 fireEvent.click(screen.getByRole('button',{name:/^Pass(?: \+2 money)?$/}));
 expect(screen.getByRole('dialog',{name:'Queue Pass'})).toHaveTextContent('Replaces your queued action.');
});
it('retains a failed queued command and displays its reason without automatic resubmission',()=>{
 const view=fixture(),onQueue=vi.fn();
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={vi.fn()} onQueue={onQueue} queuedAction={{command:{type:'pass'},status:'failed',error:'Ship is now pinned.'}} onMenu={vi.fn()}/>);
 expect(screen.getByRole('region',{name:'Queued next action'})).toHaveTextContent('Ship is now pinned.');expect(onQueue).not.toHaveBeenCalled();
});
it('keeps a viewer-owned decision authoritative rather than enabling its queue',()=>{
 const view={...fixture(),pendingDecision:{id:'own-control',kind:'control' as const,owner:'a',sectorId:'sector'}},onQueue=vi.fn();
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={vi.fn()} onQueue={onQueue} onMenu={vi.fn()}/>);
 expect(screen.getByRole('button',{name:'Build',exact:true})).toBeDisabled();expect(onQueue).not.toHaveBeenCalled();
});
it('returns a reviewed draft to ordinary confirmation when the turn arrives before queue confirmation',()=>{
 const view=fixture(),onQueue=vi.fn(),onSubmit=vi.fn();
 const props={connected:true,busy:false,status:'Saved',onQueue,onSubmit,onMenu:vi.fn()};
 const ui=render(<SecondDawnBoard {...props} view={view} candidates={legalCommands(view)}/>);
 fireEvent.click(screen.getByRole('button',{name:/^Pass(?: \+2 money)?$/}));
 expect(screen.getByRole('dialog',{name:'Queue Pass'})).toBeVisible();
 const next={...view,activeSeatId:'a'};ui.rerender(<SecondDawnBoard {...props} view={next} candidates={legalCommands(next)}/>);
 expect(screen.queryByRole('dialog',{name:'Queue Pass'})).toBeNull();expect(onQueue).not.toHaveBeenCalled();expect(onSubmit).not.toHaveBeenCalled();
 ui.rerender(<SecondDawnBoard {...props} view={view} candidates={legalCommands(view)}/>);
 expect(screen.queryByRole('dialog',{name:'Queue Pass'})).toBeNull();
});
it('uses the same research card purchase while off-turn and retains its draft before acceptance',()=>{
 const view={...fixture(),technologyMarket:['fusion-drive']},onQueue=vi.fn(),onSubmit=vi.fn();
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onQueue={onQueue} onSubmit={onSubmit} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Research',exact:true}));fireEvent.click(screen.getByRole('button',{name:/Fusion Drive ×/}));
 const commit=within(screen.getByRole('region',{name:'Research Fusion Drive'})).getByRole('button',{name:'Research · 4 science'});expect(commit).toBeEnabled();fireEvent.click(commit);
 expect(onSubmit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm · will execute on your turn'}));
 expect(onQueue).toHaveBeenCalledExactlyOnceWith({type:'research',tileId:'fusion-drive',track:'nano'});expect(screen.queryByText('Acquired · Fusion Drive')).toBeNull();
});
it('lets off-turn players fit upgrades without inheriting an opponent action budget',()=>{
 const view={...fixture(),actionProgress:{owner:'b',action:'move' as const,remaining:0}},onQueue=vi.fn();
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onQueue={onQueue} onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Upgrade',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Slot 4: Empty slot'}));fireEvent.click(screen.getByRole('button',{name:'Install Hull in slot 4'}));
 fireEvent.click(screen.getByRole('button',{name:'Apply 1 upgrade'}));expect(screen.getByRole('dialog',{name:'Queue Upgrade'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Confirm · will execute on your turn'}));expect(onQueue.mock.calls[0][0]).toMatchObject({type:'upgrade',blueprints:[{shipType:'interceptor',parts:[null,null,null,'hull']}]});
});
it('exposes the ordinary mobile Actions picker off-turn during an opponent choice',()=>{
 vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const view={...fixture(),waitingFor:{owner:'b',kind:'control' as const}};
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onQueue={vi.fn()} onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Choose action'}));const picker=screen.getByRole('group',{name:'Choose your action'});fireEvent.click(within(picker).getByRole('button',{name:/Build/}));
 expect(screen.getByRole('button',{name:'Add interceptor'})).toBeEnabled();
});
it('plans movement using viewer capacity while the opponent has no move activations left',()=>{
 const view=fixture(),onQueue=vi.fn(),onSubmit=vi.fn();view.warpPortals=true;
 const source=view.sectors.find(sector=>sector.owner==='a')!,target=view.sectors.find(sector=>sector.owner==='b')!;source.portalVp=1;target.portalVp=1;view.actionProgress={owner:'b',action:'move',remaining:0};
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onQueue={onQueue} onSubmit={onSubmit} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Move',exact:true}));fireEvent.click(screen.getByRole('checkbox',{name:'Interceptor 1'}));
 fireEvent.click(screen.getByRole('button',{name:new RegExp(`Inspect sector ${target.tileId},`)}));
 fireEvent.click(screen.getByRole('button',{name:/^Execute 1 route/}));
 expect(screen.getByRole('dialog',{name:'Queue Move'})).toHaveTextContent('New action · 1 influence disc');
 fireEvent.click(screen.getByRole('button',{name:'Confirm · will execute on your turn'}));expect(onQueue.mock.calls[0][0]).toMatchObject({type:'move',moves:[{shipId:view.ships.find(ship=>ship.owner==='a')!.id,path:[target.id]}]});expect(onSubmit).not.toHaveBeenCalled();
});
it('keeps failed queue recovery in the ordinary own-turn controls',()=>{
 const view={...fixture(),activeSeatId:'a'},onSubmit=vi.fn(),onQueue=vi.fn();
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onQueue={onQueue} onSubmit={onSubmit} queuedAction={{command:{type:'pass'},status:'failed',error:'No longer legal.'}} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:/^Pass(?: \+2 money)?$/}));expect(onSubmit).toHaveBeenCalledWith({type:'pass'});expect(onQueue).not.toHaveBeenCalled();
});
