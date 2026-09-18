import { useState } from 'react';
export interface ActivityBoundary { revision: number; lastSeenRevision: number | null }
export interface RecapSnapshot { key: string; baseline: number | null; throughRevision: number; open: boolean }
function capture(key: string, boundary: ActivityBoundary): RecapSnapshot {
 return { key, baseline: boundary.lastSeenRevision, throughRevision: boundary.revision, open: boundary.revision > (boundary.lastSeenRevision ?? 0) };
}
/** Capture once per visit, never mark read or replay history merely because a query updates. */
export function useActivityRecap(key: string | null, boundary: ActivityBoundary | null | undefined) {
 const [snapshot,setSnapshot]=useState<RecapSnapshot|null>(null);
 if(key && boundary && snapshot?.key!==key) setSnapshot(capture(key,boundary));
 if(!key && snapshot) setSnapshot(null);
 return {
  snapshot: snapshot?.key===key?snapshot:null,
  dismiss:()=>setSnapshot(current=>current?.key===key?{...current,open:false}:current),
  resume:(next:ActivityBoundary)=>{if(key)setSnapshot(capture(key,next));},
 };
}
