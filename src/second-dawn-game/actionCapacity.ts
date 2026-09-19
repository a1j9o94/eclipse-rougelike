import type {Action,PlayerView} from '../../shared/eclipse/types';
/** Read public per-kind budgets, preserving single-action legacy snapshots. */
export function remainingAction(view:PlayerView,action:Action):number {
 const progress=view.actionProgress;
 if(!progress||progress.owner!==view.viewerSeatId)return 0;
 return progress.budgets?.[action]??(progress.action===action?progress.remaining:0);
}
export function continuesAction(view:PlayerView,action:Action):boolean {
 const progress=view.actionProgress;
 return !!progress&&progress.owner===view.viewerSeatId&&(progress.action===action||progress.budgets?.[action]!==undefined);
}
