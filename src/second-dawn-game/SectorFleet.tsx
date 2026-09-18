import type {PlayerView,Ship} from '../../shared/eclipse/types';
import {BASE_FACTIONS} from '../../shared/eclipse/catalog';
import ShipSilhouette from './ShipSilhouette';
import {NeutralShipSilhouette} from './BattleOverview';
import './sectorFleet.css';
import FactionSymbol from './FactionSymbol';
import {FACTION_COLORS} from './factionColors';
interface Props {view:PlayerView;sectorId:string;onInspect?:()=>void}
const names={interceptor:'Interceptor',cruiser:'Cruiser',dreadnought:'Dreadnought',starbase:'Starbase',ancient:'Ancient',guardian:'Guardian',gcds:'GCDS'};
export default function SectorFleet({view,sectorId,onInspect}:Props){
 const groups: {owner:string;type:Ship['type'];ships:Ship[]}[]=[];
 for(const ship of view.ships.filter(s=>s.sectorId===sectorId)){
  const group=groups.find(g=>g.owner===ship.owner&&g.type===ship.type);
  if(group)group.ships.push(ship);else groups.push({owner:ship.owner,type:ship.type,ships:[ship]});
 }
 if(!groups.length)return <p className="dg-empty-fleet">No ships in this sector.</p>;
 return <div className="dg-sector-fleet">{groups.map(group=>{
  const faction=BASE_FACTIONS.find(f=>f.id===view.seats.find(s=>s.id===group.owner)?.faction);
  const owner=faction?.name ?? (group.type==='ancient'?'Ancients':group.type==='guardian'?'Guardians':'Galactic Center Defense System');
  const name=names[group.type],count=group.ships.length;
  return <div className="dg-fleet-group" style={{borderColor:faction?FACTION_COLORS[faction.color]:undefined,color:faction?FACTION_COLORS[faction.color]:undefined}} role="group" aria-label={`${owner} · ${count} ${name}${count>1?'s':''}`} key={`${group.owner}-${group.type}`}>
   <div className="dg-fleet-group-main"><span className="dg-fleet-figure">{group.type==='ancient'||group.type==='guardian'||group.type==='gcds'?<NeutralShipSilhouette type={group.type}/>:<ShipSilhouette type={group.type}/>}</span><div><strong>{name}{count>1?'s':''}</strong><small>{faction&&<FactionSymbol faction={faction.id}/>} {owner}</small></div><b className="dg-fleet-count" aria-label={`${count} ships`}>×{count}</b></div>
   {onInspect&&<button onClick={onInspect}>Inspect capabilities</button>}
   {group.ships.some(s=>s.damage>0)&&<details><summary>Damage details</summary>{group.ships.map((ship,index)=><p key={ship.id}>{name} {index+1} · {ship.damage} damage</p>)}</details>}
  </div>;
 })}</div>;
}
