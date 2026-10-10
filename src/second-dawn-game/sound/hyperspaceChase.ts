import trackUrl from './assets/hyperspace-chase-120.mp3?url';

/** Original sampled jazz-funk arrangement: twenty bars at the approved 120 BPM. */
export const HYPERSPACE_CHASE_SECONDS=40;
const buffers=new WeakMap<BaseAudioContext,Promise<AudioBuffer>>();

/** Share pending/completed decoding; a failed request can be retried by a later gesture. */
export function loadHyperspaceChaseBuffer(context:BaseAudioContext):Promise<AudioBuffer>{
 const cached=buffers.get(context);if(cached)return cached;
 const pending=fetch(trackUrl).then(async response=>{
  if(!response.ok)throw new Error(`Music unavailable (${response.status})`);
  return context.decodeAudioData(await response.arrayBuffer());
 }).catch(error=>{buffers.delete(context);throw error;});
 buffers.set(context,pending);return pending;
}
