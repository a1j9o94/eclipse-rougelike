import { useState } from 'react';
import { deriveBlueprintStats, effectiveBlueprintParts, type ShipBlueprint } from '../../shared/eclipse/blueprints';
import { getShipPart, isShipPartId, type ShipPartId } from '../../shared/eclipse/parts';
import type { LegalCommandCandidate } from '../../shared/eclipse/legal';
import type { Blueprint, GameCommand, PendingDecision, PlayerView, ShipType } from '../../shared/eclipse/types';
import ShipPartStats from './ShipPartStats';
import ShipSilhouette from './ShipSilhouette';
import { describeWeapons } from './itemDescriptions';
import './ancientPartDecision.css';
export interface AncientPartDecisionProps {
  view: PlayerView;
  decision: Extract<PendingDecision, { kind: 'ancient-part' }>;
  candidates: readonly LegalCommandCandidate[];
  disabled: boolean;
  onSubmit: (command: GameCommand) => void;
}
function typedBlueprint(blueprint: Blueprint): ShipBlueprint {
  const part = (id: string): ShipPartId => { if (!isShipPartId(id)) throw new Error('Part is absent from base catalog.'); return id; };
  return {shipType:blueprint.shipType,parts:blueprint.parts.map(id=>id===null?null:part(id)),outsideParts:(blueprint.outsideParts??[]).map(part)};
}
export default function AncientPartDecision({ view, decision, candidates, disabled, onSubmit }: AncientPartDecisionProps) {
  const seat = view.seats.find(candidate=>candidate.id===decision.owner);
  const [shipType,setShipType] = useState<ShipType>(seat?.blueprints[0]?.shipType??'interceptor');
  const [selected,setSelected] = useState<number|null>(null);
  if(!seat || !isShipPartId(decision.partId)) return <p role="alert">Reconnect to restore this ship part and its blueprints.</p>;
  const part = getShipPart(decision.partId);
  const current = seat.blueprints.find(blueprint=>blueprint.shipType===shipType);
  if(!current) return <p role="alert">This ship class has no blueprint.</p>;
  const blueprint = typedBlueprint(current);
  const installed = effectiveBlueprintParts(seat.faction, blueprint);
  const options = candidates.flatMap((candidate,index)=> {
    const command=candidate.command;
    if(command.type!=='resolve'||command.decisionId!==decision.id||command.choice.kind!=='ancient-part')return [];
    return [{index,command,blueprint:command.choice.blueprint}];
  });
  const storage = options.find(option=>option.blueprint===null);
  const installs = options.filter(option=>option.blueprint?.shipType===shipType);
  const slotOption = (slot:number) => installs.find(option=>option.blueprint?.parts[slot]===part.id && current.parts[slot]!==part.id);
  const chosen = options.find(option=>option.index===selected);
  const draft = chosen?.blueprint ? typedBlueprint(chosen.blueprint) : null;
  const changedSlot = draft?.parts.findIndex((id,index)=>id!==blueprint.parts[index])??-1;
  const previousPart = changedSlot>=0?installed[changedSlot]:null;
  const before = deriveBlueprintStats(seat.faction,blueprint);
  const after = draft?deriveBlueprintStats(seat.faction,draft):null;
  const stats = after ? [
    ['Energy available',before.energyProduction-before.energyConsumption,after.energyProduction-after.energyConsumption],
    ['Movement',before.movement,after.movement],['Initiative',before.initiative,after.initiative],
    ['Computer',before.computer,after.computer],['Shield',before.shield,after.shield],
    ['Damage to destroy',before.hull+1,after.hull+1],['Weapons (dice × damage)',describeWeapons(before),describeWeapons(after)],
  ] : [];
  const chooseClass = (type:ShipType) => {setShipType(type);setSelected(null);};
  return <section className="dg-ancient-install">
    <header className="dg-ancient-heading"><div><span className="dg-yard-eyebrow">Discovered ship part</span><h2>{part.name}</h2></div><ShipPartStats partId={part.id}/></header>
    <p>Choose a ship, then select the component to replace. Installation is free.</p>
    <div className="dg-ancient-classes" aria-label="Ship class">{seat.blueprints.map(item=><button key={item.shipType} aria-pressed={item.shipType===shipType} disabled={disabled} onClick={()=>chooseClass(item.shipType)}>{item.shipType[0].toUpperCase()+item.shipType.slice(1)}</button>)}<button aria-pressed={!!chosen&&chosen.blueprint===null} disabled={disabled||!storage} onClick={()=>setSelected(storage?.index??null)}>Store for later</button></div>
    <div className="dg-ancient-layout">
      <section><div className="dg-ancient-ship"><ShipSilhouette type={shipType} faction={seat.faction}/><h3>{shipType} · current loadout</h3></div>
        {part.placement==='outside'&&<button disabled={disabled||!installs.length} onClick={()=>setSelected(installs[0]?.index??null)}>Install outside the grid</button>}
        <div className="dg-ancient-slots">{installed.map((id,index)=>{const option=slotOption(index);return <section key={index} className={selected===option?.index?'dg-ancient-slot-selected':''}><button aria-pressed={selected===option?.index} disabled={disabled||!option||part.placement==='outside'} onClick={()=>setSelected(option?.index??null)}>Slot {index+1}: {id?getShipPart(id).name:'Empty'}</button>{id?<ShipPartStats partId={id}/>:<p>No printed component.</p>}</section>;})}</div>
        {blueprint.outsideParts.length>0&&<div className="dg-ancient-existing"><h4>Permanent parts outside the grid</h4>{blueprint.outsideParts.map(id=><div key={id}>{getShipPart(id).name}<ShipPartStats partId={id}/></div>)}</div>}

      </section>
      <section className="dg-ancient-preview" aria-label="Installation preview">
        <h3>{chosen?.blueprint===null?'Store this part':draft?'Installation preview':'Select a destination'}</h3>
        {!chosen&&<p>Current parts are shown on the left. Select a legal slot to see exactly what changes, or store the part.</p>}
        {chosen?.blueprint===null&&<p>Keep {part.name} in storage. Install it later with an Upgrade action.</p>}
        {draft&&<><p className="dg-ancient-replacement">{part.placement==='outside'?'No component replaced · installed permanently outside the grid':`${previousPart?getShipPart(previousPart).name:'Empty slot'} → ${part.name}`}</p>{previousPart&&getShipPart(previousPart).access.kind==='ancient'&&<p className="dg-danger">The replaced ancient part is removed from the game.</p>}<table><thead><tr><th>Ship statistic</th><th>Now</th><th>After</th></tr></thead><tbody>{stats.filter(([,a,b])=>a!==b).map(([label,a,b])=><tr key={label} className={a!==b?'dg-stat-changed':''}><th>{label}</th><td>{a}</td><td>{b}{a!==b?' *':''}</td></tr>)}</tbody></table><small>Only changed statistics are shown.</small></>}
        <button className="sd-primary" disabled={disabled||!chosen} onClick={()=>{if(chosen)onSubmit(chosen.command);}}>{chosen?.blueprint===null?'Confirm storage':'Confirm installation'}</button>
        {draft&&<details className="dg-ancient-all-stats"><summary>All ship statistics</summary><table><thead><tr><th>Ship statistic</th><th>Now</th><th>After</th></tr></thead><tbody>{stats.map(([label,a,b])=><tr key={label}><th>{label}</th><td>{a}</td><td>{b}</td></tr>)}</tbody></table></details>}
      </section>
    </div>
  </section>;
}
