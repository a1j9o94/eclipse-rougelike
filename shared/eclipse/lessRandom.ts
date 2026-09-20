import { getFaction } from './catalog';
import type { GameState, RulesMode, Seat } from './types';

export const LESS_RANDOM_MODE: RulesMode = 'less-random-v1';
export const removedTechnologyIds = new Set(['warp-portal', 'flux-missile', 'neutron-absorber']);

/** Historical saves did not serialize a mode and must retain base behavior. */
export function isLessRandom(state: Pick<GameState, 'rulesMode'>): boolean {
  return state.rulesMode === LESS_RANDOM_MODE;
}

export function outerPlacementLimit(state: Pick<GameState, 'round'>, seat: Seat): number {
  if (state.round !== 1) return 1;
  // The source calls out Planta and Legion of Midas. Et'Etn'K'Tis is not in
  // the shipped catalog, so it cannot receive an invented faction mapping.
  return ['planta', 'midas'].includes(seat.faction) ? 2 : 1;
}

export function lessRandomTradeInput(
  faction: Seat['faction'],
  from: 'money' | 'science' | 'materials',
  to: 'money' | 'science' | 'materials',
  quantity: number,
): number | null {
  if (from === to || !Number.isSafeInteger(quantity) || quantity < 1) return null;
  const terran = getFaction(faction).species === 'terran';
  if (terran) return Math.floor(quantity / 2) * 3 + (quantity % 2) * 2;
  if (faction === 'eridani') {
    if (from === 'money' && (to === 'science' || to === 'materials')) return Math.floor(quantity / 2) * 3 + (quantity % 2) * 2;
    return quantity * 2;
  }
  return faction === 'mechanema' ? quantity * 2 : null;
}
