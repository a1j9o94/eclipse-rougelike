import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { factionAllowedForProfile, getFaction, seatPieceColor, type CivilizationColor, type FactionProfile, type FactionId } from "../shared/eclipse/catalog";
import { resolveGuest as findGuest, playerNameForGuest } from './eclipseIdentity';
import {
  isMultiplayerSettings,
  reconcileMultiplayerTimer,
  roomCanStart,
  roomAiSelections,
  timerPublicView,
  timerTargetForState,
  type MultiplayerLobbySeat,
  type MultiplayerRoomLobby,
  type MultiplayerRoomSettings,
  type MultiplayerTurnTimer,
} from "../shared/eclipse/multiplayer";
import { createGame } from "../shared/eclipse/setup";


import { AI_BUDGETS, AI_VERSION } from "../shared/eclipse/aiConfig";
import { AI_DECISION_DELAY_MS } from '../shared/eclipse/pacing';
import { TIMEOUT_AI_HISTORY_MARKER } from "../shared/eclipse/history";
import type { GameState, JournalEntry } from "../shared/eclipse/types";
import { factionValidator, factionProfileValidator, pieceColorValidator } from "./eclipseValidators";
import { scheduleAi } from "./eclipseMatches";

const settingsValidator = v.object({
  factionProfile: v.optional(factionProfileValidator),
  humanSeatCount: v.number(),
  aiCount: v.number(),
  aiDifficulty: v.optional(v.union(v.literal("normal"), v.literal("hard"), v.literal("expert"))),
  timerMs: v.number(),
  warpPortals: v.boolean(),
  showCombatOdds: v.optional(v.boolean()),
});
type ReadContext = Pick<QueryCtx, "db">;


function randomToken(): string {
  // Mutations can be replayed by Convex. Its function-scoped Math.random()
  // is seeded for that replay, whereas Web Crypto does not provide that
  // guarantee. This token identifies a public lobby/scheduled job; it is not
  // an ownership credential (guest credentials remain independently random).
  return Array.from({ length: 36 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
}

function timerFromRow(row: Doc<"eclipseRoomTimersV1">): MultiplayerTurnTimer {
  return {
    token: row.token,
    deadlineAt: row.deadlineAt,
    target: { seatId: row.targetSeatId, decisionId: row.decisionId },
    status: row.status,
    error: row.error,
  };
}

function readState(match: Doc<"eclipseMatchesV1">): GameState {
  const state = JSON.parse(match.snapshotJson) as GameState;
  if (state.revision !== match.revision || state.rulesVersion !== match.rulesVersion || state.catalogVersion !== match.catalogVersion) throw new Error("Match snapshot metadata mismatch.");
  return state;
}

async function roomSeats(ctx: ReadContext, roomId: Id<"eclipseRoomsV1">): Promise<Doc<"eclipseRoomSeatsV1">[]> {
  return ctx.db.query("eclipseRoomSeatsV1").withIndex("by_room", (q) => q.eq("roomId", roomId)).collect();
}

async function ownedRoomSeat(ctx: ReadContext, credential: string, room: Doc<"eclipseRoomsV1">): Promise<{ guest: Doc<"eclipseGuestsV1">; seat: Doc<"eclipseRoomSeatsV1"> } | null> {
  const guest = await findGuest(ctx, credential);
  if (!guest) return null;
  const seat = await ctx.db.query("eclipseRoomSeatsV1").withIndex("by_room_guest", (q) => q.eq("roomId", room._id).eq("guestId", guest._id)).unique();
  return seat ? { guest, seat } : null;
}

function settingsFor(room: Doc<"eclipseRoomsV1">): MultiplayerRoomSettings {
  return { factionProfile: room.factionProfile ?? "base", humanSeatCount: room.humanSeatCount, aiCount: room.aiCount, ...(room.aiDifficulty ? {aiDifficulty: room.aiDifficulty} : {}), timerMs: room.timerMs, warpPortals: room.warpPortals, showCombatOdds:room.showCombatOdds??false };
}

function toLobbySeats(room: Doc<"eclipseRoomsV1">, seats: readonly Doc<"eclipseRoomSeatsV1">[]): MultiplayerLobbySeat[] {
  const bySlot = new Map(seats.map((seat) => [seat.slot, seat]));
  return Array.from({ length: room.humanSeatCount }, (_, index) => {
    const slot = index + 1;
    const seat = bySlot.get(slot);
    return seat ? { slot, faction: seat.faction, ...(seat.pieceColor ? { pieceColor: seat.pieceColor } : {}), ready: seat.ready, isHost: seat.isHost, occupied: true } : { slot, faction: null, ready: false, isHost: false, occupied: false };
  });
}

async function lobbyFor(ctx: ReadContext, room: Doc<"eclipseRoomsV1">, credential?: string): Promise<MultiplayerRoomLobby> {
  const seats = await roomSeats(ctx, room._id);
  const viewer = credential ? await ownedRoomSeat(ctx, credential, room) : null;
  const timer = room.matchId ? await ctx.db.query("eclipseRoomTimersV1").withIndex("by_match", (q) => q.eq("matchId", room.matchId!)).unique() : null;
  const names = new Map(await Promise.all(seats.map(async (seat) => [seat.slot, await playerNameForGuest(ctx, seat.guestId)] as const)));
  return {
    roomToken: room.roomToken,
    status: room.status === "closed" ? "finished" : room.status,
    settings: settingsFor(room),
    seats: toLobbySeats(room, seats).map((seat) => ({ ...seat, username: names.get(seat.slot) ?? null })),
    viewerSlot: viewer?.seat.slot ?? null,
    viewerIsHost: viewer?.seat.isHost ?? false,
    matchId: room.matchId ?? null,
    timer: timer && room.humanSeatCount > 1 ? timerPublicView(timerFromRow(timer)) : null,
  };
}

function requireSettings(settings: MultiplayerRoomSettings): void {
  if (!isMultiplayerSettings(settings)) throw new Error("Choose 2–6 total seats and a timer from 30 seconds through 48 hours.");
}

function selectedColor(faction: FactionId, pieceColor: CivilizationColor | undefined, profile: FactionProfile): CivilizationColor {
  if (!factionAllowedForProfile(faction, profile)) throw new Error('Choose a faction available in this profile.');
  return profile === 'base' ? getFaction(faction).color : seatPieceColor({ faction, pieceColor });
}
function requireAvailableSelection(faction: FactionId, pieceColor: CivilizationColor, seats: readonly Doc<'eclipseRoomSeatsV1'>[], profile: FactionProfile): void {
  if (seats.some(seat => seat.faction === faction)) throw new Error('Choose an unused faction.');
  if (seats.some(seat => seat.faction && selectedColor(seat.faction, seat.pieceColor, profile) === pieceColor)) throw new Error(profile === 'base' ? 'Choose a faction with an unused board color.' : 'Choose an unused piece color.');
}

async function resetReady(ctx: MutationCtx, roomId: Id<"eclipseRoomsV1">): Promise<void> {
  const seats = await roomSeats(ctx, roomId);
  await Promise.all(seats.map((seat) => ctx.db.patch(seat._id, { ready: false })));
}

async function findRoom(ctx: ReadContext, roomToken: string): Promise<Doc<"eclipseRoomsV1"> | null> {
  return ctx.db.query("eclipseRoomsV1").withIndex("by_token", (q) => q.eq("roomToken", roomToken)).unique();
}

async function saveTimeoutCommand(ctx: MutationCtx, matchId: Id<"eclipseMatchesV1">, state: GameState, entry: JournalEntry, actionRound: number): Promise<void> {
  const previous = await ctx.db.get(matchId);
  await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state), revision: state.revision, round: state.round, phase: state.phase, updatedAt: Date.now() });
  await ctx.db.insert("eclipseJournalV1", { matchId, round: actionRound, commandId: entry.request.commandId, actor: entry.actor, revision: entry.receipt.revision, requestJson: JSON.stringify(entry.request), preSnapshotJson: previous?.snapshotJson, eventsJson: JSON.stringify(entry.events), receipt: entry.receipt, createdAt: Date.now() });
}

async function scheduleTimeout(ctx: MutationCtx, room: Doc<"eclipseRoomsV1">, timer: MultiplayerTurnTimer): Promise<void> {
  await ctx.scheduler.runAfter(Math.max(0, timer.deadlineAt - Date.now()), internal.eclipseRooms.runRoomTimeout, { roomToken: room.roomToken, token: timer.token });
}

/** Reconciles a room's timer after any match transition. Same owner retains the deadline/token. */
async function synchronizeTimer(ctx: MutationCtx, room: Doc<"eclipseRoomsV1">, match: Doc<"eclipseMatchesV1">): Promise<void> {
  if (!room.matchId || room.status !== "playing" || match.lifecycle === "abandoned" || match.rollbackPendingId) return;
  const state = readState(match);
  const target = timerTargetForState(state);
  const current = await ctx.db.query("eclipseRoomTimersV1").withIndex("by_match", (q) => q.eq("matchId", match._id)).unique();
  if (!target) {
    if (current) await ctx.db.patch(current._id, { status: "finished", error: null, updatedAt: Date.now() });
    await ctx.db.patch(room._id, { status: "finished", updatedAt: Date.now() });
    return;
  }
  const targetSeat = state.seats.find((seat) => seat.id === target.seatId);
  if (!targetSeat) throw new Error("Timer target has no match seat.");
  if (targetSeat.controller === "ai") {
    if (current && room.humanSeatCount === 1) await ctx.db.delete(current._id);
    else if (current) await ctx.db.patch(current._id, { status: "finished", error: null, targetSeatId: target.seatId, decisionId: target.decisionId, updatedAt: Date.now() });
    await scheduleAi(ctx, match._id, state);
    return;
  }
  // Solo rooms keep their human's outstanding choice for as long as needed.
  // Ordinary AI seats above still advance using the durable AI worker.
  if (room.humanSeatCount === 1) {
    if (current) await ctx.db.delete(current._id);
    return;
  }
  const actionTurnSerial = state.actionTurnSerial ?? 0;
  const sameActionTurn = current && (current.actionTurnSerial ?? 0) === actionTurnSerial;
  const reconciled = reconcileMultiplayerTimer(sameActionTurn ? timerFromRow(current) : null, state, Date.now(), room.timerMs, randomToken);
  if (!reconciled.timer) return;
  const next = reconciled.timer;
  if (current) {
    await ctx.db.patch(current._id, { token: next.token, deadlineAt: next.deadlineAt, actionTurnSerial, targetSeatId: next.target.seatId, decisionId: next.target.decisionId, status: next.status, error: next.error, timeoutSteps: reconciled.changed ? 0 : current.timeoutSteps, updatedAt: Date.now() });
  } else {
    await ctx.db.insert("eclipseRoomTimersV1", { roomId: room._id, matchId: match._id, token: next.token, deadlineAt: next.deadlineAt, actionTurnSerial, targetSeatId: next.target.seatId, decisionId: next.target.decisionId, status: next.status, error: next.error, timeoutSteps: 0, updatedAt: Date.now() });
  }
  if (reconciled.changed) await scheduleTimeout(ctx, room, next);
}

export const createRoom = mutation({
  args: { credential: v.string(), settings: settingsValidator, faction: factionValidator, pieceColor: v.optional(pieceColorValidator) },
  handler: async (ctx, args): Promise<{ roomToken: string; lobby: MultiplayerRoomLobby }> => {
    requireSettings(args.settings);
    const guest = await findGuest(ctx, args.credential);
    if (!guest) throw new Error("Guest session required.");
    const pieceColor = selectedColor(args.faction, args.pieceColor, args.settings.factionProfile ?? "base");
    const now = Date.now();
    let roomToken = randomToken();
    while (await findRoom(ctx, roomToken)) roomToken = randomToken();
    const roomId = await ctx.db.insert("eclipseRoomsV1", { roomToken, hostGuestId: guest._id, status: "waiting", ...args.settings, createdAt: now, updatedAt: now });
    await ctx.db.insert("eclipseRoomSeatsV1", { roomId, guestId: guest._id, slot: 1, faction: args.faction, pieceColor, ready: false, isHost: true, joinedAt: now });
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room creation failed.");
    return { roomToken, lobby: await lobbyFor(ctx, room, args.credential) };
  },
});

export const getRoom = query({
  args: { roomToken: v.string(), credential: v.optional(v.string()) },
  handler: async (ctx, args): Promise<MultiplayerRoomLobby | null> => {
    const room = await findRoom(ctx, args.roomToken);
    return room ? lobbyFor(ctx, room, args.credential) : null;
  },
});

export const listMyRooms = query({
  args: { credential: v.string() },
  handler: async (ctx, args): Promise<Array<Pick<MultiplayerRoomLobby, "roomToken" | "status" | "settings" | "viewerSlot" | "viewerIsHost" | "matchId"> & { updatedAt: number }>> => {
    const guest = await findGuest(ctx, args.credential);
    if (!guest) return [];
    const seats = await ctx.db.query("eclipseRoomSeatsV1").withIndex("by_guest", (q) => q.eq("guestId", guest._id)).collect();
    const rooms = await Promise.all(seats.map((seat) => ctx.db.get(seat.roomId)));
    const results = await Promise.all(rooms.filter((room): room is Doc<"eclipseRoomsV1"> => room !== null && room.status !== "closed").map(async (room) => {
      const lobby = await lobbyFor(ctx, room, args.credential);
      return { roomToken: lobby.roomToken, status: lobby.status, settings: lobby.settings, viewerSlot: lobby.viewerSlot, viewerIsHost: lobby.viewerIsHost, matchId: lobby.matchId, updatedAt: room.updatedAt };
    }));
    return results.sort((left, right) => right.updatedAt - left.updatedAt);
  },
});

export const joinRoom = mutation({
  args: { credential: v.string(), roomToken: v.string(), faction: factionValidator, pieceColor: v.optional(pieceColorValidator) },
  handler: async (ctx, args): Promise<{ lobby: MultiplayerRoomLobby }> => {
    const room = await findRoom(ctx, args.roomToken);
    const guest = await findGuest(ctx, args.credential);
    if (!room || !guest) throw new Error("Room or guest session unavailable.");
    if (room.status !== "waiting") throw new Error("This room is closed to new players.");
    const existing = await ctx.db.query("eclipseRoomSeatsV1").withIndex("by_room_guest", (q) => q.eq("roomId", room._id).eq("guestId", guest._id)).unique();
    if (existing) return { lobby: await lobbyFor(ctx, room, args.credential) };
    const seats = await roomSeats(ctx, room._id);
    if (seats.length >= room.humanSeatCount) throw new Error("This room is full.");
    const profile = room.factionProfile ?? "base";
    const pieceColor = selectedColor(args.faction, args.pieceColor, profile);
    requireAvailableSelection(args.faction, pieceColor, seats, profile);
    const slot = Array.from({ length: room.humanSeatCount }, (_, index) => index + 1).find((candidate) => !seats.some((seat) => seat.slot === candidate));
    if (!slot) throw new Error("This room is full.");
    await ctx.db.insert("eclipseRoomSeatsV1", { roomId: room._id, guestId: guest._id, slot, faction: args.faction, pieceColor, ready: false, isHost: false, joinedAt: Date.now() });
    await resetReady(ctx, room._id);
    await ctx.db.patch(room._id, { updatedAt: Date.now() });
    const updated = await ctx.db.get(room._id);
    if (!updated) throw new Error("Room unavailable.");
    return { lobby: await lobbyFor(ctx, updated, args.credential) };
  },
});

export const leaveRoom = mutation({
  args: { credential: v.string(), roomToken: v.string() },
  handler: async (ctx, args): Promise<{ lobby: MultiplayerRoomLobby | null; closed: boolean }> => {
    const room = await findRoom(ctx, args.roomToken);
    if (!room) throw new Error("Room unavailable.");
    if (room.status !== "waiting") throw new Error("A live match cannot be left from the lobby.");
    const owned = await ownedRoomSeat(ctx, args.credential, room);
    if (!owned) throw new Error("This guest does not occupy a room seat.");
    const seats = await roomSeats(ctx, room._id);
    const others = seats.filter((seat) => seat._id !== owned.seat._id).sort((left, right) => left.joinedAt - right.joinedAt);
    await ctx.db.delete(owned.seat._id);
    if (owned.seat.isHost && others.length === 0) {
      await ctx.db.patch(room._id, { status: "closed", updatedAt: Date.now() });
      return { lobby: null, closed: true };
    }
    if (owned.seat.isHost) {
      const nextHost = others[0];
      await ctx.db.patch(nextHost._id, { isHost: true, ready: false });
      await ctx.db.patch(room._id, { hostGuestId: nextHost.guestId, updatedAt: Date.now() });
    } else await ctx.db.patch(room._id, { updatedAt: Date.now() });
    await resetReady(ctx, room._id);
    const updated = await ctx.db.get(room._id);
    if (!updated) throw new Error("Room unavailable.");
    return { lobby: await lobbyFor(ctx, updated, args.credential), closed: false };
  },
});

export const chooseRoomFaction = mutation({
  args: { credential: v.string(), roomToken: v.string(), faction: factionValidator, pieceColor: v.optional(pieceColorValidator) },
  handler: async (ctx, args): Promise<MultiplayerRoomLobby> => {
    const room = await findRoom(ctx, args.roomToken);
    if (!room || room.status !== "waiting") throw new Error("This room cannot change factions.");
    const owned = await ownedRoomSeat(ctx, args.credential, room);
    if (!owned) throw new Error("This guest does not occupy a room seat.");
    const profile = room.factionProfile ?? "base";
    const pieceColor = selectedColor(args.faction, args.pieceColor, profile);
    const seats = await roomSeats(ctx, room._id);
    requireAvailableSelection(args.faction, pieceColor, seats.filter(seat => seat._id !== owned.seat._id), profile);
    await ctx.db.patch(owned.seat._id, { faction: args.faction, pieceColor, ready: false });
    await resetReady(ctx, room._id);
    await ctx.db.patch(room._id, { updatedAt: Date.now() });
    const updated = await ctx.db.get(room._id);
    if (!updated) throw new Error("Room unavailable.");
    return lobbyFor(ctx, updated, args.credential);
  },
});

export const updateRoomSettings = mutation({
  args: { credential: v.string(), roomToken: v.string(), settings: settingsValidator },
  handler: async (ctx, args): Promise<MultiplayerRoomLobby> => {
    requireSettings(args.settings);
    const room = await findRoom(ctx, args.roomToken);
    if (!room || room.status !== "waiting") throw new Error("This room cannot change settings.");
    const owned = await ownedRoomSeat(ctx, args.credential, room);
    if (!owned?.seat.isHost) throw new Error("Only the host can change room settings.");
    const seats = await roomSeats(ctx, room._id);
    if (seats.length > args.settings.humanSeatCount) throw new Error("Cannot remove occupied human seats.");
    const factionProfile = args.settings.factionProfile ?? room.factionProfile ?? 'base';
    const usedColors = new Set<CivilizationColor>();
    for (const seat of [...seats].sort((a, b) => a.slot - b.slot)) {
      if (!seat.faction) continue;
      const available = factionAllowedForProfile(seat.faction, factionProfile);
      const color = available ? selectedColor(seat.faction, seat.pieceColor, factionProfile) : undefined;
      if (!color || usedColors.has(color)) await ctx.db.patch(seat._id, { faction: null, pieceColor: undefined, ready: false });
      else { usedColors.add(color); await ctx.db.patch(seat._id, { pieceColor: color }); }
    }
    await ctx.db.patch(room._id, { ...args.settings, factionProfile, showCombatOdds:args.settings.showCombatOdds??room.showCombatOdds??false, updatedAt: Date.now() });
    await resetReady(ctx, room._id);
    const updated = await ctx.db.get(room._id);
    if (!updated) throw new Error("Room unavailable.");
    return lobbyFor(ctx, updated, args.credential);
  },
});

export const setRoomReady = mutation({
  args: { credential: v.string(), roomToken: v.string(), ready: v.boolean() },
  handler: async (ctx, args): Promise<MultiplayerRoomLobby> => {
    const room = await findRoom(ctx, args.roomToken);
    if (!room || room.status !== "waiting") throw new Error("This room is not waiting for ready players.");
    const owned = await ownedRoomSeat(ctx, args.credential, room);
    if (!owned) throw new Error("This guest does not occupy a room seat.");
    if (args.ready) {
      if (!owned.seat.faction) throw new Error('Choose a faction before marking ready.');
      const profile = room.factionProfile ?? 'base';
      const color = selectedColor(owned.seat.faction, owned.seat.pieceColor, profile);
      requireAvailableSelection(owned.seat.faction, color, (await roomSeats(ctx, room._id)).filter(seat => seat._id !== owned.seat._id), profile);
    }
    await ctx.db.patch(owned.seat._id, { ready: args.ready });
    await ctx.db.patch(room._id, { updatedAt: Date.now() });
    const updated = await ctx.db.get(room._id);
    if (!updated) throw new Error("Room unavailable.");
    return lobbyFor(ctx, updated, args.credential);
  },
});

export const startRoom = mutation({
  args: { credential: v.string(), roomToken: v.string() },
  handler: async (ctx, args): Promise<{ matchId: Id<"eclipseMatchesV1">; lobby: MultiplayerRoomLobby }> => {
    const room = await findRoom(ctx, args.roomToken);
    if (!room || room.status !== "waiting") throw new Error("This room cannot start.");
    const owned = await ownedRoomSeat(ctx, args.credential, room);
    if (!owned?.seat.isHost) throw new Error("Only the host can start this room.");
    const humanSeats = await roomSeats(ctx, room._id);
    const lobbySeats = toLobbySeats(room, humanSeats);
    const factionProfile = room.factionProfile ?? 'base';
    if (!roomCanStart({ humanSeatCount: room.humanSeatCount, aiCount: room.aiCount, seats: lobbySeats, factionProfile })) throw new Error("Every human seat needs a distinct faction and must be ready before starting.");
    const humans = [...humanSeats].sort((a, b) => a.slot - b.slot).map(seat => {
      if (!seat.faction) throw new Error('Choose a faction before starting.');
      return { id: `seat-${seat.slot}`, faction: seat.faction, pieceColor: selectedColor(seat.faction, seat.pieceColor, factionProfile), controller: 'human' as const };
    });
    const opponents = roomAiSelections(humans, room.aiCount, factionProfile, Math.random);
    const seats = [...humans, ...opponents.map((opponent, index) => ({ id: `seat-${room.humanSeatCount + index + 1}`, ...opponent, controller: 'ai' as const }))];
    const state = createGame({ seed: Math.floor(Math.random() * 0x100000000), seats, factionProfile, warpPortals: room.warpPortals, riftCannons: true, randomizeStartingPlayer: true });
    const now = Date.now();
    const matchId = await ctx.db.insert("eclipseMatchesV1", { snapshotJson: JSON.stringify(state), rulesVersion: state.rulesVersion, catalogVersion: state.catalogVersion, revision: state.revision, round: state.round, phase: state.phase, roomToken: room.roomToken, showCombatOdds:room.showCombatOdds??false, aiDifficulty: room.aiDifficulty ?? "normal", aiVersion: AI_VERSION, createdAt: now, updatedAt: now });
    await Promise.all(humanSeats.map((seat) => ctx.db.insert("eclipseOwnershipV1", { matchId, guestId: seat.guestId, seatId: `seat-${seat.slot}` })));
    await ctx.db.insert("eclipseAiJobsV1", { matchId, status: "waiting", expectedRevision: state.revision, attempts: 0, error: null, updatedAt: now });
    await ctx.db.patch(room._id, { status: "playing", matchId, updatedAt: now });
    const updatedRoom = await ctx.db.get(room._id);
    const match = await ctx.db.get(matchId);
    if (!updatedRoom || !match) throw new Error("Room start failed.");
    await synchronizeTimer(ctx, updatedRoom, match);
    return { matchId, lobby: await lobbyFor(ctx, updatedRoom, args.credential) };
  },
});

/** Invoked after ordinary accepted commands; stale jobs converge on the latest target. */
export const syncRoomTimer = internalMutation({
  args: { matchId: v.id("eclipseMatchesV1") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const room = await ctx.db.query("eclipseRoomsV1").withIndex("by_match", (q) => q.eq("matchId", args.matchId)).unique();
    const match = await ctx.db.get(args.matchId);
    if (room && match) await synchronizeTimer(ctx, room, match);
    return null;
  },
});

/** One paced Normal-AI command per job. The expired owner stays locked until their turn ends. */
export const runRoomTimeout = internalMutation({
  args: { roomToken: v.string(), token: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const room = await findRoom(ctx, args.roomToken);
    if (!room?.matchId || room.status !== "playing" || room.humanSeatCount === 1) return null;
    const timer = await ctx.db.query("eclipseRoomTimersV1").withIndex("by_room", (q) => q.eq("roomId", room._id)).unique();
    const match = await ctx.db.get(room.matchId);
    if (!timer || !match || match.lifecycle === "abandoned" || match.rollbackPendingId || timer.token !== args.token || (timer.status !== "active" && timer.status !== "timed-out") || (timer.status === "active" && timer.deadlineAt > Date.now())) return null;
    const state = readState(match);
    const target = timerTargetForState(state);
    if (!target || target.seatId !== timer.targetSeatId || (timer.actionTurnSerial ?? 0) !== (state.actionTurnSerial ?? 0)) { await synchronizeTimer(ctx, room, match); return null; }
    if (timer.timeoutSteps >= 32) {
      await ctx.db.patch(timer._id, { status: "failed", error: "Timed-out AI reached its 32-command safety limit.", updatedAt: Date.now() });
      return null;
    }
    await ctx.db.patch(timer._id, { status: "timed-out", targetSeatId: target.seatId, decisionId: target.decisionId, updatedAt: Date.now() });
    const existing = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
    if (existing?.status === 'thinking' && existing.expectedRevision === state.revision && existing.timeoutToken === timer.token) return null;
    const preserveBudget = existing?.timeoutToken === timer.token && (existing.budgetActionTurnSerial ?? 0) === (state.actionTurnSerial ?? 0);
    const patch = { status: 'scheduled' as const, expectedRevision: state.revision, timeoutToken: timer.token, budgetActor: target.seatId, budgetRound: state.round, budgetActionTurnSerial: state.actionTurnSerial ?? 0,
      remainingBudgetMs: preserveBudget ? existing.remainingBudgetMs : AI_BUDGETS.normal.budgetMs,
      attempts: 0, error: null, leaseToken: undefined, leaseExpiresAt: undefined, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert('eclipseAiJobsV1', {matchId: match._id, ...patch});
    await ctx.scheduler.runAfter(0, internal.eclipseMatches.runAi, {matchId: match._id, expectedRevision: state.revision});
    return null;
  },
});

/** Timeout work is checked again immediately before an authoritative commit. */
export async function validateTimeoutAi(ctx: ReadContext, match: Doc<'eclipseMatchesV1'>, token: string, actor: string): Promise<boolean> {
  const room = await ctx.db.query('eclipseRoomsV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
  const timer = await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
  return match.lifecycle !== 'abandoned' && !match.rollbackPendingId && !!room && room.status === 'playing' && room.humanSeatCount > 1 && !!timer && timer.token === token && timer.status === 'timed-out' && timer.targetSeatId === actor && (timer.actionTurnSerial ?? 0) === (readState(match).actionTurnSerial ?? 0) && timer.deadlineAt <= Date.now() && timer.timeoutSteps < 32;
}
export async function finishTimeoutAiCommand(ctx: MutationCtx, match: Doc<'eclipseMatchesV1'>, token: string, actor: string, state: GameState, committed: JournalEntry, actionRound: number): Promise<void> {
  const room = await ctx.db.query('eclipseRoomsV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
  const timer = await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
  if (!room || !timer || timer.token !== token) throw new Error('Timeout lease changed.');
  const timeoutEntry: JournalEntry = { ...committed, receipt: {...committed.receipt, eventCount: committed.events.length + 1}, events:[...committed.events, {type:'action', seatId:actor, visibility:'public', message:TIMEOUT_AI_HISTORY_MARKER}] };
  await saveTimeoutCommand(ctx, match._id, state, timeoutEntry, actionRound);
  const nextTarget = timerTargetForState(state);
  if (nextTarget?.seatId === actor && (timer.actionTurnSerial ?? 0) === (state.actionTurnSerial ?? 0)) {
    await ctx.db.patch(timer._id, {status:'timed-out', targetSeatId:actor, decisionId:nextTarget.decisionId, timeoutSteps:timer.timeoutSteps + 1, error:null, updatedAt:Date.now()});
    const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
    if (job) await ctx.db.patch(job._id, {status:'waiting', expectedRevision:state.revision, leaseToken:undefined, leaseExpiresAt:undefined});
    await ctx.scheduler.runAfter(AI_DECISION_DELAY_MS, internal.eclipseRooms.runRoomTimeout, {roomToken:room.roomToken, token});
  } else {
    // Retire this lease before handing control back; its watchdog must not
    // report a failure after a human turn or final scoring has begun.
    const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique();
    if (job) await ctx.db.patch(job._id, {status:state.phase === 'finished' ? 'finished' : 'waiting', expectedRevision:state.revision, timeoutToken:undefined, leaseToken:undefined, leaseExpiresAt:undefined, error:null});
    const nextMatch = await ctx.db.get(match._id);
    if (nextMatch) await synchronizeTimer(ctx, room, nextMatch);
  }
}

/** Shared by both visible retry controls; ownership is checked by their public endpoints. */
export async function retryFailedRoomTimeout(ctx: MutationCtx, matchId: Id<'eclipseMatchesV1'>, expectedToken?: string): Promise<void> {
  const room = await ctx.db.query('eclipseRoomsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
  const timer = await ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
  const match = await ctx.db.get(matchId);
  if (!room || !match || room.status !== 'playing' || room.humanSeatCount === 1) throw new Error('This room has no live timer.');
  if (match.lifecycle === 'abandoned' || match.rollbackPendingId) throw new Error('The game is paused or ended.');
  if (!timer || (expectedToken && timer.token !== expectedToken)) throw new Error('This timeout is no longer current.');
  if (timer.status !== 'failed') return;
  const target = timerTargetForState(readState(match));
  if (!target || target.seatId !== timer.targetSeatId) { await synchronizeTimer(ctx, room, match); return; }
  await ctx.db.patch(timer._id, {status:'timed-out', error:null, timeoutSteps:0, updatedAt:Date.now()});
  const job = await ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique();
  const patch = {status:'scheduled' as const, error:null, leaseToken:undefined, leaseExpiresAt:undefined, timeoutToken:timer.token, remainingBudgetMs:0, expectedRevision:match.revision, attempts:0, updatedAt:Date.now()};
  if (job) await ctx.db.patch(job._id, patch);
  else await ctx.db.insert('eclipseAiJobsV1', {matchId, ...patch});
  await ctx.scheduler.runAfter(AI_DECISION_DELAY_MS, internal.eclipseMatches.runAi, {matchId, expectedRevision:match.revision});
}

export const retryRoomTimer = mutation({
  args: { credential: v.string(), roomToken: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const room = await findRoom(ctx, args.roomToken);
    if (!room?.matchId || room.status !== "playing" || room.humanSeatCount === 1) throw new Error("This room has no live timer.");
    if (!await ownedRoomSeat(ctx, args.credential, room)) throw new Error("This guest does not occupy a room seat.");
    const match = await ctx.db.get(room.matchId);
    if (match?.rollbackPendingId || match?.lifecycle === 'abandoned') throw new Error('The game is paused or ended.');
    const timer = await ctx.db.query("eclipseRoomTimersV1").withIndex("by_room", (q) => q.eq("roomId", room._id)).unique();
    if (!timer || timer.status !== "failed") throw new Error("No failed room timer is available to retry.");
    await retryFailedRoomTimeout(ctx, room.matchId, timer.token);
    return null;
  },
});
