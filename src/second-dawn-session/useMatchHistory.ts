import {useConvex,useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import type {Id} from '../../convex/_generated/dataModel';
import {usePublicHistoryFeed,type HistoryFeed} from './usePublicHistoryFeed';
export type {HistoryFeed} from './usePublicHistoryFeed';
export function useMatchHistory(credential:string|null,matchId:Id<'eclipseMatchesV1'>|null,resetRevision=0):HistoryFeed {
 const client=useConvex();
 const key=credential&&matchId?`${credential}:${matchId}:${resetRevision}`:null;
 const latest=useQuery(api.eclipseMatches.getMatchHistory,credential&&matchId?{credential,matchId,limit:40}:'skip');
 return usePublicHistoryFeed(key,latest,request=>credential&&matchId?client.query(api.eclipseMatches.getMatchHistory,{credential,matchId,...request}):Promise.resolve(null));
}
