import type {GameCommand,PlayerView} from '../../shared/eclipse/types';
import {TECHNOLOGIES} from '../../shared/eclipse/technologies';
import {shipClassName} from './shipLabels';

/** Only change timing gates in the viewer's already-filtered view. No hidden state is reconstructed. */
export function nextTurnPlanningView(view:PlayerView):PlayerView {
 return {...view,activeSeatId:view.viewerSeatId,actionProgress:undefined,pendingDecision:null,waitingFor:null};
}

export function canPlanNextTurn(view:PlayerView):boolean {
 return view.phase==='action'&&view.activeSeatId!==view.viewerSeatId&&!view.pendingDecision&&!!view.seats.find(seat=>seat.id===view.viewerSeatId&&!seat.eliminated);
}

/** A saved plan can be reviewed using only its public selections. */
export function queuedActionSummary(command:GameCommand,view:PlayerView):string {
 const action=command.type==='trade-and-act'?command.action:command;
 const sector=(id:string)=>view.sectors.find(item=>item.id===id)?.tileId??id;
 const faction=view.seats.find(seat=>seat.id===view.viewerSeatId)?.faction;
 switch(action.type){
  case 'build':return action.builds.map(build=>`${build.component[0].toUpperCase()+build.component.slice(1)} in sector ${sector(build.sectorId)}`).join(' · ');
  case 'move':return action.moves.map(move=>{const ship=view.ships.find(ship=>ship.id===move.shipId);return `${ship?shipClassName(ship.type,faction):'Ship'} to sector ${sector(move.path.at(-1)??'')}`;}).join(' · ');
  case 'research':return `${TECHNOLOGIES.find(technology=>technology.id===action.tileId)?.name??action.tileId} · ${action.track} track`;
  case 'upgrade':return action.blueprints.map(blueprint=>shipClassName(blueprint.shipType,faction)).join(' · ');
  case 'explore':return `Frontier ${action.position.q}, ${action.position.r}`;
  case 'colonize':return `${action.placements.length} planets · sectors ${[...new Set(action.placements.map(placement=>sector(placement.sectorId)))].join(', ')}`;
  default:return '';
 }
}
