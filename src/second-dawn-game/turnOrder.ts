import type {PlayerView} from '../../shared/eclipse/types';

/** Display the clockwise action cycle without changing physical seats or ownership. */
export function rosterTurnOrder(view: Pick<PlayerView, 'seats' | 'activeSeatId' | 'startSeatId' | 'phase'>): PlayerView['seats'] {
  const anchor = view.phase === 'action' ? view.activeSeatId ?? view.startSeatId : view.startSeatId;
  const index = Math.max(0, view.seats.findIndex(seat => seat.id === anchor));
  const cycle = [...view.seats.slice(index), ...view.seats.slice(0, index)];
  // Passed players still take reaction turns; eliminated civilizations stay inspectable.
  return [...cycle.filter(seat => !seat.eliminated), ...cycle.filter(seat => seat.eliminated)];
}
