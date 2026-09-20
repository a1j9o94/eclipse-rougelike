import type {MatchSubmission} from '../../convex/eclipseMatches';
import type {CommandRequest,PlayerView} from '../../shared/eclipse/types';
function localUpkeep(view:PlayerView):string{
 const own=view.seats.find(seat=>seat.id===view.viewerSeatId);
 const sectors=view.sectors.filter(sector=>sector.owner===view.viewerSeatId);
 return JSON.stringify({round:view.round,phase:view.phase,viewer:view.viewerSeatId,own,pending:view.pendingDecision,done:view.upkeepDone?.includes(view.viewerSeatId)??false,sectors,ships:view.ships.filter(ship=>sectors.some(sector=>sector.id===ship.sectorId))});
}
/** Retry only a rejected revision race with unchanged local upkeep inputs. Never replay a successful command. */
export async function submitWithUpkeepRetry(view:PlayerView,initial:CommandRequest,submit:(request:CommandRequest)=>Promise<MatchSubmission>,refresh:()=>Promise<PlayerView|null>,remember:(request:CommandRequest)=>void):Promise<MatchSubmission>{
 let request=initial;
 const eligible=view.phase==='upkeep'&&['finish-upkeep','colonize','trade','convert-colony-ship','resolve'].includes(initial.command.type);
 const fingerprint=localUpkeep(view);
 for(let attempt=0;;attempt++){
  remember(request);
  const result=await submit(request);
  if(result.ok||result.error.code!=='STALE_REVISION'||!eligible||attempt>=3)return result;
  const fresh=await refresh();
  if(!fresh||fresh.revision<=request.expectedRevision||localUpkeep(fresh)!==fingerprint)return result;
  request={...request,expectedRevision:fresh.revision};
 }
}
