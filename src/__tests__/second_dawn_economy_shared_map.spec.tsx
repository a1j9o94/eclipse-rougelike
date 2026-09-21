// @vitest-environment jsdom
import {useState,type ReactNode} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import type {PendingDecision} from '../../shared/eclipse/types';
import EconomyDecision from '../second-dawn-game/EconomyDecision';
import {DecisionMapContext,type DecisionMapPresentation} from '../second-dawn-game/decisionMapContext';
afterEach(cleanup);
function fixture(){const state=createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});state.activeSeatId='a';return {state,source:state.sectors.find(s=>s.owner==='a')!,other:state.sectors.find(s=>s.owner==='b')!};}
function MapProvider({children,initial=null,setPresentation,eligible,other}:{children:ReactNode;initial?:string|null;setPresentation:(value:DecisionMapPresentation|null)=>void;eligible:string;other:string}){
 const [selectedSectorId,selectSector]=useState(initial);
 return <DecisionMapContext.Provider value={{selectedSectorId,selectSector,focusSector:vi.fn(),setPresentation}}><button onClick={()=>selectSector(eligible)}>Tap eligible map sector</button><button onClick={()=>selectSector(other)}>Tap unrelated map sector</button>{children}</DecisionMapContext.Provider>;
}
it('uses the shared bankruptcy map without an extra map, requires explicit selection, and rejects unrelated taps',()=>{
 const f=fixture(),decision:Extract<PendingDecision,{kind:'bankruptcy'}>={id:'shortfall',owner:'a',kind:'bankruptcy',shortfall:2,abandonableSectorIds:[f.source.id]};f.state.phase='upkeep';f.state.pendingDecision=decision;
 const view=getPlayerView(f.state,'a')!,submit=vi.fn(),presentation=vi.fn();
 const ui=render(<MapProvider initial={f.source.id} eligible={f.source.id} other={f.other.id} setPresentation={presentation}><EconomyDecision decision={decision} view={view} candidates={legalCommands(view)} reputation={[]} disabled={false} onSubmit={submit}/></MapProvider>);
 expect(ui.container.querySelector('.dg-galaxy')).toBeNull();expect(screen.getByRole('button',{name:'Abandon selected sector'})).toBeDisabled();
 expect(presentation).toHaveBeenLastCalledWith({view,legalTargetIds:[f.source.id],targetLabel:'eligible sector'});
 fireEvent.click(screen.getByRole('button',{name:'Tap unrelated map sector'}));expect(screen.getByRole('button',{name:'Abandon selected sector'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Tap eligible map sector'}));expect(screen.getByRole('button',{name:'Abandon selected sector'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Tap unrelated map sector'}));expect(screen.getByRole('button',{name:'Abandon selected sector'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Tap eligible map sector'}));fireEvent.click(screen.getByRole('button',{name:'Abandon selected sector'}));expect(submit).toHaveBeenCalledWith({type:'resolve',decisionId:decision.id,choice:{kind:'bankruptcy',abandonSectorId:f.source.id}});
});
it('publishes the selected portal preview to the shared map and clears presentation on unmount',()=>{
 const f=fixture(),decision:Extract<PendingDecision,{kind:'portal-placement'}>={id:'portal',owner:'a',kind:'portal-placement',sectorIds:[f.source.id]};f.state.pendingDecision=decision;
 const view=getPlayerView(f.state,'a')!,presentation=vi.fn(),submit=vi.fn();
 const ui=render(<MapProvider eligible={f.source.id} other={f.other.id} setPresentation={presentation}><EconomyDecision decision={decision} view={view} candidates={legalCommands(view)} reputation={[]} disabled={false} onSubmit={submit}/></MapProvider>);
 fireEvent.click(screen.getByRole('button',{name:'Tap eligible map sector'}));expect(screen.getByRole('region',{name:'Preview portal connections'})).toBeVisible();expect(presentation.mock.calls.at(-1)?.[0].view.sectors.find((s:{id:string})=>s.id===f.source.id)).toMatchObject({portalVp:1});expect(view.sectors.find(s=>s.id===f.source.id)?.portalVp).toBeUndefined();
 fireEvent.click(screen.getByRole('button',{name:'Place warp portal'}));expect(submit).toHaveBeenCalledWith({type:'resolve',decisionId:decision.id,choice:{kind:'portal-placement',sectorId:f.source.id}});ui.unmount();expect(presentation).toHaveBeenLastCalledWith(null);
});
it('keeps control fixed to the offered sector while unrelated shared map sectors are inspected',()=>{
 const f=fixture(),sector=f.state.sectors.find(s=>s.owner===null)!,decision:Extract<PendingDecision,{kind:'control'}>={id:'control',owner:'a',kind:'control',sectorId:sector.id};f.state.pendingDecision=decision;
 const view=getPlayerView(f.state,'a')!,submit=vi.fn();const ui=render(<MapProvider eligible={sector.id} other={f.other.id} setPresentation={vi.fn()}><EconomyDecision decision={decision} view={view} candidates={legalCommands(view)} reputation={[]} disabled={false} onSubmit={submit}/></MapProvider>);
 expect(ui.container.querySelector('.dg-galaxy')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Tap unrelated map sector'}));fireEvent.click(screen.getByRole('radio',{name:/Leave uncontrolled/}));fireEvent.click(screen.getByRole('button',{name:'Confirm control'}));expect(submit).toHaveBeenCalledWith({type:'resolve',decisionId:decision.id,choice:{kind:'control',accept:false}});
});
