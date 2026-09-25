import type {PlayerView} from '../../shared/eclipse/types';
import { orderedSeats } from '../../shared/eclipse/turnOrder';

/** Display the clockwise action cycle without changing physical seats or ownership. */
export function rosterTurnOrder(view: Pick<PlayerView, 'seats' | 'turnOrder' | 'activeSeatId' | 'startSeatId' | 'phase'>): PlayerView['seats'] {
  const anchor = view.phase === 'action' ? view.activeSeatId ?? view.startSeatId : view.startSeatId;
  const seats = orderedSeats(view);
  const index = Math.max(0, seats.findIndex(seat => seat.id === anchor));
  const cycle = [...seats.slice(index), ...seats.slice(0, index)];
  // Passed players still take reaction turns; eliminated civilizations stay inspectable.
  return [...cycle.filter(seat => !seat.eliminated), ...cycle.filter(seat => seat.eliminated)];
}
