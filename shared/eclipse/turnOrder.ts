import type { GameState, Seat, SeatId } from './types';

type TurnCycle = Pick<GameState, 'seats' | 'turnOrder'>;

/** Keep the physical seat list intact; the optional saved cycle controls action turns. */
export function orderedSeats(state: TurnCycle): Seat[] {
  const byId = new Map(state.seats.map(seat => [seat.id, seat]));
  const listed = (state.turnOrder ?? []).flatMap(id => {
    const seat = byId.get(id);
    if (!seat) return [];
    byId.delete(id);
    return [seat];
  });
  return [...listed, ...byId.values()];
}

export function nextLivingSeatId(state: TurnCycle, actor: SeatId): SeatId | null {
  const seats = orderedSeats(state);
  const index = seats.findIndex(seat => seat.id === actor);
  if (index < 0) return null;
  for (let offset = 1; offset <= seats.length; offset++) {
    const next = seats[(index + offset) % seats.length];
    if (!next.eliminated) return next.id;
  }
  return null;
}
