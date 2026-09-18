import type{GameCommand}from'../../shared/eclipse/types';
import{StatIcon,type StatIconName}from'./ShipPartStats';
export interface MobileActionOption{type:GameCommand['type'];label:string;description:string;disabled:boolean}
const icons:Partial<Record<GameCommand['type'],StatIconName>>={explore:'discovery',influence:'influence',research:'computer',upgrade:'hull',build:'structure',move:'drive',colonize:'population',trade:'energy',pass:'initiative','end-action':'initiative','finish-upkeep':'energy','offer-diplomacy':'population','discard-reputation':'discovery'};
export default function MobileActionPicker({options,onSelect}:{options:MobileActionOption[];onSelect:(type:GameCommand['type'])=>void}){
 return <div className="dg-mobile-action-picker" role="group" aria-label="Choose your action">{options.map(option=><button key={option.type} disabled={option.disabled} onClick={()=>onSelect(option.type)}><StatIcon kind={icons[option.type]??'influence'}/><strong>{option.label}</strong><small>{option.description}</small></button>)}</div>;
}
