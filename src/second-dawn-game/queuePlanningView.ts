import type {PlayerView} from '../../shared/eclipse/types';

/** A local drafting view only. The server always validates against committed state. */
export function queuePlanningView(view:PlayerView,enabled:boolean):PlayerView{
 if(!enabled)return view;
 const projected=structuredClone(view);
 projected.phase='action';
 projected.activeSeatId=projected.viewerSeatId;
 projected.actionProgress=null;
 projected.pendingDecision=null;
 projected.waitingFor=null;
 const seat=projected.seats.find(item=>item.id===projected.viewerSeatId);
 if(seat)seat.passed=false;
 return projected;
}
