import {seatColor} from './factionColors';
import {useEffect,useRef,type CSSProperties,type ReactNode} from 'react';
import {getFaction} from '../../shared/eclipse/catalog';
import {publicBlueprint} from '../../shared/eclipse/legal';
import type {PlayerView} from '../../shared/eclipse/types';
import {TECHNOLOGIES} from '../../shared/eclipse/technologies';
import ShipSilhouette from './ShipSilhouette';
import FactionSymbol from './FactionSymbol';
import {NeutralShipSilhouette} from './BattleOverview';
import BlueprintLoadout,{ShipCapabilities} from './BlueprintLoadout';
import {StatIcon} from './ShipPartStats';
import {publicShipProfile,hitFaceDescription,type PublicShipProfile} from './fleetInspectionModel';
import './fleetInspection.css';

function groupShips(profiles:PublicShipProfile[]):PublicShipProfile[][]{
 const groups=new Map<string,PublicShipProfile[]>();
 for(const profile of profiles){const key=`${profile.ship.owner}:${profile.ship.type}`;groups.set(key,[...(groups.get(key)??[]),profile]);}
 return [...groups.values()];
}
function FleetBlueprintCard({view,ships}:{view:PlayerView;ships:PublicShipProfile[]}){
 const p=ships[0],seat=view.seats.find(seat=>seat.id===p.ship.owner);
 const blueprint=seat?.blueprints.find(b=>b.shipType===p.ship.type);
 const neutral=p.ship.type==='ancient'||p.ship.type==='guardian'||p.ship.type==='gcds';
 return <article className="dg-inspection-blueprint" style={{'--fleet-color':seat?seatColor(seat):'#cab88d'} as CSSProperties} aria-label={`${p.ownerName} ${p.name} fleet`}>
  <header className="dg-inspection-identity">
   <div className="dg-inspection-silhouette">{neutral?<NeutralShipSilhouette type={p.ship.type as 'ancient'|'guardian'|'gcds'}/>:<ShipSilhouette type={p.ship.type as 'interceptor'|'cruiser'|'dreadnought'|'starbase'} faction={seat?.faction}/>}</div>
   <div><span className="dg-inspection-owner">{seat&&<FactionSymbol faction={seat.faction}/>}<span>{p.ownerName}</span></span><h3>{p.name}</h3><small>{neutral?'Standard defender blueprint':'Public blueprint'}</small></div><strong className="dg-inspection-count" aria-label={`${ships.length} ships`}>×{ships.length}</strong>
  </header>
  <ShipCapabilities stats={p.stats} neutral={neutral}/>
  {seat&&blueprint&&<BlueprintLoadout faction={seat.faction} blueprint={publicBlueprint(blueprint)}/>}
  <div className="dg-inspection-condition" role="group" aria-label={`${p.name} ship condition`}><small>Ships at this location</small><div>{ships.map((ship,index)=><span className={`dg-ship-condition${ship.ship.damage?' dg-ship-damaged':''}`} key={ship.ship.id} role="img" aria-label={`Ship ${index+1}: ${ship.remainingHp} of ${ship.maximumHp} hit points, ${ship.ship.damage?`${ship.ship.damage} damage`:'undamaged'}`}>
   <span className="dg-condition-index">{index+1}</span><span className="dg-hp-pips" aria-hidden="true">{Array.from({length:ship.maximumHp},(_,i)=><i key={i} className={i<ship.remainingHp?'':'dg-hp-lost'}>{i<ship.remainingHp?'':'×'}</i>)}</span><b>{ship.remainingHp}/{ship.maximumHp}</b>{ship.ship.damage>0&&<small>{ship.ship.damage} damage</small>}
  </span>)}</div></div>
 </article>;
}
function HitFaces({label,computer,shield}:{label:string;computer:number;shield:number}){
 const description=hitFaceDescription(computer,shield);
 return <div className="dg-hit-preview"><span>{label}</span><div className="dg-hit-faces" role="img" aria-label={`${label}: ${description}`} title={`${description}. Natural 1 misses; natural 6 hits.`}>{[1,2,3,4,5,6].map(face=><span key={face} className={face===6||face!==1&&face+computer-shield>=6?'dg-face-hit':''} aria-hidden="true">{face}</span>)}</div><small>{description}</small></div>;
}
export default function FleetInspection({view,sectorId,selectedShipIds,onClose,onDiplomacy,diplomacy}:{view:PlayerView;sectorId:string;selectedShipIds:readonly string[];onClose:()=>void;diplomacy?:ReactNode;onDiplomacy?:(seatId:string)=>void}){
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{const prior=document.activeElement instanceof HTMLElement?document.activeElement:null;panel.current?.focus();return()=>prior?.focus();},[]);
 const sector=view.sectors.find(s=>s.id===sectorId);
 const profiles=view.ships.filter(s=>s.sectorId===sectorId).flatMap(s=>{const p=publicShipProfile(view,s.id);return p?[p]:[];});
 const selected=[...new Set(selectedShipIds)].flatMap(id=>{const p=publicShipProfile(view,id);return p&&p.ship.owner===view.viewerSeatId?[p]:[];});
 const groups=groupShips(profiles),selectedGroups=groupShips(selected);
 const owners=[...new Set(profiles.map(p=>p.ship.owner))];
 return <div className="dg-inspection-backdrop"><section ref={panel} tabIndex={-1} className={`dg-fleet-inspection${groups.length<=1&&!selected.length?' dg-inspection-single':''}`} role="dialog" aria-modal="true" aria-label={`Fleet inspection · sector ${sector?.tileId??'no longer present'}`} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}if(e.key==='Tab'){const buttons=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],summary')??[]);if(!buttons.length){e.preventDefault();return;}const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}>
  <header className="dg-inspection-heading"><div><small>PUBLIC FLEET INTELLIGENCE</small><h2>Sector {sector?.tileId??'unavailable'}</h2><p>Your action plan stays saved while you inspect.</p></div><button onClick={onClose}>Return to plan</button></header>
  {!profiles.length&&<p>No ships remain at this location.</p>}
  <div className="dg-inspection-ships">{groups.map(ships=><FleetBlueprintCard key={`${ships[0].ship.owner}:${ships[0].ship.type}`} view={view} ships={ships}/>)}</div>
  {selected.length>0?<>
   <section aria-label="Your selected fleet" className="dg-inspection-selected"><h3>Your selected fleet</h3><div className="dg-inspection-ships">{selectedGroups.map(ships=><FleetBlueprintCard key={ships[0].ship.type} view={view} ships={ships}/>)}</div></section>
   <section aria-label="Fleet comparison"><h3>Compare with your selected fleet</h3><div className="dg-inspection-matchups">{groups.filter(group=>group[0].ship.owner!==view.viewerSeatId).flatMap(([target])=>selectedGroups.map(([source])=><div className="dg-inspection-comparison" key={`${target.ship.owner}:${target.ship.type}:${source.ship.type}`}>
    <header><strong>{source.name} <small>yours</small></strong><span>vs</span><strong>{target.name}<small>{target.ownerName}</small></strong></header>
    <div className="dg-hit-directions"><HitFaces label="Your attack" computer={source.stats.computer} shield={target.stats.shield}/><HitFaces label="Enemy attack" computer={target.stats.computer} shield={source.stats.shield}/></div>
    <div className="dg-initiative-comparison"><StatIcon kind="initiative"/><b>{source.stats.initiative} : {target.stats.initiative}</b><span>{source.stats.initiative>target.stats.initiative?'Your initiative is higher':source.stats.initiative<target.stats.initiative?'Enemy initiative is higher':'Tie: defender fires first'}</span></div>
   </div>))}</div><details className="dg-comparison-rules"><summary>How to read this comparison</summary><p>Highlighted faces hit. Natural 1 always misses; natural 6 always hits. Initiative compares firing groups within the same phase: missiles fire before cannons. Defender wins initiative ties. Each ship uses the installed weapons shown on its blueprint.</p></details></section>
  </>:<p className="dg-inspection-hint">Select your moving ships to compare their blueprints and attack rolls here.</p>}
  <div className="dg-inspection-civilizations">{owners.map(id=>{const seat=view.seats.find(s=>s.id===id);if(!seat)return null;const own=view.seats.find(s=>s.id===view.viewerSeatId)!;return <section key={id} className="dg-inspection-civilization"><h3><FactionSymbol faction={seat.faction}/>{getFaction(seat.faction).name}</h3><p>{id===own.id?'Your civilization':own.ambassadors.includes(id)?'Diplomatic partner':'No diplomatic relationship'}{seat.traitor?' · Traitor':''}</p><details><summary>Public technologies</summary><p>{Object.values(seat.technologies).flat().map(tech=>TECHNOLOGIES.find(t=>t.id===tech)?.name??tech).join(' · ')||'None'}</p></details>{id!==own.id&&onDiplomacy&&<button onClick={()=>onDiplomacy(id)}>View diplomatic options</button>}</section>;})}</div>
  {diplomacy}
 </section></div>;
}
