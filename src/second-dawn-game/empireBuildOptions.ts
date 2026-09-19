import {remainingAction,continuesAction} from './actionCapacity';
import type { BlueprintShipType } from '../../shared/eclipse/blueprints';
import { BASE_COMPONENTS, getFaction, STANDARD_CONSTRUCTION_COSTS } from '../../shared/eclipse/catalog';
import { fundingOptions } from '../../shared/eclipse/funding';
import {constructionCostForSeat} from '../../shared/eclipse/minorSpecies';
import type { PlayerView } from '../../shared/eclipse/types';
import { addBuildItem, analyzeBuildOrder, emptyBuildOrder, placeBuildItem, type BuildOrderDraft } from './buildPlanning';

export interface EmpireBuildOption {
  shipType: BlueprintShipType;
  /** The additional ship's price; affordability includes the entire existing order. */
  cost: number;
  disabledReason: string | null;
  requiresConversion: boolean;
}
const SHIP_TYPES: readonly BlueprintShipType[] = ['interceptor', 'cruiser', 'dreadnought', 'starbase'];

/** Read-only shortcut estimates. Real placement, funding and submission stay in Build. */
export function empireBuildOptions(view: PlayerView, draft: BuildOrderDraft = emptyBuildOrder()): EmpireBuildOption[] {
  const own = view.seats.find(seat => seat.id === view.viewerSeatId);
  const progress = view.actionProgress;
  const turnReason = !own ? 'Player is unavailable.'
    : own.eliminated ? 'This civilization has been eliminated.'
    : view.pendingDecision || view.waitingFor ? 'Resolve the pending decision first.'
    : view.phase !== 'action' || view.activeSeatId !== own.id ? 'Wait for your action turn.'
    : progress && (!continuesAction(view,'build')) ? 'Finish your current action first.'
    : progress && remainingAction(view,'build') <= 0 ? 'No Build activations remain.'
    : !progress && own.influenceOnTrack < 1 ? 'No influence discs remain.'
    : null;
  return SHIP_TYPES.map(shipType => {
    const result: EmpireBuildOption = { shipType, cost: own?constructionCostForSeat(own,shipType):STANDARD_CONSTRUCTION_COSTS[shipType], disabledReason: turnReason, requiresConversion: false };
    if (!own || turnReason) return result;
    if(getFaction(own.faction).componentSupply?.[shipType]===0)return {...result,disabledReason:`${getFaction(own.faction).name} does not build ${shipType[0].toUpperCase()+shipType.slice(1)}s.`};
    const unavailable = (disabledReason: string): EmpireBuildOption => ({ ...result, disabledReason });
    if (!view.sectors.some(sector => sector.owner === own.id)) return unavailable('Control a sector before building ships.');
    let sample = addBuildItem(draft, shipType);
    const analysis = analyzeBuildOrder(view, sample);
    if (sample.items.length > analysis.limit) return unavailable(`This order exceeds the ${analysis.limit} piece Build limit.`);
    const technologies = Object.values(own.technologies).flat();
    for (const item of sample.items) {
      if (['starbase', 'orbital', 'monolith'].includes(item.component) && !technologies.includes(item.component)) {
        return unavailable(`Research ${item.component} first.`);
      }
      if (item.component !== 'orbital' && item.component !== 'monolith') {
        const deployed = view.ships.filter(ship => ship.owner === own.id && ship.type === item.component).length;
        const ordered = sample.items.filter(other => other.component === item.component).length;
        if (deployed + ordered > (getFaction(own.faction).componentSupply?.[item.component]??BASE_COMPONENTS.perColor[item.component])) return unavailable(`No unbuilt ${item.component}s remain in supply for this order.`);
      }
    }
    // Place only a temporary copy to price the complete order. Existing placements
    // stay fixed; later structure samples see reservations from earlier samples.
    for (const item of sample.items) {
      const legal = analyzeBuildOrder(view, sample).legalSectorIdsByItem[item.id] ?? [];
      if (item.sectorId !== null) {
        if (!legal.includes(item.sectorId)) return unavailable(`${item.component} cannot be built in its selected sector.`);
      } else {
        if (!legal.length) return unavailable(`No controlled sector can hold another ${item.component}.`);
        sample = placeBuildItem(sample, item.id, legal[0]);
      }
    }
    const complete = analyzeBuildOrder(view, sample);
    if (complete.issues.length) return unavailable(complete.issues[0]);
    if (complete.cost <= own.resources.materials) return result;
    if (!fundingOptions(view, complete.command).length) return unavailable('Not enough materials or resources to convert for the full order.');
    return { ...result, requiresConversion: true };
  });
}
