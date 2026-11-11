import type { GameCommand, PlayerView } from '../../../shared/eclipse/types';
import { needsUpkeep } from '../upkeepParticipation';
export type BoardWorkspaceKind =
  | 'Encounter'
  | 'Activity'
  | 'Upkeep'
  | 'Empire'
  | 'Recruitment'
  | 'Trade'
  | 'Scoring'
  | 'Diplomacy'
  | 'Players'
  | 'Blueprints'
  | 'Research'
  | 'Galaxy';
export interface BoardWorkspaceState {
  view: PlayerView;
  screen: string;
  action: GameCommand['type'];
  compact: boolean;
  encounterId?: string;
  empireMapSeat: string | null;
  spatialDecision: boolean;
  retreatMapActive: boolean;
  browsingUpkeep: boolean;
}
/** Priority is explicit: a battle or required upkeep precedes the selected workspace. */
export function boardWorkspaceMode({
  view,
  screen,
  action,
  compact,
  encounterId,
  empireMapSeat,
  spatialDecision,
  retreatMapActive,
  browsingUpkeep,
}: BoardWorkspaceState): BoardWorkspaceKind {
  if (
    encounterId &&
    (screen === 'Galaxy' || screen === 'Decision') &&
    !empireMapSeat &&
    !spatialDecision &&
    !retreatMapActive
  )
    return 'Encounter';
  if (compact && screen === 'Activity') return 'Activity';
  if (
    needsUpkeep(view) &&
    !view.pendingDecision &&
    screen === 'Galaxy' &&
    !browsingUpkeep &&
    action !== 'colonize'
  )
    return 'Upkeep';
  if (compact && screen === 'Empire') return 'Empire';
  if (screen === 'Recruitment') return 'Recruitment';
  if (screen === 'Trade') return 'Trade';
  if (screen === 'Scoring') return 'Scoring';
  if (screen === 'Diplomacy') return 'Diplomacy';
  if (screen === 'Players') return 'Players';
  if (screen === 'Blueprints') return 'Blueprints';
  if (screen === 'Research') return 'Research';
  return 'Galaxy';
}
