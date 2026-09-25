import { allowsRiftCannons, factionRulesMode, validRuleOptions, type GameRuleOptions } from './gameRules';
import { factionAllowedForProfile, getFaction, seatPieceColor, listFactionsForProfile, type CivilizationColor, type FactionProfile, type FactionId } from "./catalog";
import type { AiDifficulty } from "./aiConfig";
import type { GameState, SeatId, RulesMode } from "./types";

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
  riftCannons?: boolean;
  /** Missing on an existing room means standard rules. */
  rulesMode?: RulesMode;
  ruleOptions?: GameRuleOptions;
  showCombatOdds?: boolean;
  minorSpecies?: boolean;
  aiDifficulty?: AiDifficulty;
  factionProfile?: FactionProfile;
}

/** This projection intentionally excludes a guest ID, credential, email, and private game state. */
export interface MultiplayerLobbySeat {
  slot: number;
  username?: string | null;
  faction: FactionId | null;
  bannedFaction?: FactionId;
  pieceColor?: CivilizationColor;
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
  /** All unfinished humans share one deadline during simultaneous upkeep. */
  upkeepRound?: number;
  upkeepSeatIds?: SeatId[];
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
    isMultiplayerTimerMs(value.timerMs) &&
    (value.rulesMode === undefined || value.rulesMode === "standard" || value.rulesMode === "less-random-v1") &&
    validRuleOptions(value.ruleOptions) &&
    typeof value.warpPortals === "boolean" &&
    (value.riftCannons === undefined || typeof value.riftCannons === "boolean") &&
    (!value.riftCannons || allowsRiftCannons(value)) &&
    (value.factionProfile === undefined || ["base", "expanded-v1", "expanded-v2"].includes(value.factionProfile)) &&
    (value.showCombatOdds === undefined || typeof value.showCombatOdds === "boolean") &&
    (value.minorSpecies === undefined || typeof value.minorSpecies === "boolean") &&
    (value.aiDifficulty === undefined || ["normal", "hard", "expert"].includes(value.aiDifficulty))
  );
}

export function roomFactionsAreDistinct(seats: readonly MultiplayerLobbySeat[], profile: FactionProfile = 'base'): boolean {
  const selected = seats.filter((seat): seat is MultiplayerLobbySeat & { faction: FactionId } => seat.occupied && seat.faction !== null);
  if (selected.some(seat => !factionAllowedForProfile(seat.faction, profile))) return false;
  const colors = selected.map(seat => profile === 'base' ? getFaction(seat.faction).color : seatPieceColor(seat));
  return new Set(selected.map(seat => seat.faction)).size === selected.length && new Set(colors).size === colors.length;
}

export function roomTerranBansAreValid(seats: readonly MultiplayerLobbySeat[], mode: RulesMode | undefined, profile: FactionProfile = 'base'): boolean {
  if (mode !== 'less-random-v1') return true;
  const selected = new Set(seats.flatMap(seat => seat.faction ? [seat.faction] : []));
  const bans = seats.flatMap(seat => seat.faction && getFaction(seat.faction).species === 'terran' ? [seat.bannedFaction] : []);
  const definedBans = bans.filter((ban): ban is FactionId => ban !== undefined);
  return definedBans.length === bans.length && definedBans.every(ban => factionAllowedForProfile(ban,profile) && getFaction(ban).species === 'alien' && !selected.has(ban)) && new Set(definedBans).size === definedBans.length;
}

/** Assign each computer an unused faction and piece color. Random is supplied by the authoritative caller. */
export function roomAiSelections(humans: readonly { faction: FactionId; pieceColor?: CivilizationColor; bannedFaction?: FactionId }[], count: number, profile: FactionProfile, random: () => number, rulesMode?: RulesMode): Array<{ faction: FactionId; pieceColor: CivilizationColor; bannedFaction?: FactionId }> {
  const colors: CivilizationColor[] = ['red', 'blue', 'green', 'yellow', 'white', 'black'];
  const usedColors = new Set(humans.map(seat => profile === 'base' ? getFaction(seat.faction).color : seatPieceColor(seat)));
  const usedFactions = new Set(humans.map(seat => seat.faction));
  const banned = new Set(rulesMode === 'less-random-v1' ? humans.flatMap(seat => seat.bannedFaction ? [seat.bannedFaction] : []) : []);
  const candidates = listFactionsForProfile(profile).filter(faction => (rulesMode === 'less-random-v1' || faction.species === 'alien') && !usedFactions.has(faction.id) && !banned.has(faction.id));
  if (profile !== 'base') {
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
  }
  const result: Array<{ faction: FactionId; pieceColor: CivilizationColor; bannedFaction?: FactionId }> = [];
  const choose = (index: number): boolean => {
    if (result.length === count) {
      if (rulesMode !== 'less-random-v1') return true;
      const used = new Set([...usedFactions,...result.map(seat=>seat.faction),...banned]);
      const availableAliens = listFactionsForProfile(profile).filter(faction=>faction.species==='alien'&&!used.has(faction.id)).length;
      return availableAliens >= result.filter(seat=>getFaction(seat.faction).species==='terran').length;
    }
    for (let i=index;i<candidates.length;i++) {
      const faction=candidates[i],pieceColor=profile==='base'?faction.color:colors.find(color=>!usedColors.has(color));
      if (!pieceColor||usedColors.has(pieceColor)) continue;
      usedColors.add(pieceColor);result.push({faction:faction.id,pieceColor});
      if (choose(i+1)) return true;
      result.pop();usedColors.delete(pieceColor);
    }
    return false;
  };
  choose(0);
  if (result.length !== count) throw new Error('Not enough unused faction board colors for AI seats.');
  if (rulesMode === 'less-random-v1') {
    const used = new Set([...usedFactions,...result.map(seat=>seat.faction)]);
    for (const seat of result) if (getFaction(seat.faction).species === 'terran') {
      const ban = listFactionsForProfile(profile).find(faction => faction.species === 'alien' && !used.has(faction.id) && !banned.has(faction.id));
      if (!ban) throw new Error('Not enough unselected alien factions for a Terran ban.');
      seat.bannedFaction = ban.id; banned.add(ban.id);
    }
  }
  return result;
}

/** The host needs every configured human seat present, ready, and assigned a distinct faction. */
export function roomCanStart(input: {
  humanSeatCount: number;
  aiCount: number;
  factionProfile?: FactionProfile;
  rulesMode?: RulesMode;
  ruleOptions?: GameRuleOptions;
  seats: readonly Pick<MultiplayerLobbySeat, "slot" | "faction" | "pieceColor" | "bannedFaction" | "ready" | "occupied">[];
}): boolean {
  const humanSeats = input.seats.filter((seat) => seat.slot <= input.humanSeatCount);
  const settings = {
    humanSeatCount: input.humanSeatCount,
    aiCount: input.aiCount,
    timerMs: MIN_MULTIPLAYER_TIMER_MS,
    warpPortals: true,
    rulesMode: input.rulesMode,
    ruleOptions: input.ruleOptions,
  };
  return (
    isMultiplayerSettings(settings) &&
    humanSeats.length === input.humanSeatCount &&
    humanSeats.every((seat) => seat.occupied && seat.ready && seat.faction !== null) &&
    roomFactionsAreDistinct(humanSeats.map((seat) => ({ ...seat, isHost: false })), input.factionProfile) &&
    roomTerranBansAreValid(humanSeats.map((seat) => ({ ...seat, isHost: false })), factionRulesMode(input), input.factionProfile)
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
    (previous.status === "active" || previous.status === "timed-out" || previous.status === "failed") &&
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
