import {useId} from 'react';
import {allowsRiftCannons,gameRules,MIN_GAME_ROUNDS,MAX_GAME_ROUNDS,type GameRuleOptions,type RuleConfiguration} from '../../shared/eclipse/gameRules';
import RulesModePicker from './RulesModePicker';
import './gameRuleSettings.css';
export interface GameRuleSettingsValue extends RuleConfiguration {warpPortals:boolean;riftCannons?:boolean}
interface Props {value:GameRuleSettingsValue;disabled:boolean;onChange:(value:GameRuleSettingsValue)=>void}
const options:readonly {key:Exclude<keyof GameRuleOptions,'roundLimit'>;label:string;description:string}[]=[
 {key:'openTechnology',label:'All technologies available',description:'Put the entire selected technology supply in the market from round one.'},
 {key:'publicDiscoveries',label:'Choose from all discovery tiles',description:'Earn a discovery, then choose from the remaining public supply instead of drawing a hidden tile.'},
 {key:'publicReputation',label:'Public reputation choices',description:'Spend reputation draws on visible 1-VP tiles and upgrades. Everyone can see reputation scores.'},
 {key:'explorationRules',label:'Less Random exploration',description:'Choose from multiple sectors, use one redraw Joker, and use all outer tiles with per-round placement limits.'},
 {key:'combatJokers',label:'Combat Jokers',description:'Five Jokers per player to reroll or use the fixed dice table. Excludes Rift Cannons.'},
 {key:'technologyVariant',label:'Less Random technology tiles',description:'Use revised technology inventory and the two developments. Independent of opening the whole market; excludes Rift Cannons.'},
 {key:'discoveryVariant',label:'Less Random discovery tiles',description:'Use revised missiles, resource choices and endgame bonuses. Independent of public discovery choices.'},
 {key:'factionVariant',label:'Less Random faction rules',description:'Use variant trade rates and require each Terran player to ban an unchosen alien faction.'},
 {key:'passOrderTurnOrder',label:'Next round follows pass order',description:'Players take turns next round in the order they first passed this round. The first player to pass still gains 2 money.'},
];
export default function GameRuleSettings({value,disabled,onChange}:Props){
 const id=`custom-rules-${useId().replace(/[^a-zA-Z0-9_-]/g,'')}`,rules=gameRules(value),defaults=gameRules({rulesMode:value.rulesMode});
 const customized=Object.entries(rules).some(([key,setting])=>defaults[key as keyof typeof defaults]!==setting)||value.warpPortals!==(value.rulesMode!=='less-random-v1')||(value.riftCannons??value.rulesMode!=='less-random-v1')!==(value.rulesMode!=='less-random-v1');
 const update=(ruleOptions:GameRuleOptions)=>{const next={...value,ruleOptions:{...value.ruleOptions,...ruleOptions}};onChange({...next,...(!allowsRiftCannons(next)?{riftCannons:false}:{})});};
 return <section className="dg-custom-rules" aria-label="Game rules">
  <RulesModePicker value={value.rulesMode??'standard'} disabled={disabled} onChange={rulesMode=>onChange({rulesMode,ruleOptions:undefined,warpPortals:rulesMode==='standard',riftCannons:rulesMode==='standard'})}/>
  <div className="dg-round-setting"><label>Rounds<select aria-label="Rounds" disabled={disabled} value={rules.roundLimit} onChange={event=>update({roundLimit:Number(event.target.value)})}>{Array.from({length:MAX_GAME_ROUNDS-MIN_GAME_ROUNDS+1},(_,index)=>index+MIN_GAME_ROUNDS).map(round=><option key={round} value={round}>{round} {round===1?'round':'rounds'}</option>)}</select></label><p>{customized?'Custom rules':'Preset rules'}<small>Choose any game length and mix the options below.</small></p></div>
  <fieldset disabled={disabled}><legend>Individual rule options</legend><div className="dg-rule-toggles">{options.map(option=><label key={option.key}><input type="checkbox" checked={rules[option.key]} aria-labelledby={`${id}-${option.key}-label`} aria-describedby={`${id}-${option.key}-description`} onChange={event=>update({[option.key]:event.target.checked})}/><span><strong id={`${id}-${option.key}-label`}>{option.label}</strong><small id={`${id}-${option.key}-description`}>{option.description}</small></span></label>)}</div></fieldset>
  <fieldset disabled={disabled}><legend>Optional components</legend><div className="dg-rule-toggles"><label><input type="checkbox" checked={value.warpPortals} onChange={event=>onChange({...value,ruleOptions:value.ruleOptions??{},warpPortals:event.target.checked})}/><span>Base-game warp portals</span></label><label><input type="checkbox" checked={allowsRiftCannons(value)&&(value.riftCannons??value.rulesMode!=='less-random-v1')} disabled={!allowsRiftCannons(value)} onChange={event=>onChange({...value,ruleOptions:value.ruleOptions??{},riftCannons:event.target.checked})}/><span>Rift Cannons{!allowsRiftCannons(value)&&<small>Turn off Combat Jokers and Less Random technology tiles to enable.</small>}</span></label></div></fieldset>
 </section>;
}
