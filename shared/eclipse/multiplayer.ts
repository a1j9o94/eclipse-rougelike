import { BASE_FACTIONS, type FactionId } from "./catalog";
import type { GameState, SeatId } from "./types";

export const MIN_MULTIPLAYER_HUMAN_SEATS = 2;
/** A solo room has one human and at least one AI. Its human always waits without a timer. */
export const MIN_ROOM_HUMAN_SEATS = 1;
export const MAX_MULTIPLAYER_SEATS = 6;
export const MIN_MULTIPLAYER_TIMER_MS = 30_000;
export const MAX_MULTIPLAYER_TIMER_MS = 48 * 60 * 60 * 1_000;

/** Public, URL-safe lobby identity. It is not an ownership credential. */
export type MultiplayerRoomToken = string;

export interface MultiplayerRoomSettings {
  humanSeatCount: number;
  aiCount: number;
  timerMs: number;
  warpPortals: boolean;
}

/** This projection intentionally excludes a guest ID, credential, email, and private game state. */
export interface MultiplayerLobbySeat {
  slot: number;
  username?: string | null;
  faction: FactionId | null;
  ready: boolean;
  isHost: boolean;
  occupied: boolean;
}

export interface MultiplayerRoomLobby {
  roomToken: MultiplayerRoomToken;
  status: "waiting" | "playing" | "finished";
  settings: MultiplayerRoomSettings;
  seats: readonly MultiplayerLobbySeat[];
  viewerSlot: number | null;
  viewerIsHost: boolean;
  matchId: string | null;
  timer: MultiplayerTimerPublic | null;
}

export interface MultiplayerTimerTarget {
  seatId: SeatId;
  /** Current decision metadata. It protects timeout work but does not reset its owner's clock. */
  decisionId: string | null;
}

/** Durable timer state. The token prevents stale scheduled jobs from acting. */
export interface MultiplayerTurnTimer {
  token: string;
  deadlineAt: number;
  target: MultiplayerTimerTarget;
  status: "active" | "timed-out" | "failed" | "finished";
  error: string | null;
}

export interface MultiplayerTimerPublic {
  deadlineAt: number;
  targetSeatId: SeatId;
  decisionId: string | null;
  status: MultiplayerTurnTimer["status"];
  error: string | null;
}

export interface TimerReconciliation {
  timer: MultiplayerTurnTimer | null;
  changed: boolean;
}

export function isMultiplayerTimerMs(value: number): boolean {
  return (
    Number.isSafeInteger(value) &&
    value >= MIN_MULTIPLAYER_TIMER_MS &&
    value <= MAX_MULTIPLAYER_TIMER_MS
  );
}

export function isMultiplayerSettings(value: MultiplayerRoomSettings): boolean {
  const total = value.humanSeatCount + value.aiCount;
  return (
    Number.isInteger(value.humanSeatCount) &&
    value.humanSeatCount >= MIN_ROOM_HUMAN_SEATS &&
    value.humanSeatCount <= MAX_MULTIPLAYER_SEATS &&
    Number.isInteger(value.aiCount) &&
    value.aiCount >= 0 &&
    total >= MIN_MULTIPLAYER_HUMAN_SEATS &&
    total <= MAX_MULTIPLAYER_SEATS &&
    isMultiplayerTimerMs(value.timerMs)
  );
}

export function roomFactionsAreDistinct(seats: readonly MultiplayerLobbySeat[]): boolean {
  const factions = seats.flatMap((seat) => (seat.occupied && seat.faction ? [seat.faction] : []));
  const colors = factions.map((factionId) => BASE_FACTIONS.find((faction) => faction.id === factionId)?.color);
  return new Set(factions).size === factions.length && !colors.includes(undefined) && new Set(colors).size === colors.length;
}

/** The host needs every configured human seat present, ready, and assigned a distinct faction. */
export function roomCanStart(input: {
  humanSeatCount: number;
  aiCount: number;
  seats: readonly Pick<MultiplayerLobbySeat, "slot" | "faction" | "ready" | "occupied">[];
}): boolean {
  const humanSeats = input.seats.filter((seat) => seat.slot <= input.humanSeatCount);
  const settings = {
    humanSeatCount: input.humanSeatCount,
    aiCount: input.aiCount,
    timerMs: MIN_MULTIPLAYER_TIMER_MS,
    warpPortals: true,
  };
  return (
    isMultiplayerSettings(settings) &&
    humanSeats.length === input.humanSeatCount &&
    humanSeats.every((seat) => seat.occupied && seat.ready && seat.faction !== null) &&
    roomFactionsAreDistinct(humanSeats.map((seat) => ({ ...seat, isHost: false })))
  );
}

export function roomInvitePath(roomToken: MultiplayerRoomToken): string {
  return `/room/${encodeURIComponent(roomToken)}`;
}

export function timerTargetForState(state: Pick<GameState, "phase" | "activeSeatId" | "pendingDecision">): MultiplayerTimerTarget | null {
  if (state.phase === "finished") return null;
  if (state.pendingDecision) {
    return { seatId: state.pendingDecision.owner, decisionId: state.pendingDecision.id };
  }
  return state.activeSeatId
    ? { seatId: state.activeSeatId, decisionId: null }
    : null;
}

/**
 * A revision and a pending decision can change with every accepted command, but
 * the current owner's clock does not. Keep deadline/token across same-owner
 * actions and choices so timeout AI can finish the whole turn. Only an owner
 * transition begins a fresh clock.
 */
export function reconcileMultiplayerTimer(
  previous: MultiplayerTurnTimer | null,
  state: Pick<GameState, "phase" | "activeSeatId" | "pendingDecision">,
  now: number,
  timerMs: number,
  nextToken: () => string,
): TimerReconciliation {
  if (!Number.isSafeInteger(now) || !isMultiplayerTimerMs(timerMs)) {
    throw new RangeError("Provide a safe current time and a supported multiplayer timer.");
  }
  const target = timerTargetForState(state);
  if (!target) return { timer: null, changed: previous !== null };
  if (
    previous &&
    (previous.status === "active" || previous.status === "timed-out") &&
    previous.target.seatId === target.seatId
  ) {
    return {
      timer: { ...previous, target },
      changed: false,
    };
  }
  return {
    timer: {
      token: nextToken(),
      deadlineAt: now + timerMs,
      target,
      status: "active",
      error: null,
    },
    changed: true,
  };
}

export function timerPublicView(timer: MultiplayerTurnTimer): MultiplayerTimerPublic {
  return {
    deadlineAt: timer.deadlineAt,
    targetSeatId: timer.target.seatId,
    decisionId: timer.target.decisionId,
    status: timer.status,
    error: timer.error,
  };
}
