import {useState} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import type {GameCommand,GameState,PlayerView} from '../../shared/eclipse/types';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
import MovementPlanner from '../second-dawn-game/MovementPlanner';
import {ActionDraftProvider} from '../second-dawn-game/ActionDraftProvider';
import {draftStorageKey,emptyActionDrafts,setDraftValue} from '../second-dawn-game/actionDraftStorage';
import fixturesJson from '../second-dawn-game/reviewFixtures.json?raw';
afterEach(()=>{cleanup();localStorage.clear();});
function battle(){const state=(JSON.parse(fixturesJson) as Record<string,GameState>).combat;return getPlayerView(state,state.pendingDecision!.owner)!;}
const board={candidates:[],connected:true,busy:false,status:'',onSubmit:vi.fn(),onMenu:vi.fn()};
it('keeps a legacy battle without a public id visible while waiting for its opponent',()=>{
 const view=battle();view.battle={...view.battle!,id:undefined};view.pendingDecision=null;view.waitingFor={owner:view.battle.defender,kind:'combat-turn'};
 render(<SecondDawnBoard {...board} view={view}/>);
 expect(screen.queryByRole('region',{name:'Active battle overview'})).not.toBeNull();
});
it('keeps the galaxy available for spatial occupation after the firing encounter',()=>{
 const view=battle();view.pendingDecision={id:'fire-review',owner:view.viewerSeatId,kind:'combat-turn',battleId:view.battle!.id!,shipType:'interceptor',destinationIds:[]};
 const result=render(<SecondDawnBoard {...board} view={view}/>);
 const after={...view,battle:null,pendingDecision:{id:'occupy-review',owner:view.viewerSeatId,kind:'control' as const,sectorId:view.battle!.sectorId}};
 result.rerender(<SecondDawnBoard {...board} view={after}/>);
 expect(screen.queryByRole('group',{name:'Galaxy map'})).not.toBeNull();
});
function movementFixture(count:number){
 const state=createGame({seed:4,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});state.activeSeatId='a';
 const source=state.sectors.find(s=>s.owner==='a')!,target=state.sectors.find(s=>s.owner==='b')!,alternative=state.sectors.find(s=>s.owner===null)!;
 source.portalVp=1;target.portalVp=1;alternative.portalVp=1;
 const ship=state.ships.find(s=>s.owner==='a')!;state.ships=state.ships.filter(s=>s.owner!=='a');
 for(let i=0;i<count;i++)state.ships.push({...ship,id:`ship-${i}`});
 const routes=state.ships.filter(s=>s.owner==='a').map(ship=>({sourceSectorId:source.id,shipIds:[ship.id],destinationSectorId:target.id}));
 const partition={matchId:'movement-review',viewerSeatId:'a'};
 let snapshot=emptyActionDrafts(partition);snapshot=setDraftValue(snapshot,'movementRoutes',routes,0);
 localStorage.setItem(draftStorageKey(partition),JSON.stringify(snapshot));
 return {view:getPlayerView(state,'a')!,source,target,alternative,partition};
}
function MovementHarness({view,source,target,submit}:{view:PlayerView;source:string;target:string;submit:(command:GameCommand)=>void}) {
 const [from,setFrom]=useState<string|null>(source),[to,setTo]=useState<string|null>(target);
 return <><button onClick={()=>setTo(view.sectors.find(s=>s.owner===null)!.id)}>Alternative destination</button><ActionDraftProvider matchId="movement-review" viewerSeatId="a" revision={0}><MovementPlanner view={view} sourceSectorId={from} selectedTargetId={to} disabled={false} onSubmit={submit} onClose={()=>{}} onTargetsChange={()=>{}} onRoutePreview={()=>{}} onSelectionChange={selection=>{setFrom(selection.sourceSectorId);setTo(selection.targetSectorId);}}/></ActionDraftProvider></>;
}
it('never executes the old route after the selected edit removes every ship',()=>{
 const {view,source,target}=movementFixture(1),submit=vi.fn();render(<MovementHarness view={view} source={source.id} target={target.id} submit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Edit route 1'}));fireEvent.click(screen.getByRole('checkbox',{name:'Interceptor 1'}));
 expect(screen.getByRole('button',{name:/^Move fleet/})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:/^Move fleet/}));expect(submit).not.toHaveBeenCalled();
});
it('allows replacing ships in a route even when the whole order consumes the move budget',()=>{
 const {view,source,target}=movementFixture(3);render(<MovementHarness view={view} source={source.id} target={target.id} submit={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Edit route 1'}));fireEvent.click(screen.getByRole('checkbox',{name:'Interceptor 1'}));
 expect(screen.getByRole('checkbox',{name:'Interceptor 2'})).toBeEnabled();
});
it('preserves an edited route when selecting a different route in the same order',()=>{
 const {view,source,target,alternative}=movementFixture(2),submit=vi.fn();render(<MovementHarness view={view} source={source.id} target={target.id} submit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Edit route 1'}));fireEvent.click(screen.getByRole('button',{name:'Alternative destination'}));
 fireEvent.click(screen.getByRole('button',{name:'Edit route 2'}));fireEvent.click(screen.getByRole('button',{name:/^Move fleet/}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'move',moves:[{shipId:'ship-0',path:[alternative.id]},{shipId:'ship-1',path:[target.id]}]});
});
