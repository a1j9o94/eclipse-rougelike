import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../../convex/schema';
import {finishDispatchedAi} from './aiWorkerTestSupport';
import {api,internal} from '../../convex/_generated/api';
import {createGame} from '../../shared/eclipse/setup';
import {BASE_FACTIONS} from '../../shared/eclipse/catalog';
import type {GameState} from '../../shared/eclipse/types';
const modules=import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers();});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
function seedFor(count:number,target:number){
 const seats=BASE_FACTIONS.filter(f=>f.species==='alien').slice(0,count).map((f,i)=>({id:`seat-${i+1}`,faction:f.id,controller:'ai' as const}));
 for(let seed=0;seed<1000;seed++)if(createGame({seed,seats,warpPortals:true,riftCannons:true,randomizeStartingPositions:true,randomizeStartingPlayer:true}).activeSeatId===`seat-${target+1}`)return seed;
 throw new Error('No fixture seed');
}
it('can start a direct solo game with AI and immediately schedules its authoritative worker',async()=>{
 const t=convexTest(schema,modules),guest=await t.action(api.eclipseGuests.createGuestSession,{});
 const seedRandom=vi.spyOn(Math,'random').mockReturnValue(seedFor(2,1)/2**32);
 const created=await t.mutation(api.eclipseMatches.createMatch,{...guest,aiCount:1});seedRandom.mockRestore();
 const row=await t.run(ctx=>ctx.db.get(created.matchId)),state=JSON.parse(row!.snapshotJson) as GameState;
 expect(state.activeSeatId).toBe('seat-2');expect(state.startSeatId).toBe('seat-2');
 expect(await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',created.matchId)).unique())).toMatchObject({status:'scheduled',expectedRevision:0});
 const initial=await t.query(api.eclipseMatches.getMatchView,{...guest,matchId:created.matchId});
 expect(initial?.viewerSeatId).toBe('seat-1');expect(initial?.activeSeatId).toBe('seat-2');
 expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId:created.matchId}))?.startSeatId).toBe('seat-2');
 expect((await t.run(ctx=>ctx.db.get(created.matchId)))?.snapshotJson).toBe(row!.snapshotJson);
});

it.each(['direct','room'] as const)('varies positions and neighbors for the same six factions in %s solo games without changing ownership',async entryPoint=>{
 const positions=new Set<string>(),neighbors=new Set<string>();
 let expectedSeats:Array<{id:string;faction:string;controller:string}>|undefined;
 for(let seed=0;seed<16;seed++){
  const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
  let roomToken:string|undefined;
  if(entryPoint==='room'){
   const room=await t.mutation(api.eclipseRooms.createRoom,{...host,settings:{humanSeatCount:1,aiCount:5,timerMs:30000,warpPortals:true},faction:'eridani'});
   roomToken=room.roomToken;
   await t.mutation(api.eclipseRooms.setRoomReady,{...host,roomToken,ready:true});
  }
  const seedRandom=vi.spyOn(Math,'random').mockReturnValue(seed/2**32);
  const created=roomToken
   ?await t.mutation(api.eclipseRooms.startRoom,{...host,roomToken})
   :await t.mutation(api.eclipseMatches.createMatch,{...host,aiCount:5,faction:'eridani',warpPortals:true});
  seedRandom.mockRestore();
  const state=JSON.parse((await t.run(ctx=>ctx.db.get(created.matchId)))!.snapshotJson) as GameState;
  const identities=state.seats.map(({id,faction,controller})=>({id,faction,controller})).sort((a,b)=>a.id.localeCompare(b.id));
  expectedSeats??=identities;
  expect(identities).toEqual(expectedSeats);
  expect(identities).toHaveLength(6);
  expect(identities.find(seat=>seat.id==='seat-1')).toEqual({id:'seat-1',faction:'eridani',controller:'human'});
  const home=state.sectors.find(sector=>sector.owner==='seat-1')!;
  positions.add(`${home.position.q},${home.position.r}`);
  const neighboringHomes=state.sectors.filter(sector=>{
   if(!sector.owner||sector.owner==='seat-1')return false;
   const q=sector.position.q-home.position.q,r=sector.position.r-home.position.r;
   return Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))===2;
  });
  expect(neighboringHomes).toHaveLength(2);
  neighbors.add(neighboringHomes.map(sector=>state.seats.find(seat=>seat.id===sector.owner)!.faction).sort().join(','));
  const view=await t.query(api.eclipseMatches.getMatchView,{...host,matchId:created.matchId});
  expect(view?.viewerSeatId).toBe('seat-1');
  expect(view?.sectors.find(sector=>sector.owner==='seat-1')?.position).toEqual(home.position);
 }
 expect(positions.size).toBeGreaterThan(1);
 expect(neighbors.size).toBeGreaterThan(1);
});
it.each([1,2])('randomizes %i-human room starts and schedules AI even in wait-for-me solo',async humanSeatCount=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 const room=await t.mutation(api.eclipseRooms.createRoom,{...host,settings:{humanSeatCount,aiCount:1,timerMs:30000,warpPortals:true},faction:'eridani'});
 if(humanSeatCount===2){const guest=await t.action(api.eclipseGuests.createGuestSession,{});await t.mutation(api.eclipseRooms.joinRoom,{...guest,roomToken:room.roomToken,faction:'hydran'});await t.mutation(api.eclipseRooms.setRoomReady,{...guest,roomToken:room.roomToken,ready:true});}
 await t.mutation(api.eclipseRooms.setRoomReady,{...host,roomToken:room.roomToken,ready:true});
 const seedRandom=vi.spyOn(Math,'random').mockReturnValue(seedFor(humanSeatCount+1,humanSeatCount)/2**32);
 const started=await t.mutation(api.eclipseRooms.startRoom,{...host,roomToken:room.roomToken});seedRandom.mockRestore();
 const state=JSON.parse((await t.run(ctx=>ctx.db.get(started.matchId)))!.snapshotJson) as GameState;
 expect(state.activeSeatId).toBe(`seat-${humanSeatCount+1}`);expect(state.startSeatId).toBe(state.activeSeatId);
 expect(await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',started.matchId)).unique())).toMatchObject({status:'scheduled',expectedRevision:0});
 expect(await t.run(ctx=>ctx.db.query('eclipseRoomTimersV1').collect())).toEqual([]);
 await t.mutation(internal.eclipseMatches.runAi,{matchId:started.matchId,expectedRevision:0});
 await finishDispatchedAi(t);
 expect((await t.run(ctx=>ctx.db.get(started.matchId)))!.revision).toBeGreaterThan(0);
});
