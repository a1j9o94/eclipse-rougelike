import type {FactionProfile} from '../../shared/eclipse/catalog';
import type {RuleConfiguration} from '../../shared/eclipse/gameRules';
import {expandedProfileForRules} from './factionCollection';

export default function FactionProfilePicker({value,onChange,disabled=false,rules={}}:{value:FactionProfile;onChange:(profile:FactionProfile)=>void;disabled?:boolean;rules?:RuleConfiguration}){
 const expanded=expandedProfileForRules(rules);
 const legacy=value==='expanded-v1'||(value==='expanded-v2'&&expanded==='scifi-v1');
 const detail=legacy
  ?`This existing room uses the earlier expanded roster (${value==='expanded-v1'?16:18} civilizations). Select to include all ${expanded==='scifi-v1'?25:18}.`
  :expanded==='scifi-v1'?'All 25 civilizations, including the seven book-inspired factions':'18 civilizations compatible with these rules, including Exiles and Lyra';
 return <fieldset className="dg-faction-profile"><legend>Faction collection</legend><div>{([{id:expanded,name:'Expanded',detail},{id:'base',name:'Base',detail:'Original paired civilization boards'}] as const).map(profile=><button type="button" key={profile.id} aria-pressed={profile.id==='base'?value==='base':value!=='base'} disabled={disabled} onClick={()=>onChange(profile.id)}><strong>{profile.name}</strong><small>{profile.detail}</small></button>)}</div><p>The seven book-inspired factions are included with Standard rules.</p></fieldset>;
}
