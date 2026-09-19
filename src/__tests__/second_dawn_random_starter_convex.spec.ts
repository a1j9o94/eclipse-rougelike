import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../../convex/schema';
import {finishDispatchedAi} from './aiWorkerTestSupport';
import {api,internal} from '../../convex/_generated/api';
import {createGame} from '../../shared/eclipse/setup';
import {BASE_FACTIONS} from '../../shared/eclipse/catalog';
import {randomInt} from '../../shared/eclipse/random';
import type {GameState} from '../../shared/eclipse/types';
const modules=import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers();});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
function seedFor(count:number,target:number){
 const seats=BASE_FACTIONS.filter(f=>f.species==='alien').slice(0,count).map((f,i)=>({id:`seat-${i+1}`,faction:f.id,controller:'ai' as const}));
 for(let seed=0;seed<1000;seed++)if(randomInt(createGame({seed,seats,warpPortals:true}).random,count).value===target)return seed;
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
