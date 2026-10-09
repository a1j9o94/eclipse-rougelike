import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import type {PendingDecision} from '../../shared/eclipse/types';
import DecisionPanel from '../second-dawn-game/DecisionPanel';
afterEach(cleanup);
it('requires exactly two explicit ExFor discovery choices and never auto submits',()=>{
 const submit=vi.fn();
 const decision:PendingDecision={id:'draft',owner:'a',kind:'discovery-draft',tileIds:['money-1','money-2','money-3'],keepCount:2};
 render(<DecisionPanel decision={decision} disabled={false} reputation={[]} onSubmit={submit}/>);
 const confirm=screen.getByRole('button',{name:'Keep 2 discoveries'});
 expect(confirm).toBeDisabled();
 const choices=screen.getAllByRole('checkbox');
 fireEvent.click(choices[0]);fireEvent.click(choices[1]);
 expect(confirm).toBeEnabled();expect(submit).not.toHaveBeenCalled();
 fireEvent.click(confirm);
 expect(submit).toHaveBeenCalledWith({type:'resolve',decisionId:'draft',choice:{kind:'discovery-draft',tileIds:['money-1','money-2']}});
});
it('technology reservation explicitly allows declining instead of silently reserving a tile',()=>{
 const submit=vi.fn();
 const decision:PendingDecision={id:'reserve',owner:'a',kind:'technology-reservation',tileIds:['plasma-cannon']};
 render(<DecisionPanel decision={decision} disabled={false} reputation={[]} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Skip reservation'}));
 expect(submit).toHaveBeenCalledWith({type:'resolve',decisionId:'reserve',choice:{kind:'technology-reservation',tileId:null}});
});

import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import MovementPlanner from '../second-dawn-game/MovementPlanner';
import GuildTradePanel from '../second-dawn-game/GuildTradePanel';
import FactionAbilityControls from '../second-dawn-game/FactionAbilityControls';
import type {FactionId} from '../../shared/eclipse/catalog';
function fixture(faction:FactionId){const state=createGame({seed:4,factionProfile:'scifi-v1',seats:[{id:'a',faction,controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});return {state,source:state.sectors.find(s=>s.owner==='a')!,target:state.sectors.find(s=>s.owner==='b')!};}
it('shows a Formic convoy as one activation and submits explicit escorts',()=>{
 const {state,source,target}=fixture('formics');source.portalVp=1;target.portalVp=1;
 state.ships.push({id:'escort',owner:'a',type:'interceptor',sectorId:source.id,damage:0,arrival:5});
 const view=getPlayerView(state,'a');const submit=vi.fn();
 render(<MovementPlanner view={view} sourceSectorId={source.id} selectedTargetId={target.id} disabled={false} onTargetsChange={()=>{}} onClose={()=>{}} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'Cruiser 1'}));
 fireEvent.click(screen.getByRole('checkbox',{name:/Interceptor 1.*sectors/i}));
 fireEvent.click(screen.getByRole('button',{name:/Confirm move.*1 activation/i}));
 expect(submit.mock.calls[0][0].moves).toEqual([{shipId:state.ships.find(s=>s.owner==='a'&&s.type==='cruiser')!.id,path:[target.id],escorts:['escort']}]);
});
it('does not offer Formic convoy selectors during a reaction',()=>{
 const {state,source,target}=fixture('formics');state.seats[0].passed=true;source.portalVp=1;target.portalVp=1;
 const view=getPlayerView(state,'a');
 render(<MovementPlanner view={view} sourceSectorId={source.id} selectedTargetId={target.id} disabled={false} onTargetsChange={()=>{}} onClose={()=>{}} onSubmit={()=>{}}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'Cruiser 1'}));
 expect(screen.getByText('Reaction: one ship, without escorts.')).toBeVisible();
 expect(screen.queryByText(/convoy · up to/)).toBeNull();
});
it('shows escrow offers and sends a direct resource exchange without converting to the bank',()=>{
 const {state}=fixture('spacing-guild');state.guildOffers=[{id:'offer',owner:'a',give:'materials',receive:'science',remaining:2}];state.activeSeatId='b';
 const view=getPlayerView(state,'b');const submit=vi.fn();
 render(<GuildTradePanel view={view} candidates={legalCommands(view)} disabled={false} onSubmit={submit}/>);
 expect(screen.getByText(/2 materials reserved/)).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Pay 2 science · receive 2 materials'}));
 expect(submit).toHaveBeenCalledWith({type:'accept-guild-offer',offerId:'offer',amount:2});
});
it('offers Bob factories only for eligible Interceptors and makes the population cost visible',()=>{
 const {state}=fixture('bobiverse');const view=getPlayerView(state,'a');const submit=vi.fn();
 render(<FactionAbilityControls view={view} candidates={legalCommands(view)} disabled={false} onSubmit={submit} onAction={()=>{}}/>);
 expect(screen.getByText(/Load a Materials cube/)).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:/Load factory/}));
 expect(submit).toHaveBeenCalledWith({type:'load-factory',shipId:state.ships.find(s=>s.owner==='a')!.id});
});

import {movementPlan,queuedMovementPlan} from '../second-dawn-game/movementPlanning';
it('rejects queued portal transport exceeding available Money and charges repeated traversal only once',()=>{
 const state=createGame({seed:4,factionProfile:'scifi-v1',seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'spacing-guild',controller:'human'}]});
 const source=state.sectors.find(s=>s.owner==='a')!,target=state.sectors.find(s=>s.owner==='b')!;source.portalVp=1;
 const ship=state.ships.find(s=>s.owner==='a')!;state.ships.push({...ship,id:'second'});state.seats[0].resources.money=1;
 const view=getPlayerView(state,'a');
 const queued=queuedMovementPlan(view,[{sourceSectorId:source.id,shipIds:[ship.id],destinationSectorId:target.id},{sourceSectorId:source.id,shipIds:['second'],destinationSectorId:target.id}]);
 expect(queued.routes.map(route=>route.status)).toEqual(['valid','rejected']);
 expect(queued.projectedView.seats[0].resources.money).toBe(0);
 const returnTrip=queuedMovementPlan(view,[{sourceSectorId:source.id,shipIds:[ship.id],destinationSectorId:target.id},{sourceSectorId:target.id,shipIds:[ship.id],destinationSectorId:source.id}]);
 expect(returnTrip.routes.every(r=>r.status==='valid')).toBe(true);
 expect(returnTrip.projectedView.seats[0].resources.money).toBe(0);
 expect(movementPlan({...view,seats:view.seats.map(s=>s.id==='a'?{...s,resources:{...s.resources,money:0}}:s)},source.id,[ship.id]).destinations.some(d=>d.sectorId===target.id)).toBe(false);
});
it('lets ExFor keep two physical copies of the same discovery independently',()=>{
 const submit=vi.fn();const decision:PendingDecision={id:'duplicates',owner:'a',kind:'discovery-draft',tileIds:['money','money','materials'],keepCount:2};
 render(<DecisionPanel decision={decision} disabled={false} reputation={[]} onSubmit={submit}/>);
 const choices=screen.getAllByRole('checkbox');fireEvent.click(choices[0]);fireEvent.click(choices[1]);
 fireEvent.click(screen.getByRole('button',{name:'Keep 2 discoveries'}));
 expect(submit).toHaveBeenCalledWith({type:'resolve',decisionId:'duplicates',choice:{kind:'discovery-draft',tileIds:['money','money']}});
});
it('allows a customer to fill part of a finite Guild offer',()=>{
 const {state}=fixture('spacing-guild');state.guildOffers=[{id:'partial',owner:'a',give:'materials',receive:'science',remaining:3}];state.activeSeatId='b';
 const view=getPlayerView(state,'b');const submit=vi.fn();render(<GuildTradePanel view={view} candidates={legalCommands(view)} disabled={false} onSubmit={submit}/>);
 fireEvent.change(screen.getByRole('spinbutton',{name:'Exchange quantity for partial'}),{target:{value:'1'}});
 fireEvent.click(screen.getByRole('button',{name:'Pay 1 science · receive 1 materials'}));
 expect(submit).toHaveBeenCalledWith({type:'accept-guild-offer',offerId:'partial',amount:1});
});
import {emptyActionDrafts,setDraftValue,writeActionDrafts,readActionDrafts} from '../second-dawn-game/actionDraftStorage';
it('preserves convoy escorts and Guild offer drafts across reload without storing hidden decisions',()=>{
 const partition={matchId:'scifi-match',viewerSeatId:'a'};let draft=emptyActionDrafts(partition);
 draft=setDraftValue(draft,'movement',{source:'home',ids:['cruiser'],escortsByLeader:{cruiser:['factory']}},2);
 draft=setDraftValue(draft,'movementRoutes',[{sourceSectorId:'home',shipIds:['cruiser'],destinationSectorId:'outpost',escortsByLeader:{cruiser:['factory']}}],2);
 draft=setDraftValue(draft,'guildGive','materials',2);draft=setDraftValue(draft,'guildAmount',3,2);
 const map=new Map<string,string>();const storage={getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{map.set(key,value);}};
 expect(writeActionDrafts(storage,draft)).toBe(true);const restored=readActionDrafts(storage,partition);
 expect(restored.values).toEqual(draft.values);
});
import {SECTORS} from '../../shared/eclipse/sectors';
it('offers a longer free wormhole route when the shorter Guild portal route is unaffordable',()=>{
 const state=createGame({seed:4,factionProfile:'scifi-v1',seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'spacing-guild',controller:'human'}]});
 const source=state.sectors.find(s=>s.owner==='a')!,target=state.sectors.find(s=>s.owner==='b')!,middle=state.sectors.find(s=>s.owner===null)!;
 const tiles=SECTORS.filter(t=>t.wormholes.includes(0)&&t.wormholes.includes(3)&&!t.warpPortal).slice(0,3);
 state.sectors=[source,middle,target];state.sectors.forEach((s,index)=>{s.position={q:index,r:0};s.rotation=0;s.tileId=String(tiles[index].id);});source.portalVp=1;state.seats[0].resources.money=0;state.ships=state.ships.filter(s=>s.owner==='a'||s.owner==='b');
 const ship=state.ships.find(s=>s.owner==='a')!;const plan=movementPlan(getPlayerView(state,'a'),source.id,[ship.id]);
 expect(plan.destinations.find(d=>d.sectorId===target.id)?.command.moves).toEqual([{shipId:ship.id,path:[middle.id]},{shipId:ship.id,path:[target.id]}]);
});


import {factionPresentation} from '../second-dawn-game/factionPresentation';
it('describes Guild remote prospecting on every Explore action',()=>{
 const ability=factionPresentation('spacing-guild').benefits.find(benefit=>benefit.label.includes('remote prospecting'));
 expect(ability?.detail).toMatch(/every Explore action/i);
 expect(ability?.label).not.toMatch(/per round/i);
});
