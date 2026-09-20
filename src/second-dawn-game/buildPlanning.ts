import { researchedTechnologyIds } from '../../shared/eclipse/technologies';
import {remainingAction} from './actionCapacity';
import { BASE_COMPONENTS, getFaction } from '../../shared/eclipse/catalog';
import { capacity } from '../../shared/eclipse/rulesState';
import {constructionCostForSeat} from '../../shared/eclipse/minorSpecies';
import type { BuildComponent } from '../../shared/eclipse/history';
import type { GameCommand, PlayerView } from '../../shared/eclipse/types';

export type { BuildComponent };
export interface BuildOrderItem { id: string; component: BuildComponent; sectorId: string | null }
export interface BuildOrderDraft { items: BuildOrderItem[]; selectedItemId: string | null; fundingKey: string }
export interface BuildPlacementPreview { itemId: string; component: BuildComponent; sectorId: string | null; legalSectorIds: readonly string[]; items: readonly BuildOrderItem[]; selectedItemId: string }
export interface BuildOrderAnalysis {
  command: Extract<GameCommand, { type: 'build' }>;
  cost: number;
  limit: number;
  placedCount: number;
  unplacedCount: number;
  issues: readonly string[];
  legalSectorIdsByItem: Readonly<Record<string, readonly string[]>>;
}

export const BUILD_COMPONENTS: readonly BuildComponent[] = ['interceptor','cruiser','dreadnought','starbase','orbital','monolith'];
export const emptyBuildOrder = (): BuildOrderDraft => ({ items: [], selectedItemId: null, fundingKey: '' });

export function nextBuildItemId(items: readonly BuildOrderItem[], component: BuildComponent): string {
  let suffix = 1;
  while (items.some(item => item.id === `${component}-${suffix}`)) suffix += 1;
  return `${component}-${suffix}`;
}

export function addBuildItem(draft: BuildOrderDraft, component: BuildComponent): BuildOrderDraft {
  const id = nextBuildItemId(draft.items, component);
  return { items: [...draft.items, { id, component, sectorId: null }], selectedItemId: id, fundingKey: '' };
}

export function removeBuildItem(draft: BuildOrderDraft, id: string): BuildOrderDraft {
  const items = draft.items.filter(item => item.id !== id);
  return { items, selectedItemId: draft.selectedItemId === id ? items.at(-1)?.id ?? null : draft.selectedItemId, fundingKey: '' };
}

export function placeBuildItem(draft: BuildOrderDraft, id: string, sectorId: string | null): BuildOrderDraft {
  const previous = draft.items.find(item => item.id === id);
  const items = draft.items.map(item => item.id === id ? { ...item, sectorId } : item);
  const nextUnplaced = previous?.sectorId === null && sectorId !== null ? items.find(item => item.id !== id && item.sectorId === null) : null;
  return { ...draft, items, selectedItemId: nextUnplaced?.id ?? id, fundingKey: '' };
}

export function analyzeBuildOrder(view: PlayerView, draft: BuildOrderDraft): BuildOrderAnalysis {
  const own = view.seats.find(seat => seat.id === view.viewerSeatId);
  if (!own) return { command: { type: 'build', builds: [] }, cost: 0, limit: 0, placedCount: 0, unplacedCount: draft.items.length, issues: ['Player is unavailable.'], legalSectorIdsByItem: {} };
  const owned = view.sectors.filter(sector => sector.owner === own.id);
  const technologies: readonly string[] = researchedTechnologyIds(own);
  const progress = view.actionProgress;
  const limit = progress ? remainingAction(view,'build') : capacity(own, 'build');
  const legalSectorIdsByItem: Record<string, readonly string[]> = {};
  for (const item of draft.items) {
    const technologyLegal = !['starbase','orbital','monolith'].includes(item.component) || technologies.includes(item.component);
    const deployed = view.ships.filter(ship => ship.owner === own.id && ship.type === item.component).length;
    const ordered = draft.items.filter(other => other.component === item.component && draft.items.indexOf(other) <= draft.items.indexOf(item)).length;
    const supplyLegal = item.component === 'orbital' || item.component === 'monolith' || deployed + ordered <= (getFaction(own.faction).componentSupply?.[item.component]??BASE_COMPONENTS.perColor[item.component]);
    legalSectorIdsByItem[item.id] = technologyLegal && supplyLegal ? owned.filter(sector => {
      if (item.component !== 'orbital' && item.component !== 'monolith') return true;
      const already = !!sector[item.component] || draft.items.some(other => other.id !== item.id && other.component === item.component && other.sectorId === sector.id);
      return !already;
    }).map(sector => sector.id) : [];
  }
  const command: Extract<GameCommand, { type: 'build' }> = { type: 'build', builds: draft.items.flatMap(item => item.sectorId ? [{ component: item.component, sectorId: item.sectorId }] : []) };
  const issues: string[] = [];
  if (!draft.items.length) issues.push('Choose at least one piece.');
  if (draft.items.length > limit) issues.push(`This order exceeds the ${limit} piece Build limit.`);
  const unplacedCount = draft.items.length - command.builds.length;
  if (unplacedCount) issues.push(`Place ${unplacedCount} remaining ${unplacedCount === 1 ? 'piece' : 'pieces'}.`);
  for (const item of draft.items) {
    if (item.sectorId && !legalSectorIdsByItem[item.id]?.includes(item.sectorId)) issues.push(`${item.component} cannot be built in that sector.`);
  }
  return {
    command,
    cost: draft.items.reduce((sum, item) => sum + constructionCostForSeat(own,item.component), 0),
    limit,
    placedCount: command.builds.length,
    unplacedCount,
    issues: [...new Set(issues)],
    legalSectorIdsByItem,
  };
}
