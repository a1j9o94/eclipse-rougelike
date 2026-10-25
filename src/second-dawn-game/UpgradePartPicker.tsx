import {useState} from 'react';
import {getShipPart,type ShipPartId} from '../../shared/eclipse/parts';
import type {ShipBlueprint} from '../../shared/eclipse/blueprints';
import type {FittingInventory,FittingGroup,FittingPart} from './fittingPlanning';
import ShipPartStats from './ShipPartStats';
import {describeShipPart} from './itemDescriptions';
import './upgradePartPicker.css';
interface Props {
 blueprint:ShipBlueprint;draft:ShipBlueprint;slot:number;printed:ShipPartId|null;
 inventory:FittingInventory;disabled:boolean;
 onSelect:(part:ShipPartId|null)=>void;
}
export default function UpgradePartPicker({blueprint,draft,slot,printed,inventory,disabled,onSelect}:Props){
 const [group,setGroup]=useState<FittingGroup|'All parts'>('All parts');
 const selected=draft.parts[slot],effective=selected??printed,original=blueprint.parts[slot];
 const ancientOriginal=original&&getShipPart(original).access.kind==='ancient'?original:null;
 const canInstall=(entry:FittingPart)=>entry.available||selected===entry.id||(getShipPart(entry.id).access.kind==='ancient'&&original===entry.id);
 const available=inventory.groups.map(g=>({...g,parts:g.parts.filter(canInstall)})).filter(g=>g.parts.length);
 const unavailable=inventory.parts.filter(entry=>!canInstall(entry)&&getShipPart(entry.id).placement==='grid');
 const className=blueprint.shipType[0].toUpperCase()+blueprint.shipType.slice(1);
 return <section className="dg-part-picker dg-part-picker-inline" aria-label={`${className} · slot ${slot+1}`}>
 <header className="dg-part-picker-heading"><div><span className="dg-yard-eyebrow">{className} · slot {slot+1}</span><h2>Choose a replacement</h2></div></header>
 <section className="dg-part-picker-current" aria-label="Current slot component"><div><small>In your draft</small><strong>{effective?getShipPart(effective).name:'Empty slot'}</strong></div>{effective&&<ShipPartStats partId={effective}/>}</section>
 <nav className="dg-part-picker-filters" aria-label="Component functions">{(['All parts',...available.map(g=>g.name)] as const).map(name=><button key={name} type="button" aria-pressed={group===name} onClick={()=>setGroup(name)}>{name}</button>)}</nav>
 <div className="dg-part-picker-scroll" tabIndex={0} aria-label="Replacement components">
 {ancientOriginal&&<p className="dg-part-picker-warning">Applying this replacement permanently discards {getShipPart(ancientOriginal).name}.</p>}
 {inventory.storedAncients.length>0&&<p className="dg-ancient-stock">Stored Ancient copies: {inventory.storedAncients.map(part=>`${getShipPart(part.id).name} ×${part.count}`).join(' · ')}.</p>}
 {available.filter(g=>group==='All parts'||g.name===group).map(g=><section className="dg-part-group" key={g.name} aria-label={g.name}><h3>{g.name}</h3><div className="dg-parts-tray-grid">{g.parts.map(entry=>{const part=getShipPart(entry.id);return <button key={part.id} type="button" className={`dg-part-choice${effective===part.id?' is-selected':''}`} aria-label={`Install ${part.name} in slot ${slot+1}`} aria-pressed={effective===part.id} disabled={disabled} onClick={()=>effective!==part.id&&onSelect(part.id)}><strong className="dg-part-choice-title">{effective===part.id&&<span aria-hidden="true">✓ </span>}{part.name}</strong><ShipPartStats partId={part.id}/><small>{describeShipPart(part.id)}</small>{Number.isFinite(entry.availableCopies)&&<span className="dg-part-picker-stock">{original===part.id?'Original installation · restore draft':`${entry.availableCopies} stored ${entry.availableCopies===1?'copy':'copies'}`}</span>}</button>;})}</div></section>)}
 <button type="button" className="dg-part-choice dg-part-picker-restore" aria-label={`Reveal printed component in slot ${slot+1}`} disabled={disabled||selected===null} onClick={()=>onSelect(null)}><strong>{printed?'Restore original component':'Leave slot empty'}</strong><span>{printed?getShipPart(printed).name:'Remove the added component'}</span>{printed&&<ShipPartStats partId={printed}/>}</button>
 {unavailable.length>0&&<details className="dg-unavailable-parts"><summary>Unavailable components ({unavailable.length})</summary><div>{unavailable.map(entry=><button key={entry.id} type="button" aria-disabled="true" aria-label={`${getShipPart(entry.id).name} blocked: ${entry.reason}`}><strong>{getShipPart(entry.id).name}</strong><small>{entry.reason}</small></button>)}</div></details>}
 </div>

 </section>;
}
