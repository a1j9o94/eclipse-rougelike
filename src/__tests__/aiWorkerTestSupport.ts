import type {convexTest} from 'convex-test';
import {internal} from '../../convex/_generated/api';
/** Run only zero-delay worker stages already dispatched, never advance a paced future turn. */
export async function finishDispatchedAi(t:ReturnType<typeof convexTest>):Promise<void> {
 const jobs=await t.run(ctx=>ctx.db.query('eclipseAiJobsV1').collect());
 for(const job of jobs){
  if(job.status==='scheduled'&&job.timeoutToken) await t.mutation(internal.eclipseMatches.runAi,{matchId:job.matchId,expectedRevision:job.expectedRevision});
  const claimed=await t.run(ctx=>ctx.db.get(job._id));
  if(claimed?.status==='thinking'&&claimed.leaseToken)await t.action(internal.eclipseMatches.thinkAi,{matchId:claimed.matchId,expectedRevision:claimed.expectedRevision,leaseToken:claimed.leaseToken});
 }
}
