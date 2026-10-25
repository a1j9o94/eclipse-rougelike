import type{GameCommand}from'../../shared/eclipse/types';
import ActionIcon from './ActionIcon';
export interface MobileActionOption{type:GameCommand['type'];label:string;description:string;disabled:boolean}
const ordinary=new Set<GameCommand['type']>(['explore','influence','research','upgrade','build','move']);
export default function MobileActionPicker({options,onSelect}:{options:MobileActionOption[];onSelect:(type:GameCommand['type'])=>void}){
 const card=(option:MobileActionOption)=><button key={option.type} disabled={option.disabled} onClick={()=>onSelect(option.type)}><ActionIcon kind={option.type}/><strong>{option.type==='trade'?'Trade':option.label}</strong><small>{option.description}</small></button>;
 return <div className="dg-mobile-action-groups" role="group" aria-label="Choose your action"><section role="group" aria-label="Ordinary actions"><h3>Actions</h3><div className="dg-mobile-action-picker">{options.filter(option=>ordinary.has(option.type)).map(card)}</div></section><section role="group" aria-label="Other options"><h3>Other options</h3><div className="dg-mobile-action-picker">{options.filter(option=>!ordinary.has(option.type)).map(card)}</div></section></div>;
}
