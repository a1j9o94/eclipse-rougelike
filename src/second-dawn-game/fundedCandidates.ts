import {tradeRates} from '../../shared/eclipse/catalog';
import {fundingOptions} from '../../shared/eclipse/funding';
import {legalCommands} from '../../shared/eclipse/legal';
import type {GameCommand,PlayerView} from '../../shared/eclipse/types';
export interface FundedCandidate {command:Extract<GameCommand,{type:'trade-and-act'}>;label:string;description:string}
/** Discover ordinary legal purchases using a budget ceiling, then fund each from the real public balances. */
export function fundedCandidates(view:PlayerView):FundedCandidate[]{
 const seat=view.seats.find(s=>s.id===view.viewerSeatId);
 if(!seat||view.phase!=='action'||view.pendingDecision||view.activeSeatId!==seat.id)return [];
 const r=seat.resources;
 const gain=(from: keyof typeof r,to:keyof typeof r)=>Math.ceil(r[from]*Math.max(0,...tradeRates(seat.faction,from,to).map(rate=>rate.output/rate.input)));
 const budgetView:PlayerView={...view,seats:view.seats.map(s=>s.id!==seat.id?s:{...s,resources:{...r,science:r.science+gain('money','science')+gain('materials','science'),materials:r.materials+gain('money','materials')+gain('science','materials')}})};
 return legalCommands(budgetView).flatMap(candidate=>{
  if(candidate.command.type!=='research'&&candidate.command.type!=='build')return [];
  const option=fundingOptions(view,candidate.command)[0];
  return option?[{command:option.command,label:candidate.label,description:'Convert resources to complete this purchase.'}]:[];
 });
}
