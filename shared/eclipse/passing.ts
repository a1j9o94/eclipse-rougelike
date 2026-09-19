import type {PlayerView} from './types';

/** Publisher rules, Passing: first player receives two Money and the Start Player tile. */
export const FIRST_PASS_MONEY = 2;

export function firstPassMoney(view: Pick<PlayerView, 'firstPasser' | 'seats' | 'viewerSeatId'>): number {
  const own = view.seats.find(seat => seat.id === view.viewerSeatId);
  const unclaimed = view.firstPasser === null ||
    (view.firstPasser === undefined && view.seats.every(seat => !seat.passed));
  return own && !own.passed && unclaimed ? FIRST_PASS_MONEY : 0;
}

export function passButtonLabel(view: Pick<PlayerView, 'firstPasser' | 'seats' | 'viewerSeatId'>): string {
  const money = firstPassMoney(view);
  return money ? `Pass +${money} money` : 'Pass';
}
