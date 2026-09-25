import './hostStartingSeed';
import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../../convex/schema';
import {api} from '../../convex/_generated/api';
import type {GameState} from '../../shared/eclipse/types';
const modules = import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers();vi.setSystemTime(1000);});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
async function fixture() {
  const t = convexTest(schema,modules), host = await t.action(api.eclipseGuests.createGuestSession,{});
  const room = await t.mutation(api.eclipseRooms.createRoom,{...host,faction:'hydran',settings:{humanSeatCount:2,aiCount:1,timerMs:30000,warpPortals:true}});
  const guest=await t.action(api.eclipseGuests.createGuestSession,{});
  await t.mutation(api.eclipseRooms.joinRoom,{...guest,roomToken:room.roomToken,faction:'planta'});
  await t.mutation(api.eclipseRooms.setRoomReady,{...guest,roomToken:room.roomToken,ready:true});
  return {t,host,room, start:async()=>{await t.mutation(api.eclipseRooms.setRoomReady,{...host,roomToken:room.roomToken,ready:true}); return t.mutation(api.eclipseRooms.startRoom,{...host,roomToken:room.roomToken});}};
}
describe('anonymous room spectators',()=>{
  it('returns null for unknown and waiting rooms and reads a playing room without occupying a seat or advancing state',async()=>{
    const {t,host,room,start}=await fixture();
    expect(await t.query(api.eclipseRooms.getSpectatorView,{roomToken:'missing'})).toBeNull();
    expect(await t.query(api.eclipseRooms.getSpectatorView,{roomToken:room.roomToken})).toBeNull();
    expect(await t.query(api.eclipseRooms.getSpectatorHistory,{roomToken:room.roomToken})).toBeNull();
    const {matchId}=await start();
    await t.run(async ctx=>{
      const match=(await ctx.db.get(matchId))!,state=JSON.parse(match.snapshotJson) as GameState;
      state.privateSeats[0].discoveriesKept=['PRIVATE-HOLDING'];
      state.pendingDecision={id:'PRIVATE-DECISION',owner:'seat-1',kind:'reputation',drawn:[4],capacity:4};
      await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state)});
      const timer=await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique();
      await ctx.db.patch(timer!._id,{decisionId:'PRIVATE-TIMER-DECISION',error:'PRIVATE-WORKER-ERROR'});
    });
    const records=()=>t.run(async ctx=>({match:await ctx.db.get(matchId),seats:await ctx.db.query('eclipseRoomSeatsV1').collect(),owners:await ctx.db.query('eclipseOwnershipV1').collect(),jobs:await ctx.db.query('eclipseAiJobsV1').collect(),timers:await ctx.db.query('eclipseRoomTimersV1').collect()}));
    const before=await records(),first=await t.query(api.eclipseRooms.getSpectatorView,{roomToken:room.roomToken});
    expect(first).toMatchObject({kind:'spectator',matchId,roomToken:room.roomToken,historyResetRevision:0});
    expect(JSON.stringify(first)).not.toMatch(/PRIVATE-|viewerSeatId|pendingDecision|guestId|leaseToken/);
    expect(JSON.stringify(first)).not.toContain(host.credential);
    expect(JSON.stringify(await t.query(api.eclipseRooms.getRoom,{roomToken:room.roomToken}))).not.toContain('PRIVATE-');
    expect(first?.timer).toMatchObject({targetSeatId:'seat-1'});
    expect(await t.query(api.eclipseRooms.getSpectatorView,{roomToken:room.roomToken})).toEqual(first);
    expect(await records()).toEqual(before);
    const outsider=await t.action(api.eclipseGuests.createGuestSession,{});
    expect(await t.query(api.eclipseMatches.getMatchView,{...outsider,matchId})).toBeNull();
    expect(await t.mutation(api.eclipseMatches.submitCommand,{...outsider,matchId,commandId:'spectator-action',expectedRevision:0,command:{type:'pass'}})).toMatchObject({ok:false,error:{code:'NOT_A_SEAT'}});
    await expect(t.mutation(api.eclipseRooms.retryRoomTimer,{...outsider,roomToken:room.roomToken})).rejects.toThrow('does not occupy a room seat');
    await t.run(async ctx=>{
      const match=(await ctx.db.get(matchId))!,state=JSON.parse(match.snapshotJson) as GameState;
      state.revision=1;state.phase='finished';
      await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state),revision:1,phase:'finished'});
    });
    expect(await t.query(api.eclipseRooms.getSpectatorView,{roomToken:room.roomToken})).toMatchObject({revision:1,phase:'finished'});
  });

  it('pages public history, preserves lifecycle markers and drops rolled-back actions without private payloads',async()=>{
    const {t,room,start}=await fixture(),{matchId}=await start();
    await t.run(async ctx=>{
      const match=(await ctx.db.get(matchId))!,state=JSON.parse(match.snapshotJson) as GameState;
      state.revision=8;
      await ctx.db.patch(matchId,{revision:8,snapshotJson:JSON.stringify(state)});
      for(let revision=1;revision<=6;revision++) {
        const commandId=`PRIVATE-COMMAND-${revision}`;
        await ctx.db.insert('eclipseJournalV1',{matchId,actor:'seat-1',revision,commandId,requestJson:JSON.stringify({commandId,expectedRevision:revision-1,command:{type:'resolve',decisionId:'PRIVATE-DECISION',choice:{kind:'reputation',kept:[4]}}}),receipt:{commandId,revision,eventCount:1},eventsJson:JSON.stringify([{type:'draw',seatId:'seat-1',visibility:{seatId:'seat-1'},message:'PRIVATE-EVENT'}]),createdAt:revision});
      }
      await ctx.db.insert('eclipseRollbacksV1',{matchId,expectedRevision:6,targetRevision:4,targetSummary:'Selected reputation',requestedBySeatId:'seat-1',requiredSeatIds:[],approvedSeatIds:[],status:'applied',appliedRevision:7,createdAt:7,resolvedAt:7});
      await ctx.db.insert('eclipseMatchLifecycleV1',{matchId,revision:8,expectedRevision:7,actor:'seat-1',outcome:'abandoned',commandId:'PRIVATE-LIFECYCLE',createdAt:8});
    });
    const page=await t.query(api.eclipseRooms.getSpectatorHistory,{roomToken:room.roomToken,limit:3});
    expect(page?.entries.map(e=>e.revision)).toEqual([8,7,3]);
    expect(page?.entries.map(e=>e.summary)).toEqual(['Ended the game','Restored an earlier position','Selected reputation']);
    expect(page?.nextBeforeRevision).toBe(3);
    expect(JSON.stringify(page)).not.toMatch(/PRIVATE-|rollbackAvailable|rollbackRecoverable|preSnapshotJson/);
    const older=await t.query(api.eclipseRooms.getSpectatorHistory,{roomToken:room.roomToken,beforeRevision:3,limit:3});
    expect(older?.entries.map(e=>e.revision)).toEqual([2,1]);
    expect(older?.nextBeforeRevision).toBeNull();
    expect(await t.query(api.eclipseRooms.getSpectatorHistory,{roomToken:room.roomToken,beforeRevision:3,limit:3})).toEqual(older);
    expect(await t.query(api.eclipseRooms.getSpectatorView,{roomToken:room.roomToken})).toMatchObject({historyResetRevision:7});
    await expect(t.query(api.eclipseRooms.getSpectatorHistory,{roomToken:room.roomToken,limit:101})).rejects.toThrow('page size');
    await expect(t.query(api.eclipseRooms.getSpectatorHistory,{roomToken:room.roomToken,beforeRevision:-1})).rejects.toThrow('cursor');
  });
});
