import {useEffect,useRef,type ReactNode} from 'react';
import {getFaction} from '../../shared/eclipse/catalog';
import type {PlayerView} from '../../shared/eclipse/types';
import {TECHNOLOGIES} from '../../shared/eclipse/technologies';
import ShipSilhouette from './ShipSilhouette';
import {NeutralShipSilhouette} from './BattleOverview';
import './fleetInspection.css';
import {publicShipProfile,hitFaceDescription} from './fleetInspection';
export default function FleetInspection({view,sectorId,selectedShipIds,onClose,onDiplomacy,diplomacy}:{view:PlayerView;sectorId:string;selectedShipIds:readonly string[];onClose:()=>void;diplomacy?:ReactNode;onDiplomacy?:(seatId:string)=>void}){
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{const prior=document.activeElement instanceof HTMLElement?document.activeElement:null;panel.current?.focus();return()=>prior?.focus();},[]);
 const sector=view.sectors.find(s=>s.id===sectorId);
 const profiles=view.ships.filter(s=>s.sectorId===sectorId).flatMap(s=>{const p=publicShipProfile(view,s.id);return p?[p]:[];});
 const selected=selectedShipIds.flatMap(id=>{const p=publicShipProfile(view,id);return p&&p.ship.owner===view.viewerSeatId?[p]:[];});
 const owners=[...new Set(profiles.map(p=>p.ship.owner))];
 return <div className="dg-inspection-backdrop"><section ref={panel} tabIndex={-1} className="dg-fleet-inspection" role="dialog" aria-modal="true" aria-label={`Fleet inspection · sector ${sector?.tileId??'no longer present'}`} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}if(e.key==='Tab'){const buttons=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],summary')??[]);if(!buttons.length){e.preventDefault();return;}const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}>
  <header><div><small>PUBLIC FLEET INTELLIGENCE</small><h2>Sector {sector?.tileId??'unavailable'}</h2><p>Your action plan stays saved while you inspect.</p></div><button onClick={onClose}>Return to plan</button></header>
  {!profiles.length&&<p>No ships remain at this location.</p>}
  <div className="dg-inspection-ships">{profiles.map(p=><article key={p.ship.id}><div className="dg-inspection-identity">{p.ship.type==='ancient'||p.ship.type==='guardian'||p.ship.type==='gcds'?<NeutralShipSilhouette type={p.ship.type}/>:<ShipSilhouette type={p.ship.type}/>}<h3>{p.name}<small>{p.ownerName}</small></h3></div><p>{p.remainingHp} / {p.maximumHp} HP · {p.ship.damage} damage</p><dl><div><dt>Initiative</dt><dd>{p.stats.initiative}</dd></div><div><dt>Computer</dt><dd>+{p.stats.computer}</dd></div><div><dt>Shield</dt><dd>−{p.stats.shield}</dd></div><div><dt>Range</dt><dd>{p.stats.movement}</dd></div></dl><p>{p.stats.weapons.length?p.stats.weapons.map(w=>`${w.dice} × ${w.damage} damage ${w.kind}`).join(' · '):'No weapons'}</p></article>)}</div>
  {selected.length>0?<section aria-label="Fleet comparison"><h3>Compare with your selected fleet</h3><p>Natural 1 always misses; natural 6 always hits. Defender wins initiative ties. Missiles fire before cannons. Compare initiative within each firing phase.</p>{profiles.filter(p=>p.ship.owner!==view.viewerSeatId).map(target=><div className="dg-inspection-comparison" key={target.ship.id}><strong>Against {target.name} · {target.ownerName}</strong>{selected.map(source=><p key={source.ship.id}>{source.name}: {hitFaceDescription(source.stats.computer,target.stats.shield)}; enemy: {hitFaceDescription(target.stats.computer,source.stats.shield)}. {source.stats.initiative>target.stats.initiative?'Your group has higher initiative.':source.stats.initiative<target.stats.initiative?'Enemy group has higher initiative.':'Same initiative: defender fires first.'}</p>)}</div>)}</section>:<p>Select your moving ships to compare their actual installed capabilities here.</p>}
  {owners.map(id=>{const seat=view.seats.find(s=>s.id===id);if(!seat)return null;const own=view.seats.find(s=>s.id===view.viewerSeatId)!;return <section key={id} className="dg-inspection-civilization"><h3>{getFaction(seat.faction).name}</h3><p>{id===own.id?'Your civilization':own.ambassadors.includes(id)?'Diplomatic partner':'No diplomatic relationship'}{seat.traitor?' · Traitor':''}</p><details><summary>Public technologies</summary><p>{Object.values(seat.technologies).flat().map(tech=>TECHNOLOGIES.find(t=>t.id===tech)?.name??tech).join(' · ')||'None'}</p></details>{id!==own.id&&onDiplomacy&&<button onClick={()=>onDiplomacy(id)}>View diplomatic options</button>}</section>;})}
 {diplomacy}
 </section></div>;
}
