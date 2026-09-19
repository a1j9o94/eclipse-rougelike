import {seatColor} from './factionColors';
import type {PlayerView,Ship} from '../../shared/eclipse/types';
import {getFaction} from '../../shared/eclipse/catalog';
import ShipSilhouette from './ShipSilhouette';
import {NeutralShipSilhouette} from './BattleOverview';
import './sectorFleet.css';
import FactionSymbol from './FactionSymbol';
interface Props {view:PlayerView;sectorId:string;onInspect?:()=>void}
const names={interceptor:'Interceptor',cruiser:'Cruiser',dreadnought:'Dreadnought',starbase:'Starbase',ancient:'Ancient',guardian:'Guardian',gcds:'GCDS'};
export default function SectorFleet({view,sectorId,onInspect}:Props){
 const groups: {owner:string;type:Ship['type'];ships:Ship[]}[]=[];
 for(const ship of view.ships.filter(s=>s.sectorId===sectorId)){
  const group=groups.find(g=>g.owner===ship.owner&&g.type===ship.type);
  if(group)group.ships.push(ship);else groups.push({owner:ship.owner,type:ship.type,ships:[ship]});
 }
 if(!groups.length)return <p className="dg-empty-fleet">No ships in this sector.</p>;
 return <div className="dg-sector-fleet">{onInspect&&<button onClick={onInspect}>Inspect fleet</button>}{groups.map(group=>{
  const seat=view.seats.find(s=>s.id===group.owner);const faction=seat?getFaction(seat.faction):undefined;
  const owner=faction?.name ?? (group.type==='ancient'?'Ancients':group.type==='guardian'?'Guardians':'Galactic Center Defense System');
  const name=names[group.type],count=group.ships.length;
  return <div className="dg-fleet-group" style={{borderColor:seat?seatColor(seat):undefined,color:seat?seatColor(seat):undefined}} role="group" aria-label={`${owner} · ${count} ${name}${count>1?'s':''}`} key={`${group.owner}-${group.type}`}>
   <div className="dg-fleet-group-main"><span className="dg-fleet-figure">{group.type==='ancient'||group.type==='guardian'||group.type==='gcds'?<NeutralShipSilhouette type={group.type}/>:<ShipSilhouette type={group.type} faction={faction?.id}/>}</span><div><strong>{name}{count>1?'s':''}</strong><small>{faction&&<FactionSymbol faction={faction.id}/>} {owner}</small></div><b className="dg-fleet-count" aria-label={`${count} ships`}>×{count}</b></div>
   {group.ships.some(s=>s.damage>0)&&<details><summary>Damage details</summary>{group.ships.map((ship,index)=><p key={ship.id}>{name} {index+1} · {ship.damage} damage</p>)}</details>}
  </div>;
 })}</div>;
}
