import {SECTORS} from '../../shared/eclipse/sectors';
import {scoreInspection} from '../second-dawn-game/publicInspection';
import { expect, it } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { scoreSeat } from '../../shared/eclipse/rounds';
import { runningScore } from '../second-dawn-game/runningScore';
function fixture() { const s=createGame({seed:9,warpPortals:true,seats:[{id:'a',faction:'draco',controller:'human'},{id:'b',faction:'planta',controller:'ai'}]});s.privateSeats[0].reputation=[3,4];s.privateSeats[0].discoveriesKept=['x'];s.privateSeats[1].reputation=[5];s.privateSeats[1].discoveriesKept=['x','y'];s.sectors.find(x=>x.owner==='a')!.monolith=true;s.sectors.find(x=>x.owner==='a')!.portalVp=2;return s;}
it('shows the same public VP basis for own and opponent seats before final scoring',()=>{const s=fixture();const full=scoreSeat(s,s.seats[0]);expect(runningScore(getPlayerView(s,'a'),'a')).toEqual({breakdown:{...full,reputation:0,total:full.total-full.reputation},hiddenReputation:true,final:false});});
it('counts public opponent discovery VP and species without reading viewer private reputation',()=>{const s=fixture();const v=getPlayerView(s,'a');Object.defineProperty(v,'private',{get:()=>{throw new Error('Opponent score must not read private data');}});const score=runningScore(v,'b');const full=scoreSeat(s,s.seats[1]);expect(score.breakdown).toEqual({...full,reputation:0,total:full.total-5});expect(score.hiddenReputation).toBe(true);expect(score.breakdown.discoveries).toBe(4);});
it('honors frozen eliminated scores but omits opponent reputation until game ends',()=>{const s=fixture();const frozen=scoreSeat(s,s.seats[1]);s.engine!.scores=[frozen];s.seats[1].eliminated=true;s.sectors.filter(x=>x.owner==='b').forEach(x=>x.owner=null);const current=runningScore(getPlayerView(s,'a'),'b');expect(current.breakdown.total).toBe(frozen.total-frozen.reputation);expect(current.hiddenReputation).toBe(true);s.phase='finished';expect(runningScore(getPlayerView(s,'a'),'b')).toEqual({breakdown:frozen,hiddenReputation:false,final:true});});
it('uses published final scores exactly instead of recalculating a changed board',()=>{const s=fixture();const final=scoreSeat(s,s.seats[0]);s.engine!.scores=[final];s.phase='finished';s.privateSeats[0].reputation=[];expect(runningScore(getPlayerView(s,'a'),'a').breakdown).toEqual(final);});

it('filters frozen reputation at the server view boundary while preserving own and final score truth',()=>{
 const s=fixture();const a=scoreSeat(s,s.seats[0]);const b=scoreSeat(s,s.seats[1]);s.engine!.scores=[a,b];s.seats.forEach(seat=>seat.eliminated=true);
 const view=getPlayerView(s,'a');expect(view.scores?.find(x=>x.playerId==='a')).toEqual(a);expect(view.scores?.find(x=>x.playerId==='b')).toEqual({...b,reputation:0,total:b.total-b.reputation});
 expect(s.engine!.scores[1]).toEqual(b);
 s.phase='finished';expect(getPlayerView(s,'a').scores).toEqual([a,b]);
});

it('omits own frozen reputation from the public running score until final scoring',()=>{const s=fixture();const frozen=scoreSeat(s,s.seats[0]);s.engine!.scores=[frozen];s.seats[0].eliminated=true;const result=runningScore(getPlayerView(s,'a'),'a');expect(result.breakdown.reputation).toBe(0);expect(result.breakdown.total).toBe(frozen.total-frozen.reputation);expect(result.hiddenReputation).toBe(true);});


it('shows public exploration, development and artifact bonuses while concealing Ancient Might with private reputation',()=>{
 const s=fixture();s.ruleOptions={explorationRules:true,technologyVariant:true,discoveryVariant:true};
 s.lessRandom={explorationJokers:{a:true,b:true},outerPlacementsThisRound:{},discoverySupply:[],reputationSupply:[],reputationBySeat:{},reservedDiscoveries:{}};
 s.seats[0].developments=[{id:'quantum-labs',technologyId:'improved-hull'}];s.seats[0].discoveryBonuses=['artifacts','reputation'];
 const artifact=SECTORS.find(sector=>sector.artifacts>0)!;const sector=s.sectors.find(item=>item.owner==='a')!;sector.tileId=String(artifact.id);
 const expected=3+artifact.artifacts;
 for(const viewer of ['a','b']){
  const view=getPlayerView(s,viewer)!;expect(runningScore(view,'a').breakdown.variant).toBe(expected);
  const detail=scoreInspection(view,'a','variant');expect(detail.value).toBe(expected);expect(detail.explanation).toContain('Ancient Might');expect(detail.explanation).toContain('hidden');
 }
});

it('subtracts frozen private Ancient Might exactly once from both own and opponent public scores',()=>{
 const s=fixture();s.ruleOptions={discoveryVariant:true};s.seats[0].discoveryBonuses=['reputation'];s.seats[0].developments=[{id:'quantum-labs',technologyId:'improved-hull'}];
 const frozen=scoreSeat(s,s.seats[0]);s.engine!.scores=[frozen];s.seats[0].eliminated=true;
 for(const viewer of ['a','b']){
  const score=runningScore(getPlayerView(s,viewer)!,'a').breakdown;
  expect(score.variant).toBe(1);expect(score.total).toBe(frozen.total-frozen.reputation-2);
 }
 s.phase='finished';expect(runningScore(getPlayerView(s,'a')!,'a').breakdown).toEqual(frozen);
});
