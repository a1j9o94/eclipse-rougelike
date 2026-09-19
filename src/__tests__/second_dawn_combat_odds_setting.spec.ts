import './hostStartingSeed';
import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {convexTest} from 'convex-test';
import schema from '../../convex/schema';
import {api} from '../../convex/_generated/api';
const modules=import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers();});afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('persists shared combat odds choice through room start and old-client settings edits',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 const settings={humanSeatCount:1,aiCount:1,timerMs:30000,warpPortals:true,showCombatOdds:true};
 const room=await t.mutation(api.eclipseRooms.createRoom,{...host,settings,faction:'hydran'});
 expect(room.lobby.settings.showCombatOdds).toBe(true);
 const oldSettings={humanSeatCount:1,aiCount:1,timerMs:30000,warpPortals:true};
 expect((await t.mutation(api.eclipseRooms.updateRoomSettings,{...host,roomToken:room.roomToken,settings:oldSettings})).settings.showCombatOdds).toBe(true);
 await t.mutation(api.eclipseRooms.setRoomReady,{...host,roomToken:room.roomToken,ready:true});
 const {matchId}=await t.mutation(api.eclipseRooms.startRoom,{...host,roomToken:room.roomToken});
 expect((await t.query(api.eclipseMatches.getMatchView,{...host,matchId}))?.showCombatOdds).toBe(true);
});
it('defaults old and new omitted settings to no combat odds',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
 const {matchId}=await t.mutation(api.eclipseMatches.createMatch,{...host,aiCount:1});
 expect((await t.query(api.eclipseMatches.getMatchView,{...host,matchId}))?.showCombatOdds).toBe(false);
});
