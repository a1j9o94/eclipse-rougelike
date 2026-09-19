import { getFaction } from './catalog';
import { emit } from './rulesState';
import type { GameEvent, GameState, Seat } from './types';

/** A saved convenience preference; never substitutes for a player's first pass. */
export function shouldAutoPass(state: GameState, seat: Seat): boolean {
  return seat.passed && !seat.eliminated && seat.autoPassUnlessAttacked === true && seat.autoPassPausedRound !== state.round;
}

export function skipPassedReactionTurns(state: GameState, events: GameEvent[]): void {
  if (state.phase !== 'action' || state.pendingDecision || state.engine?.action || state.engine?.decisions.length) return;
  // The ordinary last pass enters combat. Keep malformed/old all-passed action
  // snapshots unchanged instead of looping or bypassing combat initialization.
  if (state.seats.every(seat => seat.passed || seat.eliminated)) return;
  for (let skipped = 0; skipped < state.seats.length; skipped++) {
    const index = state.seats.findIndex(seat => seat.id === state.activeSeatId);
    if (index < 0 || !shouldAutoPass(state, state.seats[index])) return;
    const seat = state.seats[index];
    emit(events, seat.id, `${getFaction(seat.faction).name} automatically passes its reaction turn.`);
    state.actionTurnSerial = (state.actionTurnSerial ?? 0) + 1;
    for (let offset = 1; offset <= state.seats.length; offset++) {
      const next = state.seats[(index + offset) % state.seats.length];
      if (!next.eliminated) { state.activeSeatId = next.id; break; }
    }
  }
}

export function pauseAutoPass(state: GameState, defenderId: string, events: GameEvent[]): void {
  const defender = state.seats.find(seat => seat.id === defenderId);
  if (!defender || !shouldAutoPass(state, defender)) return;
  defender.autoPassPausedRound = state.round;
  emit(events, defender.id, 'Auto-pass paused for this round: an opponent entered your territory or fleet sector.');
}

/** Called only inside the transactional rules clone after validating movement. */
export function interruptAutoPassForEntry(state: GameState, attacker: Seat, path: string[], events: GameEvent[]): void {
  for (const defender of state.seats) {
    if (defender.id === attacker.id || attacker.ambassadors.includes(defender.id)) continue;
    if (path.some(id => state.sectors.some(sector => sector.id === id && sector.owner === defender.id)
      || state.ships.some(ship => ship.sectorId === id && ship.owner === defender.id))) {
      pauseAutoPass(state, defender.id, events);
    }
  }
}
