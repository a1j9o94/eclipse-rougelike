import type {ReactNode} from 'react';
import {blueprintDefinition,deriveBlueprintStats,type ShipBlueprint} from '../../shared/eclipse/blueprints';
import type {FactionId} from '../../shared/eclipse/catalog';
import {getShipPart} from '../../shared/eclipse/parts';
import ShipSilhouette from './ShipSilhouette';
import {ShipCapabilities} from './BlueprintLoadout';
import {describeWeapons,describeShipPart} from './itemDescriptions';

export default function FittingSummary({faction,blueprint,draft,selectedSlot,allowance,onRestore,children}:{faction:FactionId;blueprint:ShipBlueprint;draft:ShipBlueprint;selectedSlot:number|null;allowance?:{used:number;limit:number};onRestore?:()=>void;children?:ReactNode}){
 const current=deriveBlueprintStats(faction,blueprint),stats=deriveBlueprintStats(faction,draft);
 const selected=selectedSlot===null?null:draft.parts[selectedSlot]??blueprintDefinition(faction,blueprint.shipType).preprinted[selectedSlot];
 const changes=[['Damage to destroy',current.hull+1,stats.hull+1],['Movement',current.movement,stats.movement],['Initiative',current.initiative,stats.initiative],['Computer',current.computer,stats.computer],['Shield',current.shield,stats.shield],['Weapons',describeWeapons(current),describeWeapons(stats)]].filter(([,before,after])=>before!==after);
 return <section className="dg-fitting-summary" aria-label="Selected ship and hardpoint">
  <div className="dg-fitting-summary-top"><ShipSilhouette type={blueprint.shipType} faction={faction}/><strong className="dg-fitting-class">{faction==='exiles'&&blueprint.shipType==='starbase'?'Orbital':blueprint.shipType}</strong><details className={`dg-fitting-energy ${stats.energyProduction<stats.energyConsumption?'dg-danger':''}`}><summary>{stats.energyProduction-stats.energyConsumption} energy available</summary><span>{stats.energyProduction} generated / {stats.energyConsumption} used</span></details></div>
  <div className="dg-fitting-capabilities"><details className="dg-fitting-stat-inspect"><summary aria-label="Inspect ship capabilities"><ShipCapabilities stats={stats} showEnergy={false} showWeapons omitZero/></summary><dl className="dg-fitting-stat-help" aria-label="Ship capability details"><dt>Damage to destroy</dt><dd>{stats.hull+1}</dd><dt>Initiative</dt><dd>{stats.initiative}</dd><dt>Movement per activation</dt><dd>{stats.movement}</dd><dt>Computer bonus</dt><dd>+{stats.computer}</dd><dt>Enemy attack penalty</dt><dd>−{stats.shield}</dd><dt>Weapons</dt><dd>{describeWeapons(stats)}</dd></dl></details>{changes.length>0&&<div className="dg-fitting-changes" aria-label="Changed capabilities">{changes.map(([label,before,after])=><span key={label}>{label} {before} → {after}</span>)}</div>}</div>
  {selectedSlot!==null&&<div className="dg-fitting-selected-slot"><strong>Slot {selectedSlot+1} · {selected?getShipPart(selected).name:'Empty'}</strong>{allowance&&<small aria-label={`${allowance.used} of ${allowance.limit} installations`}>{allowance.used}/{allowance.limit} parts</small>}{onRestore&&<button type="button" onClick={onRestore} disabled={draft.parts[selectedSlot]===blueprint.parts[selectedSlot]}>Restore slot {selectedSlot+1}</button>}<span className="dg-fitting-effect" data-testid={`slot-effect-${selectedSlot+1}`}>{selected?describeShipPart(selected):'Open hardpoint'}</span></div>}
  {children}
 </section>;
}
