import type {FactionProfile} from '../../shared/eclipse/catalog';
import {isScifiCompatible,type RuleConfiguration} from '../../shared/eclipse/gameRules';

/** Saved profile IDs remain pinned; new Expanded choices use the compatible roster. */
export function expandedProfileForRules(rules:RuleConfiguration):FactionProfile {
 return isScifiCompatible({...rules,factionProfile:'scifi-v1'})?'scifi-v1':'expanded-v2';
}
export function factionProfileForRules(profile:FactionProfile,rules:RuleConfiguration):FactionProfile {
 return profile==='base'?'base':expandedProfileForRules(rules);
}
