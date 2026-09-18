import type {PublicHistoryEntry} from '../../shared/eclipse/history';
import type {GameEvent,PlayerView} from '../../shared/eclipse/types';
export interface RecentCombatPlayback {revision:number;volleys:NonNullable<GameEvent['combatVolley']>[]}
/** Keep the last resolved volley through roll/retreat/aftermath decisions, not just the newest journal row. */
export function latestCombatPlayback(view:PlayerView,entries:readonly PublicHistoryEntry[]):RecentCombatPlayback|null{
 for(const entry of [...entries].sort((a,b)=>b.revision-a.revision)){
  const recentRound=entry.round===view.round||(!view.battle&&entry.round===view.round-1);
  if(entry.revision>view.revision||!recentRound)continue;
  const volleys=(entry.combatVolleys??(entry.combatVolley?[entry.combatVolley]:[])).filter(volley=>{
   if(!view.battle)return true;
   if(view.battle.id)return volley.battleId===view.battle.id;
   return volley.sectorId===view.battle.sectorId&&[view.battle.attacker,view.battle.defender].includes(volley.attacker);
  });
  if(volleys.length)return {revision:entry.revision,volleys};
 }
 return null;
}
