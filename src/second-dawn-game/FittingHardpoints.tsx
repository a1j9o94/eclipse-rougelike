import {useState} from 'react';
import { blueprintDefinition, type ShipBlueprint } from '../../shared/eclipse/blueprints';
import type { FactionId } from '../../shared/eclipse/catalog';
import { getShipPart } from '../../shared/eclipse/parts';
import ShipPartStats from './ShipPartStats';

interface Props {
 faction:FactionId;
 blueprint:ShipBlueprint;
 draft:ShipBlueprint;
 selectedSlot:number|null;
 onSelect:(slot:number)=>void;
 blockedSlots?:ReadonlyMap<number,string>;
 disabled?:boolean;
}
/** The same hardpoints select an ordinary replacement or a discovered-part destination. */
export default function FittingHardpoints({faction,blueprint,draft,selectedSlot,onSelect,blockedSlots,disabled=false}:Props){
 const [inspectedSlot,setInspectedSlot]=useState<number|null>(null);
 const printed=blueprintDefinition(faction,blueprint.shipType).preprinted;
 return <div className="dg-blueprints" role="group" aria-label="Blueprint hardpoints">
  {draft.parts.map((part,index)=>{
   const effective=part??printed[index];
   const previous=blueprint.parts[index]??printed[index];
   const changed=part!==blueprint.parts[index];
   const blocker=blockedSlots?.get(index);
   return <div key={index} className="dg-fitting-hardpoint">
    <button className={`dg-blueprint-slot${selectedSlot===index?' is-selected':''}${part?' has-overlay':''}`} type="button" aria-label={`Slot ${index+1}: ${effective?getShipPart(effective).name:'Empty slot'}`} aria-pressed={selectedSlot===index} disabled={disabled} aria-disabled={disabled||!!blocker} aria-expanded={blocker?inspectedSlot===index:undefined} aria-describedby={blocker&&inspectedSlot===index?`fitting-${blueprint.shipType}-slot-${index}`:undefined} onFocus={()=>{if(blocker)setInspectedSlot(index);}} onClick={()=>{if(blocker)setInspectedSlot(index);else{setInspectedSlot(null);onSelect(index);}}}>
     <span className="dg-slot-title">{selectedSlot===index&&<span aria-hidden="true">✓</span>}<b>{String(index+1).padStart(2,'0')}</b> {changed?'Planned':part?'Installed':printed[index]?'Printed':'Open'}</span>
     {effective?<><strong>{getShipPart(effective).name}</strong><ShipPartStats partId={effective}/></>:<strong className="dg-slot-empty">Open hardpoint</strong>}
     {changed&&<small>{previous?getShipPart(previous).name:'Empty'} → {effective?getShipPart(effective).name:'Empty'}</small>}
    </button>
    {blocker&&inspectedSlot===index&&<small role="status" id={`fitting-${blueprint.shipType}-slot-${index}`} className="dg-hardpoint-blocker">{blocker}</small>}
   </div>;
  })}
 </div>;
}
