import './hostStartingSeed';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api } from '../../convex/_generated/api';
import { isMultiplayerSettings, roomCanStart } from '../../shared/eclipse/multiplayer';
import type { GameState } from '../../shared/eclipse/types';
const modules=import.meta.glob('../../convex/**/*.{ts,js}');
const settings={humanSeatCount:1,aiCount:1,timerMs:30_000,warpPortals:true};
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers();});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('validates round limits and independently enabled portals at the shared room boundary',()=>{
 expect(isMultiplayerSettings({...settings,rulesMode:'less-random-v1',ruleOptions:{roundLimit:12},riftCannons:false})).toBe(true);
 for(const roundLimit of [0,21,2.5,NaN]) expect(isMultiplayerSettings({...settings,ruleOptions:{roundLimit}})).toBe(false);
 expect(isMultiplayerSettings({...settings,ruleOptions:{combatJokers:true},riftCannons:true})).toBe(false);
});
it('uses the faction option for lobby readiness independently of the preset',()=>{
 const seats=[{slot:1,faction:'terran-directorate' as const,occupied:true,ready:true}];
 expect(roomCanStart({...settings,seats,ruleOptions:{factionVariant:true}})).toBe(false);
 expect(roomCanStart({...settings,seats,rulesMode:'less-random-v1',ruleOptions:{factionVariant:false}})).toBe(true);
});
it('persists custom solo settings and exposes the selected round limit in match summaries',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 const ruleOptions={roundLimit:10,publicDiscoveries:true};
 const {matchId}=await t.mutation(api.eclipseMatches.createMatch,{...host,faction:'terran-directorate',aiCount:1,ruleOptions,riftCannons:false});
 const row=await t.run(ctx=>ctx.db.get(matchId));
 const state=JSON.parse(row!.snapshotJson) as GameState;
 expect(state.ruleOptions).toEqual(ruleOptions);expect(state.engine?.riftCannons).toBeFalsy();
 expect((await t.query(api.eclipseMatches.listMyMatches,host))[0].ruleOptions).toEqual(ruleOptions);
});
it('saves pass-order turns from solo and room creation without changing the default',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 const {matchId}=await t.mutation(api.eclipseMatches.createMatch,{...host,faction:'hydran',aiCount:1,ruleOptions:{passOrderTurnOrder:true}});
 const solo=await t.run(ctx=>ctx.db.get(matchId));
 expect((JSON.parse(solo!.snapshotJson) as GameState).ruleOptions?.passOrderTurnOrder).toBe(true);
 const {roomToken}=await t.mutation(api.eclipseRooms.createRoom,{...host,faction:'hydran',settings:{...settings,ruleOptions:{passOrderTurnOrder:true}}});
 const lobby=await t.query(api.eclipseRooms.getRoom,{...host,roomToken});
 expect(lobby?.settings.ruleOptions?.passOrderTurnOrder).toBe(true);
});
it('rejects invalid round limits and incompatible cannons in solo and room creation',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 for(const roundLimit of [0,21,2.5]) {
  await expect(t.mutation(api.eclipseMatches.createMatch,{...host,ruleOptions:{roundLimit}})).rejects.toThrow();
  await expect(t.mutation(api.eclipseRooms.createRoom,{...host,faction:'hydran',settings:{...settings,ruleOptions:{roundLimit}}})).rejects.toThrow();
 }
 await expect(t.mutation(api.eclipseMatches.createMatch,{...host,ruleOptions:{combatJokers:true},riftCannons:true})).rejects.toThrow();
});
it('persists room overrides through start and clears readiness and bans when faction changes are disabled',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 const {roomToken}=await t.mutation(api.eclipseRooms.createRoom,{...host,faction:'terran-directorate',bannedFaction:'hydran',settings:{...settings,ruleOptions:{factionVariant:true},riftCannons:false}});
 await t.mutation(api.eclipseRooms.setRoomReady,{...host,roomToken,ready:true});
 const ruleOptions={roundLimit:12,publicDiscoveries:true,factionVariant:false};
 const lobby=await t.mutation(api.eclipseRooms.updateRoomSettings,{...host,roomToken,settings:{...settings,ruleOptions,riftCannons:false}});
 expect(lobby.settings.ruleOptions).toEqual(ruleOptions);expect(lobby.seats[0]).toMatchObject({ready:false});expect(lobby.seats[0].bannedFaction).toBeUndefined();
 await t.mutation(api.eclipseRooms.setRoomReady,{...host,roomToken,ready:true});
 const {matchId}=await t.mutation(api.eclipseRooms.startRoom,{...host,roomToken});
 const row=await t.run(ctx=>ctx.db.get(matchId));const state=JSON.parse(row!.snapshotJson) as GameState;
 expect(state.ruleOptions).toEqual(ruleOptions);expect(state.engine?.riftCannons).toBeFalsy();
});
it('lets a Less Random preset disable faction changes and enable warp portals',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 const {matchId}=await t.mutation(api.eclipseMatches.createMatch,{...host,faction:'terran-directorate',aiCount:1,rulesMode:'less-random-v1',ruleOptions:{factionVariant:false},warpPortals:true});
 const row=await t.run(ctx=>ctx.db.get(matchId));const state=JSON.parse(row!.snapshotJson) as GameState;
 expect(state.engine?.warpPortals).toBe(true);expect(state.engine?.riftCannons).toBeFalsy();
});
it('rejects missing Terran bans with the faction option enabled under Standard',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 await expect(t.mutation(api.eclipseMatches.createMatch,{...host,faction:'terran-directorate',ruleOptions:{factionVariant:true}})).rejects.toThrow('ban');
 await expect(t.mutation(api.eclipseRooms.createRoom,{...host,faction:'terran-directorate',settings:{...settings,ruleOptions:{factionVariant:true}}})).rejects.toThrow('ban');
});
it('can clear all custom overrides back to a historical preset without retaining a stale round limit',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 const {roomToken}=await t.mutation(api.eclipseRooms.createRoom,{...host,faction:'hydran',settings:{...settings,ruleOptions:{roundLimit:17},riftCannons:false}});
 const lobby=await t.mutation(api.eclipseRooms.updateRoomSettings,{...host,roomToken,settings});
 expect(lobby.settings.ruleOptions).toBeUndefined();expect(lobby.settings.riftCannons).toBeUndefined();
 await t.mutation(api.eclipseRooms.setRoomReady,{...host,roomToken,ready:true});
 const {matchId}=await t.mutation(api.eclipseRooms.startRoom,{...host,roomToken});
 const row=await t.run(ctx=>ctx.db.get(matchId));const state=JSON.parse(row!.snapshotJson) as GameState;
 expect(state.ruleOptions).toBeUndefined();expect(state.engine?.riftCannons).toBe(true);
 expect((await t.query(api.eclipseMatches.listMyMatches,host))[0].ruleOptions).toBeUndefined();
});
