import type {FactionProfile} from '../../shared/eclipse/catalog';
import {isScifiCompatible,type RuleConfiguration} from '../../shared/eclipse/gameRules';

/** Saved profile IDs remain pinned; new Expanded choices use the compatible roster. */
export function expandedProfileForRules(rules:RuleConfiguration):FactionProfile {
 return isScifiCompatible({...rules,factionProfile:'scifi-v1'})?'scifi-v1':'expanded-v2';
}
export function factionProfileForRules(profile:FactionProfile,rules:RuleConfiguration,previousRules:RuleConfiguration):FactionProfile {
 const compatibleProfile=expandedProfileForRules(rules);
 if(profile==='scifi-v1')return compatibleProfile;
 if(profile==='expanded-v2'&&expandedProfileForRules(previousRules)!==compatibleProfile)return compatibleProfile;
 return profile;
}

export function factionProfileLabel(profile:FactionProfile):string {
 switch(profile){
  case 'base':return 'Base game factions';
  case 'official-v1':return 'Official factions';
  case 'expanded-v1':return 'Expanded civilizations · legacy roster';
  default:return 'Expanded civilizations';
 }
}
