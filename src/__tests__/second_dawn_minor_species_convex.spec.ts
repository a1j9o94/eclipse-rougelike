import './hostStartingSeed';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';
import type { GameState } from '../../shared/eclipse/types';
import { finishDispatchedAi } from './aiWorkerTestSupport';
import { profileVersions } from '../../shared/eclipse/catalog';

const modules = import.meta.glob('../../convex/**/*.{ts,js}');
const settings = {humanSeatCount:1, aiCount:1, timerMs:30_000, warpPortals:true};
beforeEach(() => {vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers();});
afterEach(() => {vi.unstubAllGlobals();vi.useRealTimers();});

it('defaults old rooms off, requires renewed agreement when enabled, and preserves an old-client update',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 const room=await t.mutation(api.eclipseRooms.createRoom,{...host,settings,faction:'hydran'});
 expect(room.lobby.settings.minorSpecies).toBe(false);
 await t.mutation(api.eclipseRooms.setRoomReady,{...host,roomToken:room.roomToken,ready:true});
 const stranger=await t.action(api.eclipseGuests.createGuestSession,{});
 await expect(t.mutation(api.eclipseRooms.updateRoomSettings,{...stranger,roomToken:room.roomToken,settings:{...settings,minorSpecies:true}})).rejects.toThrow('host');
 const changed=await t.mutation(api.eclipseRooms.updateRoomSettings,{...host,roomToken:room.roomToken,settings:{...settings,minorSpecies:true}});
 expect(changed.settings.minorSpecies).toBe(true);expect(changed.seats[0].ready).toBe(false);
 const oldUpdate=await t.mutation(api.eclipseRooms.updateRoomSettings,{...host,roomToken:room.roomToken,settings});
 expect(oldUpdate.settings.minorSpecies).toBe(true);
 await t.mutation(api.eclipseRooms.setRoomReady,{...host,roomToken:room.roomToken,ready:true});
 const {matchId}=await t.mutation(api.eclipseRooms.startRoom,{...host,roomToken:room.roomToken});
 const view=await t.query(api.eclipseMatches.getMatchView,{...host,matchId});
 expect(view?.minorSpecies?.market).toHaveLength(4);
 expect(view).toMatchObject(profileVersions('base',true,true));
 expect(view).not.toHaveProperty('random');expect(view).not.toHaveProperty('supplies');
});

it('keeps direct legacy solo matches off and persists an enabled owned purchase exactly once',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{}),stranger=await t.action(api.eclipseGuests.createGuestSession,{});
 const legacy=await t.mutation(api.eclipseMatches.createMatch,{...host,aiCount:1});
 expect((await t.query(api.eclipseMatches.getMatchView,{...host,matchId:legacy.matchId}))?.minorSpecies).toBeUndefined();
 const {matchId}=await t.mutation(api.eclipseMatches.createMatch,{...host,aiCount:1,minorSpecies:true});
 await t.run(async ctx=>{const row=await ctx.db.get(matchId);const state=JSON.parse(row!.snapshotJson) as GameState;state.activeSeatId='seat-1';state.seats[0].resources.money=100;state.minorSpecies={market:['prestige']};await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});});
 const request={...host,matchId,commandId:'buy-prestige',expectedRevision:0,command:{type:'buy-minor-species' as const,minorSpeciesId:'prestige' as const}};
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...request,...stranger})).toMatchObject({ok:false,error:{code:'NOT_A_SEAT'}});
 expect(await t.mutation(api.eclipseMatches.submitCommand,request)).toMatchObject({ok:true,duplicate:false});
 expect(await t.mutation(api.eclipseMatches.submitCommand,request)).toMatchObject({ok:true,duplicate:true});
 expect(await t.mutation(api.eclipseMatches.submitCommand,{...request,commandId:'stale-purchase'})).toMatchObject({ok:false,error:{code:'STALE_REVISION'}});
 const view=await t.query(api.eclipseMatches.getMatchView,{...host,matchId});
 expect(view?.seats[0].minorSpecies).toEqual([{id:'prestige'}]);
 expect(view?.minorSpecies?.market).toEqual([]);
 expect(view).not.toHaveProperty('random');
});

it('commits and safely retries scheduled AI work with the Minor Species version pin',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 const {matchId}=await t.mutation(api.eclipseMatches.createMatch,{...host,aiCount:1,minorSpecies:true});
 await t.run(async ctx=>{
  const row=await ctx.db.get(matchId);const state=JSON.parse(row!.snapshotJson) as GameState;state.activeSeatId='seat-2';await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});
  const job=await ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique();
  if(job)await ctx.db.patch(job._id,{status:'scheduled',expectedRevision:0});
  else await ctx.db.insert('eclipseAiJobsV1',{matchId,status:'scheduled',expectedRevision:0,attempts:0,error:null,updatedAt:Date.now()});
 });
 await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:0});await finishDispatchedAi(t);
 expect(await t.query(api.eclipseMatches.getMatchView,{...host,matchId})).toMatchObject({revision:1,...profileVersions('base',true,true)});
 await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:0});await finishDispatchedAi(t);
 expect((await t.query(api.eclipseMatches.getMatchView,{...host,matchId}))?.revision).toBe(1);
});
