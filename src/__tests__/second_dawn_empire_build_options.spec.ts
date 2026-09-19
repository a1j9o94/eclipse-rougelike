import {describe,expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {BASE_COMPONENTS,type FactionId} from '../../shared/eclipse/catalog';
import {empireBuildOptions} from '../second-dawn-game/empireBuildOptions';
import {addBuildItem,emptyBuildOrder,placeBuildItem} from '../second-dawn-game/buildPlanning';
import type {PlayerView} from '../../shared/eclipse/types';
function fixture(faction:FactionId='terran-directorate'){
 const state=createGame({seed:32,seats:[{id:'a',faction,controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 state.seats[0].resources={money:0,science:0,materials:30};return getPlayerView(state,'a')!;
}
const option=(view:PlayerView,type='interceptor',draft=emptyBuildOrder())=>empireBuildOptions(view,draft).find(o=>o.shipType===type)!;
describe('empire build shortcuts',()=>{
 it('offers all four ship types with species construction costs',()=>{
  const view=fixture('mechanema');expect(empireBuildOptions(view).map(o=>[o.shipType,o.cost])).toEqual([['interceptor',2],['cruiser',4],['dreadnought',7],['starbase',2]]);
  expect(option(view).disabledReason).toBeNull();expect(option(view).requiresConversion).toBe(false);
 });
 it('requires Starbase research, then offers it without a special blueprint choice',()=>{
  const view=fixture('mechanema');expect(option(view,'starbase').disabledReason).toMatch(/research.*starbase/i);
  view.seats[0].technologies.military.push('starbase');expect(option(view,'starbase').disabledReason).toBeNull();
 });
 it('offers conversion using the selected faction trade ratio and discounts',()=>{
  const view=fixture('mechanema');view.seats[0].resources={materials:1,money:3,science:0};
  expect(option(view)).toMatchObject({cost:2,requiresConversion:true,disabledReason:null});
  const terran=fixture();terran.seats[0].resources={materials:2,money:2,science:0};expect(option(terran)).toMatchObject({requiresConversion:true,disabledReason:null});
 });
 it('disables unaffordable ships even after every legal conversion',()=>{
  const view=fixture();view.seats[0].resources={materials:1,money:1,science:1};expect(option(view).disabledReason).toMatch(/materials|afford|resources/i);expect(option(view).requiresConversion).toBe(false);
 });
 it('counts existing ships and unplaced orders against finite supply',()=>{
  const view=fixture(),home=view.sectors.find(s=>s.owner==='a')!.id;
  view.ships=view.ships.filter(s=>s.owner!=='a');
  for(let i=0;i<BASE_COMPONENTS.perColor.interceptor-1;i++)view.ships.push({id:`i${i}`,owner:'a',type:'interceptor',sectorId:home,damage:0});
  expect(option(view).disabledReason).toBeNull();const draft=addBuildItem(emptyBuildOrder(),'interceptor');expect(option(view,'interceptor',draft).disabledReason).toMatch(/supply|deployed|unbuilt/i);
 });
 it('requires an owned deployment sector, regardless of ships in uncontrolled space',()=>{
  const view=fixture();view.sectors.forEach(s=>{if(s.owner==='a')s.owner=null;});expect(option(view).disabledReason).toMatch(/controlled|control|sector/i);
 });
 it.each(['off-turn','phase','own-decision','other-decision','eliminated','other-action','other-owner-action','exhausted'] as const)('disables every shortcut for %s',reason=>{
  const view=fixture();
  if(reason==='off-turn')view.activeSeatId='b';
  if(reason==='phase')view.phase='upkeep';
  if(reason==='own-decision')view.pendingDecision={id:'d',owner:'a',kind:'discovery',tileId:'money',options:['keep']};
  if(reason==='other-decision')view.waitingFor={owner:'b',kind:'discovery'};
  if(reason==='eliminated')view.seats[0].eliminated=true;
  if(reason==='other-action')view.actionProgress={owner:'a',action:'move',remaining:2};
  if(reason==='other-owner-action')view.actionProgress={owner:'b',action:'build',remaining:2};
  if(reason==='exhausted')view.actionProgress={owner:'a',action:'build',remaining:0};
  expect(empireBuildOptions(view).every(o=>o.disabledReason!==null)).toBe(true);
 });
 it('requires a disc for both a new action and a passed one-piece reaction',()=>{
  const view=fixture();view.seats[0].influenceOnTrack=0;expect(option(view).disabledReason).toMatch(/influence|disc/i);
  view.seats[0].passed=true;expect(option(view).disabledReason).toMatch(/influence|disc/i);
  view.seats[0].influenceOnTrack=1;expect(option(view).disabledReason).toBeNull();
  expect(option(view,'cruiser',addBuildItem(emptyBuildOrder(),'interceptor')).disabledReason).toMatch(/limit|activation/i);
 });
 it('permits an existing Build activation with no discs but respects its remaining capacity',()=>{
  const view=fixture();view.seats[0].influenceOnTrack=0;view.actionProgress={owner:'a',action:'build',remaining:1};
  expect(option(view).disabledReason).toBeNull();expect(option(view,'cruiser',addBuildItem(emptyBuildOrder(),'interceptor')).disabledReason).toMatch(/limit|activation/i);
 });
 it('prices the combined order including unplaced pieces without mutating either input',()=>{
  const view=fixture();view.seats[0].resources={materials:5,money:0,science:0};
  const draft=addBuildItem(emptyBuildOrder(),'interceptor'),viewBefore=structuredClone(view),before=structuredClone(draft);
  expect(option(view,'cruiser',draft).disabledReason).not.toBeNull();expect(option(view,'cruiser').disabledReason).toBeNull();
  view.seats[0].resources.money=6;expect(option(view,'cruiser',draft)).toMatchObject({cost:5,requiresConversion:true,disabledReason:null});
  expect(draft).toEqual(before);expect(view).toEqual({...viewBefore,seats:viewBefore.seats.map(s=>s.id==='a'?{...s,resources:{...s.resources,money:6}}:s)});
 });
 it('preserves existing placements and rejects stale enemy deployments instead of silently relocating',()=>{
  const view=fixture(),enemy=view.sectors.find(s=>s.owner==='b')!.id;
  const draft=addBuildItem(emptyBuildOrder(),'interceptor'),placed=placeBuildItem(draft,draft.items[0].id,enemy);
  expect(option(view,'cruiser',placed).disabledReason).toMatch(/sector|placement/i);expect(placed.items[0].sectorId).toBe(enemy);
 });
 it('can estimate a mixed existing order without committing a placement or conversion',()=>{
  const view=fixture('mechanema');view.seats[0].technologies.nano.push('orbital');const home=view.sectors.find(s=>s.owner==='a')!;
  view.sectors.push({...home,id:'second-home',position:{q:8,r:8},population:[]});
  let draft=addBuildItem(emptyBuildOrder(),'orbital');draft=addBuildItem(draft,'orbital');
  expect(option(view,'interceptor',draft).disabledReason).toBeNull();expect(draft.items.every(i=>i.sectorId===null)).toBe(true);expect(draft.fundingKey).toBe('');
  view.sectors=view.sectors.filter(s=>s.id!=='second-home');expect(option(view,'interceptor',draft).disabledReason).not.toBeNull();
 });
});
