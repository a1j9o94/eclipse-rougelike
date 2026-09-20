import type {ReactNode} from 'react';
import {blueprintDefinition,effectiveBlueprintParts,type ShipBlueprint} from '../../shared/eclipse/blueprints';
import type {FactionId} from '../../shared/eclipse/catalog';
import {getShipPart,type ShipStats,type ShipPartId} from '../../shared/eclipse/parts';
import ShipPartStats,{StatBadge} from './ShipPartStats';
import './blueprintLoadout.css';
import NeutralShipArmament from './NeutralShipArmament';

/** Read-only effective modules, including printed parts revealed below empty overlays. */
export default function BlueprintLoadout({faction,blueprint}:{faction:FactionId;blueprint:ShipBlueprint}){
 const name=blueprint.shipType[0].toUpperCase()+blueprint.shipType.slice(1);
 const parts=effectiveBlueprintParts(faction,blueprint),permanent=blueprintDefinition(faction,blueprint.shipType).permanent;
 return <div className="dg-readonly-loadout" role="group" aria-label={`${name} installed loadout`}>
  <div className="dg-readonly-hardpoints">{parts.map((id,index)=><div className={`dg-readonly-part${blueprint.parts[index]?' dg-readonly-overlay':''}${id?'':' dg-readonly-empty'}`} key={index}>
   <div className="dg-readonly-slot"><span>{index+1}</span><small>{blueprint.parts[index]?'Installed':id?'Printed':'Open'}</small></div>
   <strong>{id?getShipPart(id).name:'Empty slot'}</strong>{id?<ShipPartStats partId={id}/>:<span className="dg-empty-hardpoint" aria-hidden="true">＋</span>}
  </div>)}</div>
  {blueprint.outsideParts.length>0&&<div className="dg-outside-loadout" role="group" aria-label="Outside-grid parts">{blueprint.outsideParts.map((id,index)=><OutsideGridModule key={`${id}:${index}`} partId={id}/>)}</div>}
  {(permanent.initiative||permanent.computer||permanent.energyProduction)>0&&<div className="dg-intrinsic-capabilities"><small>Built into blueprint</small>
   {permanent.initiative>0&&<StatBadge icon="initiative" value={`+${permanent.initiative}`} label="initiative" explanation="Permanent blueprint initiative, included in the total above."/>}
   {permanent.computer>0&&<StatBadge icon="computer" value={`+${permanent.computer}`} label="computer" explanation="Permanent blueprint computer, included in the total above."/>}
   {permanent.energyProduction>0&&<StatBadge icon="energy" value={`+${permanent.energyProduction}`} label="energy" explanation="Permanent blueprint energy production, included in the total above."/>}
  </div>}
 </div>;
}
export function OutsideGridModule({partId,children}:{partId:ShipPartId;children?:ReactNode}){
 const part=getShipPart(partId);
 return <div className="dg-readonly-part dg-readonly-overlay dg-outside-module" role="group" aria-label={`${part.name} outside-grid module`}>
  <div className="dg-outside-module-identity"><small>Outside grid · No slot used</small><strong>{part.name}</strong></div>
  <ShipPartStats partId={partId}/>
  {children}
 </div>;
}
export function ShipCapabilities({stats,neutral=false,showEnergy=true,showWeapons=false}:{stats:ShipStats;neutral?:boolean;showEnergy?:boolean;showWeapons?:boolean}){
 const weapons=stats.weapons.reduce<ShipStats['weapons']>((groups,weapon)=>{
  const match=groups.find(group=>group.kind===weapon.kind&&group.color===weapon.color&&group.damage===weapon.damage);
  if(match)match.dice+=weapon.dice;else groups.push({...weapon});
  return groups;
 },[]);
 return <div className="dg-ship-capabilities" role="group" aria-label="Blueprint totals">
  <StatBadge icon="hull" value={stats.hull+1} label="hit points" explanation="Maximum damage capacity per undamaged ship, including its base hit point."/>
  <StatBadge icon="initiative" value={stats.initiative} label="initiative" explanation="Higher initiative fires first within each phase; defender wins ties."/>
  <StatBadge icon="computer" value={`+${stats.computer}`} label="computer" explanation="Add to attack rolls. Natural 1 always misses; natural 6 always hits."/>
  <StatBadge icon="shield" value={`−${stats.shield}`} label="shield" explanation="Subtract from enemy attack rolls against this ship."/>
  <StatBadge icon="drive" value={stats.movement} label="movement" explanation="Sectors moved per activation. Zero means immobile."/>
  {!neutral&&showEnergy&&<StatBadge icon="energy" value={`${stats.energyConsumption}/${stats.energyProduction}`} label="energy used" explanation={`${stats.energyConsumption} energy used of ${stats.energyProduction} produced.`}/>}
  {showWeapons&&weapons.map((weapon,index)=><StatBadge key={index} icon={weapon.kind} value={`${weapon.dice} × ${weapon.color==='magenta'?'0–3':weapon.damage}`} label={`${weapon.color} ${weapon.kind}`} explanation={weapon.color==='magenta'?'Rift dice ignore computers and shields and may damage your own ships.':`${weapon.dice} ${weapon.color} dice, ${weapon.damage} damage per hit. ${weapon.kind==='missile'?'Fire once at battle start.':'Fire each combat round.'}`} color={({yellow:'#f0d477',orange:'#ffb076',blue:'#91c9ff',red:'#ff9391',magenta:'#f094dc'})[weapon.color]}/>)}
  {showWeapons&&weapons.length===0&&<span className="dg-unarmed-summary">Unarmed</span>}
  {neutral&&<NeutralShipArmament weapons={stats.weapons}/>}
 </div>;
}
