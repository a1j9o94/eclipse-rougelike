// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {processGameCommand} from '../../shared/eclipse/engine';
import type {GameCommand} from '../../shared/eclipse/types';
import BuildPlanner from '../second-dawn-game/BuildPlanner';
import MovementPlanner from '../second-dawn-game/MovementPlanner';
afterEach(cleanup);
function fixture(action:'build'|'move'){
 const state=createGame({seed:42,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});
 state.activeSeatId='a';state.seats[0].resources={money:20,science:0,materials:20};state.engine!.action={owner:'a',action,remaining:1};
 const source=state.sectors.find(s=>s.owner==='a')!,target=state.sectors.find(s=>s.owner==='b')!;source.portalVp=1;target.portalVp=1;
 return {state,source,target,view:getPlayerView(state,'a')!};
}
it('offers a build confirmation only when the full order is placed, and submits the exact reviewed order once',()=>{
 const f=fixture('build'),submit=vi.fn();render(<BuildPlanner view={f.view} sectorId={f.source.id} embedded disabled={false} onClose={vi.fn()} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Add interceptor'}));expect(screen.queryByRole('dialog',{name:'Build order ready'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:`Place interceptor in sector ${f.source.tileId}`}));
 const alert=screen.getByRole('dialog',{name:'Build order ready'});expect(within(alert).getByRole('region',{name:'Action cost preview'})).toBeVisible();expect(submit).not.toHaveBeenCalled();
 fireEvent.click(within(alert).getByRole('button',{name:'Confirm build'}));expect(submit).toHaveBeenCalledTimes(1);
 const command=submit.mock.calls[0][0] as GameCommand;expect(command).toEqual({type:'build',builds:[{component:'interceptor',sectorId:f.source.id}]});expect(processGameCommand(f.state,'a',command).ok).toBe(true);
});
it('keeps a dismissed complete build editable without repeating its alert on a revision refresh',()=>{
 const f=fixture('build'),submit=vi.fn(),props={view:f.view,sectorId:f.source.id,embedded:true,disabled:false,onClose:vi.fn(),onSubmit:submit};const ui=render(<BuildPlanner {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Add interceptor'}));fireEvent.click(screen.getByRole('button',{name:`Place interceptor in sector ${f.source.tileId}`}));fireEvent.click(within(screen.getByRole('dialog',{name:'Build order ready'})).getByRole('button',{name:'Keep editing'}));
 ui.rerender(<BuildPlanner {...props} view={{...f.view,revision:f.view.revision+1}}/>);expect(screen.queryByRole('dialog',{name:'Build order ready'})).toBeNull();expect(submit).not.toHaveBeenCalled();
});
it('waits for a destination before offering a single full move, and hides the alert when disabled',()=>{
 const f=fixture('move'),submit=vi.fn(),props={view:f.view,sourceSectorId:f.source.id,selectedTargetId:null,disabled:false,onTargetsChange:vi.fn(),onClose:vi.fn(),onSubmit:submit};const ui=render(<MovementPlanner {...props}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'Interceptor 1'}));expect(screen.queryByRole('dialog',{name:'Movement plan ready'})).toBeNull();
 ui.rerender(<MovementPlanner {...props} selectedTargetId={f.target.id}/>);expect(screen.getByRole('dialog',{name:'Movement plan ready'})).toBeVisible();
 ui.rerender(<MovementPlanner {...props} selectedTargetId={f.target.id} disabled/>);expect(screen.queryByRole('dialog',{name:'Movement plan ready'})).toBeNull();expect(submit).not.toHaveBeenCalled();
});
it('waits until a full route is queued and preserves betrayal consequences in the confirmation',()=>{
 const f=fixture('move');f.state.seats[0].ambassadors=['b'];f.state.seats[1].ambassadors=['a'];f.view=getPlayerView(f.state,'a')!;
 const submit=vi.fn();render(<MovementPlanner view={f.view} sourceSectorId={f.source.id} selectedTargetId={f.target.id} disabled={false} onRoutePreview={vi.fn()} onTargetsChange={vi.fn()} onClose={vi.fn()} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'Interceptor 1'}));expect(screen.queryByRole('dialog',{name:'Movement plan ready'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Queue route · 1 ship'}));
 const alert=screen.getByRole('dialog',{name:'Movement plan ready'});expect(within(alert).getByText(/Breaks diplomacy with Hydran Progress/)).toBeVisible();expect(submit).not.toHaveBeenCalled();
 fireEvent.click(within(alert).getByRole('button',{name:'Confirm move'}));expect(submit).toHaveBeenCalledTimes(1);expect(processGameCommand(f.state,'a',submit.mock.calls[0][0] as GameCommand).ok).toBe(true);
});
it('suppresses a complete build while a save is pending or a decision must be resolved',()=>{
 const f=fixture('build'),submit=vi.fn(),props={view:f.view,sectorId:f.source.id,embedded:true,disabled:false,onClose:vi.fn(),onSubmit:submit};const ui=render(<BuildPlanner {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Add interceptor'}));fireEvent.click(screen.getByRole('button',{name:`Place interceptor in sector ${f.source.tileId}`}));
 ui.rerender(<BuildPlanner {...props} disabled/>);expect(screen.queryByRole('dialog',{name:'Build order ready'})).toBeNull();
 ui.rerender(<BuildPlanner {...props} view={{...f.view,pendingDecision:{id:'pending',owner:'a',kind:'reputation',drawn:[2],capacity:4}}}/>);expect(screen.queryByRole('dialog',{name:'Build order ready'})).toBeNull();expect(submit).not.toHaveBeenCalled();
});
it('includes resource conversion in the full-build alert and sends it atomically with construction',()=>{
 const f=fixture('build');f.state.seats[0].resources={money:4,science:0,materials:1};f.view=getPlayerView(f.state,'a')!;const submit=vi.fn();
 render(<BuildPlanner view={f.view} sectorId={f.source.id} embedded disabled={false} onClose={vi.fn()} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Add interceptor'}));fireEvent.click(screen.getByRole('button',{name:`Place interceptor in sector ${f.source.tileId}`}));
 const alert=screen.getByRole('dialog',{name:'Build order ready'});expect(within(alert).getByText(/money: 4 → 0/)).toBeVisible();expect(within(alert).getByText(/Conversion and construction happen together/)).toBeVisible();
 fireEvent.click(within(alert).getByRole('button',{name:'Convert & confirm build'}));const command=submit.mock.calls[0][0] as GameCommand;expect(command.type).toBe('trade-and-act');expect(processGameCommand(f.state,'a',command).ok).toBe(true);
});
it('keeps incomplete build and movement allowances quiet',()=>{
 const f=fixture('build');f.state.engine!.action!.remaining=2;f.view=getPlayerView(f.state,'a')!;
 const first=render(<BuildPlanner view={f.view} sectorId={f.source.id} embedded disabled={false} onClose={vi.fn()} onSubmit={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Add interceptor'}));fireEvent.click(screen.getByRole('button',{name:`Place interceptor in sector ${f.source.tileId}`}));expect(screen.queryByRole('dialog',{name:'Build order ready'})).toBeNull();first.unmount();
 f.state.engine!.action={owner:'a',action:'move',remaining:2};f.view=getPlayerView(f.state,'a')!;
 render(<MovementPlanner view={f.view} sourceSectorId={f.source.id} selectedTargetId={f.target.id} disabled={false} onTargetsChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'Interceptor 1'}));expect(screen.queryByRole('dialog',{name:'Movement plan ready'})).toBeNull();
});
