import {useConvex,useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {usePublicHistoryFeed,type HistoryFeed} from './usePublicHistoryFeed';
/** Spectator pagination never requests a credential or player-private endpoint. */
export function useSpectatorHistory(roomToken:string|null,resetRevision=0):HistoryFeed {
 const client=useConvex();
 const key=roomToken?`${roomToken}:${resetRevision}`:null;
 const latest=useQuery(api.eclipseRooms.getSpectatorHistory,roomToken?{roomToken,limit:40}:'skip');
 return usePublicHistoryFeed(key,latest,request=>roomToken?client.query(api.eclipseRooms.getSpectatorHistory,{roomToken,...request}):Promise.resolve(null));
}
