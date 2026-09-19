import {v} from 'convex/values';
import {internalMutation} from './_generated/server';
import type {GameState} from '../shared/eclipse/types';
import {profileVersions} from '../shared/eclipse/catalog';
import {MINOR_SPECIES} from '../shared/eclipse/minorSpecies';
import {randomSeed,shuffle} from '../shared/eclipse/random';

/** Operator-only, room-scoped migration. Dry-run never changes the game. */
export const enableMinorSpecies = internalMutation({
 args:{roomToken:v.string(),apply:v.boolean()},
 handler:async(ctx,args)=>{
  const room=await ctx.db.query('eclipseRoomsV1').withIndex('by_token',q=>q.eq('roomToken',args.roomToken)).unique();
  if(!room?.matchId||room.status!=='playing')throw new Error('An active room is required.');
  const match=await ctx.db.get(room.matchId);if(!match||match.lifecycle||match.rollbackPendingId)throw new Error('Match unavailable or undo pending.');
  const state=JSON.parse(match.snapshotJson) as GameState;
  if(state.minorSpecies)return {enabled:true,changed:false,revision:state.revision,round:state.round,market:state.minorSpecies.market};
  if(state.phase==='finished'||state.revision!==match.revision||state.rulesVersion!==match.rulesVersion||state.catalogVersion!==match.catalogVersion)throw new Error('Invalid active snapshot.');
  const rows=await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision',q=>q.eq('matchId',match._id)).collect();
  if(rows.some(row=>!row.preSnapshotJson))throw new Error('Recover missing historical checkpoints before enabling this module.');
  // Separate deterministic stream: never perturb the existing decks or dice.
  let seed=0;for(const char of room.roomToken)seed=(Math.imul(seed,31)+char.charCodeAt(0))>>>0;
  const market=shuffle(randomSeed(seed),MINOR_SPECIES.map(tile=>tile.id)).items.slice(0,4);
  const upgrade=(snapshot:GameState):GameState=>({...snapshot,...profileVersions(snapshot.factionProfile??'base',snapshot.engine?.riftCannons,true),minorSpecies:{market:[...market]}});
  const next=upgrade(state);
  if(args.apply){
   for(const row of rows)await ctx.db.patch(row._id,{preSnapshotJson:JSON.stringify(upgrade(JSON.parse(row.preSnapshotJson!) as GameState))});
   await ctx.db.patch(match._id,{snapshotJson:JSON.stringify(next),rulesVersion:next.rulesVersion,catalogVersion:next.catalogVersion,updatedAt:Date.now()});
   await ctx.db.patch(room._id,{minorSpecies:true,updatedAt:Date.now()});
  }
  return {enabled:args.apply,changed:args.apply,revision:state.revision,round:state.round,phase:state.phase,checkpoints:rows.length,market};
 },
});
