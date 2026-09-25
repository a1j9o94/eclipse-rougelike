import{StatIcon,type StatIconName}from'./ShipPartStats';
import type {ReactNode} from 'react';
export type MobileDestination='Galaxy'|'Empire'|'Players'|'Activity';
const destinations:{name:MobileDestination;icon:StatIconName}[]=[{name:'Galaxy',icon:'portal'},{name:'Empire',icon:'structure'},{name:'Players',icon:'population'},{name:'Activity',icon:'initiative'}];
export default function MobileNavigation({selected,onSelect,onActions,onTurn,afterPass,pending,pendingLabel,onDecision,actionLabel,onBack,onDetails,onConfirm,onEndAction}:{selected:MobileDestination;onSelect:(destination:MobileDestination)=>void;onActions?:()=>void;onTurn?:{label:string;disabled:boolean;submit:()=>void};afterPass?:ReactNode;pending:boolean;pendingLabel?:string;onDecision:()=>void;actionLabel?:string;onBack:()=>void;onDetails?:()=>void;onConfirm?:{label:string;disabled:boolean;submit:()=>void};onEndAction?:()=>void}){
 return <footer className="dg-mobile-footer">
  {pending&&<button className="dg-mobile-pending" onClick={onDecision}>{pendingLabel??'Return to decision'}</button>}
  {actionLabel?<nav className="dg-mobile-action-nav" aria-label="Current action"><button onClick={onBack}>Back</button><span>{actionLabel}</span>{onConfirm?<button className="sd-primary" disabled={onConfirm.disabled} onClick={onConfirm.submit}>{onConfirm.label}</button>:onEndAction?<button onClick={onEndAction}>End action</button>:onDetails&&<button onClick={onDetails}>Details</button>}</nav>:<>
   {(onActions||onTurn||afterPass)&&<div className="dg-mobile-turn-controls">{onActions&&<button className="dg-mobile-choose-action" onClick={onActions}><StatIcon kind="influence"/>Choose action</button>}{onTurn&&<button className="dg-mobile-turn-button" disabled={onTurn.disabled} onClick={onTurn.submit}>{onTurn.label}</button>}{afterPass&&<div className="dg-mobile-passed-control">{afterPass}</div>}</div>}
   <nav className="dg-mobile-navigation" aria-label="Mobile game navigation">{destinations.map(destination=><button key={destination.name} aria-pressed={selected===destination.name} onClick={()=>onSelect(destination.name)}><StatIcon kind={destination.icon}/><span>{destination.name}</span></button>)}</nav>
  </>}
 </footer>;
}
