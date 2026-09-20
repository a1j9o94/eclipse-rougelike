import {expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {submitWithUpkeepRetry} from '../second-dawn-game/upkeepSubmission';
import type {MatchSubmission} from '../../convex/eclipseMatches';
function fixture(){const state=createGame({seed:4,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'human'}]});state.phase='upkeep';return getPlayerView(state,'a')!;}
const stale:MatchSubmission={ok:false,error:{code:'STALE_REVISION',message:'stale',field:null}};
it('retries the same upkeep request after only another player changes and remembers its latest revision',async()=>{
 const view=fixture(),next=structuredClone(view);next.revision++;next.seats[1].resources.money++;
 const submit=vi.fn<(_:import('../../shared/eclipse/types').CommandRequest)=>Promise<MatchSubmission>>().mockResolvedValueOnce(stale).mockResolvedValueOnce({ok:true,receipt:{commandId:'id',revision:2,eventCount:1},duplicate:false});const remember=vi.fn();
 const result=await submitWithUpkeepRetry(view,{commandId:'id',expectedRevision:0,command:{type:'finish-upkeep'}},submit,async()=>next,remember);
 expect(result.ok).toBe(true);expect(submit).toHaveBeenLastCalledWith({commandId:'id',expectedRevision:1,command:{type:'finish-upkeep'}});expect(remember).toHaveBeenLastCalledWith({commandId:'id',expectedRevision:1,command:{type:'finish-upkeep'}});
});
it('does not retry when the player’s own economy changed',async()=>{
 const view=fixture(),next=structuredClone(view);next.revision++;next.seats[0].resources.money++;
 const submit=vi.fn(async()=>stale);
 expect(await submitWithUpkeepRetry(view,{commandId:'id',expectedRevision:0,command:{type:'finish-upkeep'}},submit,async()=>next,()=>{})).toEqual(stale);expect(submit).toHaveBeenCalledTimes(1);
});
it('stops retrying at the round boundary or after a bounded number of races',async()=>{
 const view=fixture(),next=structuredClone(view);next.phase='action';next.revision++;
 const submit=vi.fn(async()=>stale),request={commandId:'id',expectedRevision:0,command:{type:'finish-upkeep' as const}};
 await submitWithUpkeepRetry(view,request,submit,async()=>next,()=>{});expect(submit).toHaveBeenCalledTimes(1);
 submit.mockClear();let revision=0;await submitWithUpkeepRetry(view,request,submit,async()=>({...view,revision:++revision}),()=>{});expect(submit).toHaveBeenCalledTimes(4);
});
