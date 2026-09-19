import { skipPassedReactionTurns } from './autoPass';
import { FIRST_PASS_MONEY } from './passing';
import { tradeResources, type ResourceKind } from './economy';
import type { GameEvent, GameState, RuleResult, SeatId, ValidationError } from './types';

const reject = (
  code: ValidationError['code'],
  message: string,
): RuleResult => ({ ok: false, error: { code, message, field: null } });

/** Rulebook p8: passed players still receive turns for reactions; the final pass ends actions immediately. */
export function passTurn(input: GameState, actor: SeatId): RuleResult {
  const index = input.seats.findIndex((seat) => seat.id === actor);
  if (index < 0)
    return reject('NOT_A_SEAT', 'This seat is not part of the match.');
  if (input.phase !== 'action' || input.seats[index].eliminated)
    return reject(
      'ILLEGAL_ACTION',
      'Passing is available to surviving seats during the action phase.',
    );
  if (input.pendingDecision)
    return reject(
      'DECISION_PENDING',
      'Complete the outstanding choice before passing.',
    );
  if (input.activeSeatId !== actor)
    return reject('NOT_YOUR_TURN', 'Wait for your turn before passing.');
  const state = structuredClone(input);
  const seat = state.seats[index];
  const first = state.firstPasser === null;
  if (first && !Number.isSafeInteger(seat.resources.money + FIRST_PASS_MONEY))
    return reject(
      'INVALID_COMMAND',
      'Money storage is outside its supported range.',
    );
  seat.passed = true;
  state.actionTurnSerial = (state.actionTurnSerial ?? 0) + 1;
  if (first) {
    seat.resources.money += FIRST_PASS_MONEY;
    state.firstPasser = actor;
    state.startSeatId = actor;
  }
  if (
    state.seats.every((candidate) => candidate.eliminated || candidate.passed)
  ) {
    state.phase = 'combat';
    state.activeSeatId = null;
  } else {
    for (let offset = 1; offset <= state.seats.length; offset++) {
      const next = state.seats[(index + offset) % state.seats.length];
      if (!next.eliminated) {
        state.activeSeatId = next.id;
        break;
      }
    }
  }
  const events: GameEvent[] = [
      {
        type: 'action',
        seatId: actor,
        visibility: 'public',
        message: first
          ? 'Passed first; gained 2 money and the start player tile.'
          : 'Passed.',
      },
      ...(state.phase === 'combat'
        ? [
            {
              type: 'phase' as const,
              seatId: null,
              visibility: 'public' as const,
              message: 'All surviving seats have passed. Combat phase begins.',
            },
          ]
        : []),
    ];
  skipPassedReactionTurns(state, events);
  return { ok: true, state, events };
}

/** Rulebook pp6,24: trade at the species ratio without spending discs or ending a turn. */
export function tradeDuringGame(
  input: GameState,
  actor: SeatId,
  from: ResourceKind,
  to: ResourceKind,
  quantity: number,
): RuleResult {
  const index = input.seats.findIndex((seat) => seat.id === actor);
  if (index < 0)
    return reject('NOT_A_SEAT', 'This seat is not part of the match.');
  if (
    input.phase === 'setup' ||
    input.phase === 'finished' ||
    input.seats[index].eliminated
  )
    return reject(
      'ILLEGAL_ACTION',
      'Trade is unavailable before play or after this seat has finished.',
    );
  if (
    input.pendingDecision &&
    (input.pendingDecision.owner !== actor ||
      input.pendingDecision.kind !== 'bankruptcy')
  ) {
    return reject(
      'DECISION_PENDING',
      'Complete the outstanding choice before trading.',
    );
  }
  const seat = input.seats[index];
  const result = tradeResources(
    seat.resources,
    seat.faction,
    from,
    to,
    quantity,
  );
  if (!result.ok)
    return reject(
      result.code === 'insufficient-resources'
        ? 'INSUFFICIENT_RESOURCES'
        : 'INVALID_COMMAND',
      result.message,
    );
  const state = structuredClone(input);
  state.seats[index].resources = result.resources;
  return {
    ok: true,
    state,
    events: [
      {
        type: 'resource',
        seatId: actor,
        visibility: 'public',
        message: `Traded ${from} for ${quantity} ${to}.`,
      },
    ],
  };
}
