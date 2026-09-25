import {gameRules} from './gameRules';
import {sectorDrawOdds} from './sectorDrawOdds';
import { upkeepDecisionForSeat, upkeepSeatUnfinished } from './upkeep';
import type {
  CommandRequest,
  GameEvent,
  GameState,
  MatchAggregate,
  PlayerView,
  PublicGameView,
  SpectatorView,
  RuleResult,
  SeatId,
  SubmissionResult,
  ValidationError,
} from './types';

export interface RulesPin {
  rulesVersion: string;
  catalogVersion: string;
}
export type RuleProcessor = (
  state: GameState,
  actor: SeatId,
  command: CommandRequest['command'],
) => RuleResult;

// Only compares already-validated, JSON-compatible command data. Property order is immaterial.
function canonical(value: object): string {
  return JSON.stringify(
    value,
    (_key, item: object | string | number | boolean | null) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        );
      }
      return item;
    },
  );
}

/** Atomic pure boundary. The storage adapter must execute this in one transaction.
 * The rules callback receives an isolated copy and may never set revisions itself.
 * This module enforces transport/decision ownership; rule-specific legality belongs to the processor.
 */
export function commitCommand(
  aggregate: MatchAggregate,
  actor: SeatId,
  request: CommandRequest,
  pin: RulesPin,
  process: RuleProcessor,
): SubmissionResult {
  const reject = (
    code: ValidationError['code'],
    message: string,
    field: string | null = null,
  ): SubmissionResult => ({
    ok: false,
    aggregate,
    error: { code, message, field },
  });
  const state = aggregate.state;
  const seat = state.seats.find((candidate) => candidate.id === actor);
  if (!seat)
    return reject(
      'NOT_A_SEAT',
      'This identity does not own a seat in this match.',
    );
  if (
    !request.commandId.trim() ||
    request.commandId.length > 128 ||
    !Number.isSafeInteger(request.expectedRevision) ||
    request.expectedRevision < 0
  ) {
    return reject(
      'INVALID_COMMAND',
      'Provide a command ID and a nonnegative integer revision.',
    );
  }
  const original = aggregate.journal.find(
    (entry) => entry.request.commandId === request.commandId,
  );
  if (original) {
    if (
      original.actor !== actor ||
      canonical(original.request) !== canonical(request)
    ) {
      return reject(
        'COMMAND_ID_REUSED',
        'This command ID was already used for a different submission.',
        'commandId',
      );
    }
    return {
      ok: true,
      aggregate,
      receipt: structuredClone(original.receipt),
      duplicate: true,
    };
  }
  if (
    state.rulesVersion !== pin.rulesVersion ||
    state.catalogVersion !== pin.catalogVersion
  ) {
    return reject(
      'VERSION_MISMATCH',
      'This match requires its pinned rules and catalog version.',
    );
  }
  if (state.revision !== request.expectedRevision)
    return reject(
      'STALE_REVISION',
      'Refresh the match before submitting this choice.',
      'expectedRevision',
    );
  if (state.phase === 'finished' || seat.eliminated)
    return reject(
      'GAME_FINISHED',
      'This seat can no longer submit gameplay commands.',
    );
  if (state.phase === 'upkeep' && !upkeepSeatUnfinished(state, actor) && request.command.type !== 'resolve' && request.command.type !== 'set-auto-pass')
    return reject('ILLEGAL_ACTION', 'You have already completed upkeep.');
  const pending = state.phase === 'upkeep' ? upkeepDecisionForSeat(state, actor) : state.pendingDecision;
  if (pending && request.command.type !== 'set-auto-pass') {
    const diplomacyReturn=request.command.type==='discard-reputation'&&(pending.kind==='diplomacy'||pending.kind==='diplomacy-window');
    if (pending.owner !== actor&&!diplomacyReturn)
      return reject(
        'DECISION_PENDING',
        'Waiting for another seat to finish its decision.',
      );
    // Trading remains possible during bankruptcy; all other concurrent decisions are serialized.
    const bankruptcyTrade =
      pending.kind === 'bankruptcy' && (request.command.type === 'trade' || request.command.type === 'convert-colony-ship');
    if (
      !bankruptcyTrade && !diplomacyReturn &&
      (request.command.type !== 'resolve' ||
        request.command.decisionId !== pending.id ||
        request.command.choice.kind !== pending.kind)
    )
      return reject(
        'WRONG_DECISION',
        'Resolve the current decision using its ID and choice type.',
      );
  } else {
    if (request.command.type === 'resolve')
      return reject(
        'WRONG_DECISION',
        'That decision is no longer outstanding.',
      );
    // Trading is allowed at any time; its precise economy constraints remain rules-owned.
    if (!upkeepSeatUnfinished(state, actor) && state.activeSeatId !== actor && request.command.type !== 'trade' && request.command.type !== 'discard-reputation' && request.command.type !== 'set-auto-pass')
      return reject('NOT_YOUR_TURN', 'Wait for your turn.');
  }
  const result = process(
    structuredClone(state),
    actor,
    structuredClone(request.command),
  );
  if (!result.ok) return { ok: false, aggregate, error: result.error };
  if (
    result.state.revision !== state.revision ||
    result.state.rulesVersion !== state.rulesVersion ||
    result.state.catalogVersion !== state.catalogVersion
  )
    throw new Error('Rules may not modify the revision or version pin.');
  const revision = state.revision + 1;
  if (!Number.isSafeInteger(revision))
    throw new RangeError('Revision exhausted.');
  const receipt = {
    commandId: request.commandId,
    revision,
    eventCount: result.events.length,
  };
  const nextState = structuredClone(result.state);
  nextState.revision = revision;
  const entry = {
    actor,
    request: structuredClone(request),
    receipt: { ...receipt },
    events: structuredClone(result.events),
  };
  return {
    ok: true,
    aggregate: {
      state: nextState,
      journal: [...structuredClone(aggregate.journal), entry],
    },
    receipt,
    duplicate: false,
  };
}

/** Shared allowlisted public state; no ownership is needed to inspect the board. */
function publicGameView(state: GameState, scoreViewer?: SeatId): PublicGameView {
  const rules = gameRules(state);
  const visiblePending = state.pendingDecision;
  return {
    ...(state.phase === 'upkeep' ? { upkeepDone: [...(state.engine?.upkeepDone ?? [])] } : {}),
    ...(state.minorSpecies ? {minorSpecies:structuredClone(state.minorSpecies)} : {}),
    rulesVersion: state.rulesVersion,
    catalogVersion: state.catalogVersion,
    ...(state.factionProfile ? { factionProfile: state.factionProfile } : {}),
    ...(state.rulesMode ? { rulesMode: state.rulesMode } : {}),
    ...(state.ruleOptions ? { ruleOptions: state.ruleOptions } : {}),
    ...(state.lessRandom ? { lessRandom: {
      explorationJokers: rules.explorationRules ? state.lessRandom.explorationJokers : {},
      outerPlacementsThisRound: rules.explorationRules ? state.lessRandom.outerPlacementsThisRound : {},
      discoverySupply: rules.publicDiscoveries ? state.lessRandom.discoverySupply : [],
      reservedDiscoveries: rules.publicDiscoveries ? state.lessRandom.reservedDiscoveries : {},
      reputationSupply: rules.publicReputation ? state.lessRandom.reputationSupply : [],
      reputationBySeat: rules.publicReputation ? state.lessRandom.reputationBySeat : {},
    } } : {}),
    revision: state.revision,
    actionTurnSerial: state.actionTurnSerial ?? 0,
    round: state.round,
    phase: state.phase,
    activeSeatId: state.activeSeatId,
    startSeatId: state.startSeatId,
    firstPasser: state.firstPasser,
    ...(state.passOrder ? { passOrder: [...state.passOrder] } : {}),
    ...(state.turnOrder ? { turnOrder: [...state.turnOrder] } : {}),
    warpPortals: state.engine?.warpPortals ?? true,
    riftCannons: state.engine?.riftCannons ?? false,
    sectorDeckCounts: {
      inner: {drawPile: state.supplies.inner.length, discardPile: state.engine?.discardedSectors.inner.length ?? 0},
      middle: {drawPile: state.supplies.middle.length, discardPile: state.engine?.discardedSectors.middle.length ?? 0},
      outer: {drawPile: state.supplies.outer.length, discardPile: state.engine?.discardedSectors.outer.length ?? 0},
    },
    sectorDrawOdds: sectorDrawOdds(state),
    supplyCounts: {
      inner: state.supplies.inner.length + (state.engine?.discardedSectors.inner.length ?? 0),
      middle: state.supplies.middle.length + (state.engine?.discardedSectors.middle.length ?? 0),
      outer: state.supplies.outer.length + (state.engine?.discardedSectors.outer.length ?? 0),
      technology: state.supplies.technology.length,
      discovery: state.supplies.discovery.length,
      reputation: state.supplies.reputation.length,
    },
    seats: state.seats,
    sectors: state.sectors,
    ships: state.ships,
    technologyMarket: state.technologyMarket,
    waitingFor: visiblePending
      ? { owner: visiblePending.owner, kind: visiblePending.kind }
      : null,
    hiddenTileCounts: state.privateSeats.map((seat) => ({
      seatId: seat.seatId,
      reputation: seat.reputation.length,
      discoveriesKept: seat.discoveriesKept.length,
    })),
    ...(state.engine ? {
      actionProgress: state.engine.action,
      scores: state.engine.scores?.map(score => {
        if (state.phase === 'finished' || rules.publicReputation || score.playerId === scoreViewer) return score;
        const bonusCount = state.seats.find(seat => seat.id === score.playerId)?.discoveryBonuses?.filter(bonus => bonus === 'reputation').length ?? 0;
        const hiddenBonus = bonusCount * Math.floor(score.reputation / 3);
        return { ...score, reputation: 0, ...(hiddenBonus ? {variant: Math.max(0, (score.variant ?? 0) - hiddenBonus)} : {}), total: score.total - score.reputation - hiddenBonus };
      }) ?? null,
      battle: state.engine.battle ? {
        id: state.engine.battle.id,
        sectorId: state.engine.battle.sectorId, attacker: state.engine.battle.attacker,
        defender: state.engine.battle.defender, stage: state.engine.battle.stage,
        engagement: state.engine.battle.engagement,
      } : null,
    } : {}),
  };
}

/** AI and human controllers consume this same allowlisted projection. */
export function getPlayerView(
  state: GameState,
  viewerSeatId: SeatId,
): PlayerView | null {
  if (!state.seats.some((seat) => seat.id === viewerSeatId)) return null;
  const own = state.privateSeats.find((seat) => seat.seatId === viewerSeatId);
  if (!own) throw new Error('Seat has no private-state record.');
  const visibleOwn = { ...own };
  if (visibleOwn.storedDiscovery && !visibleOwn.storedDiscoveryResolved)
    delete visibleOwn.storedDiscovery;
  const visiblePending = state.phase === 'upkeep' ? upkeepDecisionForSeat(state, viewerSeatId) : state.pendingDecision;
  return structuredClone({
    ...publicGameView(state, viewerSeatId),
    viewerSeatId,
    private: visibleOwn,
    pendingDecision: visiblePending?.owner === viewerSeatId ? visiblePending : null,
    waitingFor: visiblePending ? {owner:visiblePending.owner, kind:visiblePending.kind} : null,
  });
}

/** Anonymous spectators use the public projection directly, never an impersonated seat. */
export function getSpectatorView(state: GameState): SpectatorView {
  return structuredClone({...publicGameView(state), kind:'spectator'});
}

export function visibleEvents(
  events: readonly GameEvent[],
  viewerSeatId: SeatId,
): GameEvent[] {
  return structuredClone(
    events.filter(
      (event) =>
        event.visibility === 'public' ||
        event.visibility.seatId === viewerSeatId,
    ),
  );
}
