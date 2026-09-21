import type {RulesMode} from './types';

/** Optional overrides preserve historical preset-only saves. */
export interface GameRuleOptions {
 roundLimit?:number;
 openTechnology?:boolean;
 publicDiscoveries?:boolean;
 publicReputation?:boolean;
 explorationRules?:boolean;
 combatJokers?:boolean;
 technologyVariant?:boolean;
 discoveryVariant?:boolean;
 factionVariant?:boolean;
}
export interface RuleConfiguration {rulesMode?:RulesMode;ruleOptions?:GameRuleOptions}
export type ResolvedGameRules=Required<GameRuleOptions>;
export const MIN_GAME_ROUNDS=1;
export const MAX_GAME_ROUNDS=20;
export function gameRules(config:RuleConfiguration):ResolvedGameRules {
 const variant=config.rulesMode==='less-random-v1',options=config.ruleOptions;
 return {roundLimit:options?.roundLimit??(variant?10:8),openTechnology:options?.openTechnology??variant,publicDiscoveries:options?.publicDiscoveries??variant,publicReputation:options?.publicReputation??variant,explorationRules:options?.explorationRules??variant,combatJokers:options?.combatJokers??variant,technologyVariant:options?.technologyVariant??variant,discoveryVariant:options?.discoveryVariant??variant,factionVariant:options?.factionVariant??variant};
}
export function gameRoundLimit(config:RuleConfiguration):number{return gameRules(config).roundLimit;}
export function factionRulesMode(config:RuleConfiguration):RulesMode{return gameRules(config).factionVariant?'less-random-v1':'standard';}
export function validRuleOptions(options:GameRuleOptions|undefined):boolean {
 if(!options)return true;
 if(options.roundLimit!==undefined&&(!Number.isSafeInteger(options.roundLimit)||options.roundLimit<MIN_GAME_ROUNDS||options.roundLimit>MAX_GAME_ROUNDS))return false;
 return Object.entries(options).every(([key,value])=>key==='roundLimit'||(['openTechnology','publicDiscoveries','publicReputation','explorationRules','combatJokers','technologyVariant','discoveryVariant','factionVariant'].includes(key)&&typeof value==='boolean'));
}
/** Joker tables and the variant technology inventory exclude the Rift Cannon module. */
export function allowsRiftCannons(config:RuleConfiguration):boolean {const rules=gameRules(config);return !rules.combatJokers&&!rules.technologyVariant;}
