import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { getFaction, type FactionId } from "../../shared/eclipse/catalog";
import { roomAiSelections } from "../../shared/eclipse/multiplayer";
import { createGame } from "../../shared/eclipse/setup";
import type { GameState } from "../../shared/eclipse/types";

const modules=import.meta.glob("../../convex/**/*.{ts,js}");
function seeded(seed:number){let value=seed>>>0;return()=>((value=Math.imul(value,1664525)+1013904223>>>0)/0x100000000);}

describe("Less Random Terran faction bans",()=>{
 it("never assigns a human-banned alien to AI seats across fixed seeds",()=>{
  for(let seed=0;seed<100;seed++){
   const seats=roomAiSelections([{faction:"terran-directorate",pieceColor:"red",bannedFaction:"hydran"}],5,"expanded-v1",seeded(seed),"less-random-v1");
   expect(seats.map(seat=>seat.faction)).not.toContain("hydran");
  }
 });

 it("gives every selected AI Terran a distinct, unselected alien ban",()=>{
  let terrans=0;
  for(let seed=0;seed<80;seed++){
   const human={faction:"rho-indi" as const,pieceColor:"black" as const};
   const seats=roomAiSelections([human],5,"expanded-v1",seeded(seed),"less-random-v1");
   const selected=new Set<FactionId>([human.faction,...seats.map(seat=>seat.faction)]);
   const bans=seats.filter(seat=>getFaction(seat.faction).species==="terran").map(seat=>seat.bannedFaction);
   terrans+=bans.length;
   expect(bans.every((ban):ban is FactionId=>!!ban&&getFaction(ban).species==="alien"&&!selected.has(ban))).toBe(true);
   expect(new Set(bans).size).toBe(bans.length);
  }
  expect(terrans).toBeGreaterThan(0);
 });

 it("rejects missing, selected, non-alien, duplicate, and out-of-profile direct setup bans",()=>{
  const base=(seats:Parameters<typeof createGame>[0]["seats"],profile:"base"|"expanded-v1"="base")=>()=>createGame({seed:1,warpPortals:false,rulesMode:"less-random-v1",factionProfile:profile,seats});
  expect(base([{id:"t",faction:"terran-directorate",controller:"human"},{id:"p",faction:"planta",controller:"human"}])).toThrow();
  expect(base([{id:"t",faction:"terran-directorate",bannedFaction:"terran-federation",controller:"human"},{id:"p",faction:"planta",controller:"human"}])).toThrow();
  expect(base([{id:"t",faction:"terran-directorate",bannedFaction:"planta",controller:"human"},{id:"p",faction:"planta",controller:"human"}])).toThrow();
  expect(base([{id:"t1",faction:"terran-directorate",bannedFaction:"hydran",controller:"human"},{id:"t2",faction:"terran-federation",bannedFaction:"hydran",controller:"human"}])).toThrow();
  expect(base([{id:"t",faction:"terran-directorate",bannedFaction:"rho-indi",controller:"human"},{id:"p",faction:"planta",controller:"human"}])).toThrow();
  expect(base([{id:"h",faction:"hydran",bannedFaction:"planta",controller:"human"},{id:"p",faction:"planta",controller:"human"}])).toThrow();
  expect(()=>createGame({seed:1,warpPortals:false,seats:[{id:"t",faction:"terran-directorate",bannedFaction:"hydran",controller:"human"},{id:"p",faction:"planta",controller:"human"}]})).toThrow();
 });
});

describe("Terran bans across lobby mode switches",()=>{
 beforeEach(()=>vi.stubGlobal("crypto",webcrypto));afterEach(()=>vi.unstubAllGlobals());
 it("clears variant-only bans on Standard and requires a fresh valid ban when returning",async()=>{
  const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
  const less={humanSeatCount:1,aiCount:1,timerMs:30_000,warpPortals:false,rulesMode:"less-random-v1" as const,factionProfile:"expanded-v1" as const};
  const created=await t.mutation(api.eclipseRooms.createRoom,{...host,settings:less,faction:"terran-directorate",pieceColor:"red",bannedFaction:"hydran"});
  expect(created.lobby.seats[0].bannedFaction).toBe("hydran");
  const standard=await t.mutation(api.eclipseRooms.updateRoomSettings,{...host,roomToken:created.roomToken,settings:{...less,rulesMode:"standard",warpPortals:true}});
  expect(standard.seats[0].bannedFaction).toBeUndefined();
  const again=await t.mutation(api.eclipseRooms.updateRoomSettings,{...host,roomToken:created.roomToken,settings:less});
  expect(again.seats[0].bannedFaction).toBeUndefined();
  await expect(t.mutation(api.eclipseRooms.setRoomReady,{...host,roomToken:created.roomToken,ready:true})).rejects.toThrow("ban");
  const chosen=await t.mutation(api.eclipseRooms.chooseRoomFaction,{...host,roomToken:created.roomToken,faction:"terran-directorate",pieceColor:"red",bannedFaction:"planta"});
  expect(chosen.seats[0].bannedFaction).toBe("planta");
 });

  it("does not persist a meaningless ban in a Standard room",async()=>{
  const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
  const created=await t.mutation(api.eclipseRooms.createRoom,{...host,settings:{humanSeatCount:1,aiCount:1,timerMs:30_000,warpPortals:true,rulesMode:"standard"},faction:"terran-directorate",bannedFaction:"hydran"});
  expect(created.lobby.seats[0].bannedFaction).toBeUndefined();
  });

  it("carries the human ban and valid AI Terran bans through solo createMatch",async()=>{
   const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
   const created=await t.mutation(api.eclipseMatches.createMatch,{...host,aiCount:5,factionProfile:"expanded-v1",rulesMode:"less-random-v1",warpPortals:false,faction:"terran-directorate",pieceColor:"red",bannedFaction:"hydran"});
   const row=await t.run(ctx=>ctx.db.get(created.matchId)),state=JSON.parse(row!.snapshotJson) as GameState;
   expect(state.seats.map(seat=>seat.faction)).not.toContain("hydran");
   expect(state.seats[0]).toMatchObject({faction:"terran-directorate",bannedFaction:"hydran"});
   const selected=new Set(state.seats.map(seat=>seat.faction));
   for(const seat of state.seats.filter(seat=>seat.controller==="ai"&&getFaction(seat.faction).species==="terran")){
    expect(seat.bannedFaction).toBeDefined();
    expect(getFaction(seat.bannedFaction!).species).toBe("alien");
    expect(selected.has(seat.bannedFaction!)).toBe(false);
   }
  });

  it("rejects a Less Random solo alien carrying a Terran-only ban",async()=>{
   const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{});
   await expect(t.mutation(api.eclipseMatches.createMatch,{...host,aiCount:1,factionProfile:"expanded-v1",rulesMode:"less-random-v1",warpPortals:false,faction:"rho-indi",pieceColor:"black",bannedFaction:"hydran"})).rejects.toThrow("Only a Terran");
  });
});
