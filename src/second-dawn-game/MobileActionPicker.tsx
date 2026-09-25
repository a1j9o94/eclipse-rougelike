import type{GameCommand}from'../../shared/eclipse/types';
import{StatIcon,type StatIconName}from'./ShipPartStats';
export interface MobileActionOption{type:GameCommand['type'];label:string;description:string;disabled:boolean}
const icons:Partial<Record<GameCommand['type'],StatIconName>>={explore:'discovery',influence:'influence',research:'computer',upgrade:'hull',build:'structure',move:'drive',colonize:'population',trade:'energy',pass:'initiative','end-action':'initiative','finish-upkeep':'energy','offer-diplomacy':'population','discard-reputation':'discovery'};
const ordinary=new Set<GameCommand['type']>(['explore','influence','research','upgrade','build','move']);
export default function MobileActionPicker({options,onSelect}:{options:MobileActionOption[];onSelect:(type:GameCommand['type'])=>void}){
 const card=(option:MobileActionOption)=><button key={option.type} disabled={option.disabled} onClick={()=>onSelect(option.type)}><StatIcon kind={icons[option.type]??'influence'}/><strong>{option.type==='trade'?'Trade':option.label}</strong><small>{option.description}</small></button>;
 return <div className="dg-mobile-action-groups" role="group" aria-label="Choose your action"><section role="group" aria-label="Ordinary actions"><h3>Actions</h3><div className="dg-mobile-action-picker">{options.filter(option=>ordinary.has(option.type)).map(card)}</div></section><section role="group" aria-label="Other options"><h3>Other options</h3><div className="dg-mobile-action-picker">{options.filter(option=>!ordinary.has(option.type)).map(card)}</div></section></div>;
}
