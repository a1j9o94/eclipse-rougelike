import {useCallback,useMemo,useState} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {processGameCommand} from '../../shared/eclipse/engine';
import {legalCommands} from '../../shared/eclipse/legal';
import type {GameCommand,PendingDecision,PlayerView} from '../../shared/eclipse/types';
import ExplorationDecision from '../second-dawn-game/ExplorationDecision';
import {DecisionMapContext,type DecisionMapPresentation} from '../second-dawn-game/decisionMapContext';
afterEach(cleanup);
function fixture(){
 const state=createGame({seed:1703,warpPortals:false,ruleOptions:{explorationRules:true},seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'orion',controller:'human'}]});
 const command=legalCommands(getPlayerView(state,'a')!).find(c=>c.command.type==='explore')!.command;
 const result=processGameCommand(state,'a',command);if(!result.ok)throw Error(result.error.message);
 const view=getPlayerView(result.state,'a')!,decision=view.pendingDecision;if(decision?.kind!=='exploration')throw Error('fixture');
 return {view,decision};
}
function Harness({view,decision,onPresent,focus,onSubmit}:{view:PlayerView;decision:Extract<PendingDecision,{kind:'exploration'}>;onPresent:(p:DecisionMapPresentation|null)=>void;focus:(id:string)=>void;onSubmit:(c:GameCommand)=>void}){
 const [selectedSectorId,selectSector]=useState<string|null>(null),[presentation,setMap]=useState<DecisionMapPresentation|null>(null),[minimized,setMinimized]=useState(false);
 const setPresentation=useCallback((next:DecisionMapPresentation|null)=>{onPresent(next);setMap(next);},[onPresent]);
 const context=useMemo(()=>({selectedSectorId,selectSector,focusSector:focus,setPresentation}),[selectedSectorId,focus,setPresentation]);
 return <DecisionMapContext.Provider value={context}><button onClick={()=>selectSector(view.sectors[0].id)}>Select existing sector</button><button onClick={()=>setMinimized(v=>!v)}>Toggle minimized</button><output data-testid="shared-rotation">{presentation?.view.sectors.at(-1)?.rotation}</output><div hidden={minimized}><ExplorationDecision view={view} decision={decision} disabled={false} onSubmit={onSubmit}/></div></DecisionMapContext.Provider>;
}
it('publishes a stable preview to the shared galaxy without rendering another map, preserves draft while minimized, and commits explicitly',()=>{
 const {view,decision}=fixture(),onPresent=vi.fn(),focus=vi.fn(),submit=vi.fn();
 const rendered=render(<Harness view={view} decision={decision} onPresent={onPresent} focus={focus} onSubmit={submit}/>);
 expect(screen.queryByRole('group',{name:'Galaxy map'})).toBeNull();
 expect(onPresent).toHaveBeenCalledTimes(1);
 const initial=onPresent.mock.calls[0][0] as DecisionMapPresentation,preview=initial.view.sectors.at(-1)!;
 expect(initial).toMatchObject({legalTargetIds:[preview.id],targetLabel:'new sector preview',showPrintedWormholes:true});
 expect(preview).toMatchObject({tileId:decision.drawnTileIds[0],rotation:decision.placements[0].rotation});
 fireEvent.click(screen.getByRole('button',{name:'Rotate clockwise'}));
 const rotation=(preview.rotation+5)%6;
 expect(screen.getByTestId('shared-rotation')).toHaveTextContent(String(rotation));expect(submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Toggle minimized'}));fireEvent.click(screen.getByRole('button',{name:'Toggle minimized'}));
 expect(screen.getByTestId('shared-rotation')).toHaveTextContent(String(rotation));
 fireEvent.click(screen.getByRole('button',{name:'Focus new sector'}));expect(focus).toHaveBeenCalledWith(preview.id);
 fireEvent.click(screen.getByRole('button',{name:'Select existing sector'}));expect(screen.getByRole('heading',{name:`Sector ${view.sectors[0].tileId}`})).toBeVisible();
 const second=decision.drawnTileIds[1];fireEvent.click(screen.getByRole('button',{name:new RegExp(`Sector ${second}`)}));
 expect(onPresent.mock.calls.at(-1)![0].view.sectors.at(-1)).toMatchObject({tileId:second,rotation:decision.placements.find(p=>p.tileId===second)?.rotation??0});
 fireEvent.click(screen.getByRole('button',{name:'Place sector'}));expect(submit).toHaveBeenCalledWith({type:'resolve',decisionId:decision.id,choice:{kind:'exploration',tileId:second,rotation:decision.placements.find(p=>p.tileId===second)?.rotation??0}});
 rendered.unmount();expect(onPresent).toHaveBeenLastCalledWith(null);
});
it('keeps discard and redraw explicit in the shared map inspector',()=>{
 const {view,decision}=fixture(),submit=vi.fn();render(<Harness view={view} decision={decision} onPresent={vi.fn()} focus={vi.fn()} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Discard sector'}));expect(submit).toHaveBeenLastCalledWith({type:'resolve',decisionId:decision.id,choice:{kind:'exploration',tileId:null,rotation:0}});
 fireEvent.click(screen.getByRole('button',{name:'Use exploration joker · redraw'}));expect(submit).toHaveBeenLastCalledWith({type:'resolve',decisionId:decision.id,choice:{kind:'exploration',tileId:null,rotation:0,redraw:true}});
});
it('preserves a compatible orientation when choosing another saved tile',()=>{
 const {view,decision}=fixture(),submit=vi.fn();
 const rotations={...decision,placements:decision.drawnTileIds.flatMap(tileId=>[0,2].map(rotation=>({tileId,rotation})))};
 render(<ExplorationDecision view={view} decision={rotations} disabled={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Rotate counterclockwise'}));fireEvent.click(screen.getByRole('button',{name:'Rotate counterclockwise'}));
 fireEvent.click(screen.getByRole('button',{name:new RegExp(`Sector ${decision.drawnTileIds[1]}`)}));
 expect(screen.getByTestId('drawn-exploration-tile')).toHaveAttribute('data-rotation','2');
 expect(submit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Place sector'}));
 expect(submit).toHaveBeenCalledWith({type:'resolve',decisionId:decision.id,choice:{kind:'exploration',tileId:decision.drawnTileIds[1],rotation:2}});
});
it('keeps an incompatible orientation visible and identifies its blocker instead of substituting one',()=>{
 const {view,decision}=fixture();
 const rotations={...decision,placements:[{tileId:decision.drawnTileIds[0],rotation:2},{tileId:decision.drawnTileIds[1],rotation:0}]};
 render(<ExplorationDecision view={view} decision={rotations} disabled={false} onSubmit={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:new RegExp(`Sector ${decision.drawnTileIds[1]}`)}));
 expect(screen.getByTestId('drawn-exploration-tile')).toHaveAttribute('data-rotation','2');
 expect(screen.getByRole('button',{name:'Place sector'})).toBeDisabled();
 expect(screen.getByRole('status')).toHaveTextContent('Cannot place');
});
