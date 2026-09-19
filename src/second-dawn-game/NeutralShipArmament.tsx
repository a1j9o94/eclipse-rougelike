import type {ShipStats} from '../../shared/eclipse/parts';
import EclipseDieFace from './EclipseDieFace';
import './neutralShipArmament.css';

/** Read-only depiction of the same weapon stats used for neutral combat. */
export default function NeutralShipArmament({weapons}:{weapons:ShipStats['weapons']}){
 return <div className="dg-neutral-armament" role="group" aria-label="Neutral ship weapons">
  {weapons.map((weapon,index)=><div className="dg-neutral-weapon" key={index} aria-label={`${weapon.dice} ${weapon.color} ${weapon.kind} dice, ${weapon.damage} damage per hit`}>
   <div className="dg-neutral-weapon-dice" aria-hidden="true">{Array.from({length:weapon.dice},(_,die)=><EclipseDieFace key={die} color={weapon.color} face={6} decorative/>)}</div>
   <div><strong>{weapon.kind==='missile'?'Missiles':'Cannons'}</strong><span>{weapon.dice} {weapon.dice===1?'die':'dice'} per ship</span><small>{weapon.damage} damage per hit</small></div>
  </div>)}
 </div>;
}
