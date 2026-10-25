import { useState } from 'react';
import FittingHardpoints from './FittingHardpoints';
import { ShipCapabilities } from './BlueprintLoadout';
import './upgradePartPicker.css';
import { deriveBlueprintStats, effectiveBlueprintParts, validateBlueprint, type ShipBlueprint } from '../../shared/eclipse/blueprints';
import { getShipPart, isShipPartId, type ShipPartId } from '../../shared/eclipse/parts';
import type { LegalCommandCandidate } from '../../shared/eclipse/legal';
import type { Blueprint, GameCommand, PendingDecision, PlayerView, ShipType } from '../../shared/eclipse/types';
import ShipPartStats from './ShipPartStats';
import ShipSilhouette from './ShipSilhouette';
import type {AncientShipPartId} from '../../shared/eclipse/discoveries';
import {researchedTechnologyIds,type TechnologyId} from '../../shared/eclipse/technologies';
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
  const [selection,setSelection] = useState<{decisionId:string; drafts:Partial<Record<ShipType,ShipBlueprint>>; storage:boolean}>(()=>({decisionId:decision.id,drafts:{},storage:false}));
  const classDraft=selection.decisionId===decision.id?selection.drafts[shipType]:undefined;
  const stored=selection.decisionId===decision.id&&selection.storage;
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
  const chosen = stored?storage:options.find(option=>classDraft&&option.blueprint&&JSON.stringify(typedBlueprint(option.blueprint))===JSON.stringify(classDraft));
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
  const chooseClass = (type:ShipType) => {setShipType(type);setSelection(current=>({...current,storage:false}));};
  const chooseBlueprint = (next:Blueprint|null|undefined) => {
    if(next===undefined)return;
    setSelection(current=>({decisionId:decision.id,drafts:{...(current.decisionId===decision.id?current.drafts:{}),...(next?{[next.shipType]:typedBlueprint(next)}:{})},storage:next===null}));
  };
  const availableAncients=[...(seat.storedParts??[]),...blueprint.parts,...blueprint.outsideParts,part.id].filter((id):id is AncientShipPartId=>id!==null&&isShipPartId(id)&&getShipPart(id).access.kind==='ancient');
  const blockedSlots=new Map(installed.flatMap((_,index)=>{
    if(slotOption(index))return [];
    const candidate={...blueprint,parts:blueprint.parts.map((id,slot)=>slot===index?part.id:id)};
    const issues=validateBlueprint(seat.faction,candidate,researchedTechnologyIds(seat) as TechnologyId[],availableAncients,blueprint);
    const reason=part.placement==='outside'?'Installs outside the grid.':issues.map(issue=>issue.message).join(' ')||(current.parts[index]===part.id?'Already installed here.':'No legal installation is available in this slot.');
    return [[index,reason] as const];
  }));
  return <section className="dg-ancient-install">
    <header className="dg-ancient-heading"><div><span className="dg-yard-eyebrow">Discovered ship part</span><h2>{part.name}</h2></div><ShipPartStats partId={part.id}/></header>
    <div className="dg-ancient-classes" aria-label="Ship class">{seat.blueprints.map(item=><button key={item.shipType} aria-pressed={item.shipType===shipType} disabled={disabled} onClick={()=>chooseClass(item.shipType)}>{item.shipType[0].toUpperCase()+item.shipType.slice(1)}</button>)}<button aria-pressed={!!chosen&&chosen.blueprint===null} disabled={disabled||!storage} onClick={()=>chooseBlueprint(storage?.blueprint)}>Store for later</button></div>
    <div className="dg-ancient-layout">
      <section><div className="dg-ancient-ship"><ShipSilhouette type={shipType} faction={seat.faction}/><h3>{shipType} · {draft?'installation preview':'current loadout'}</h3></div>
        {part.placement==='outside'&&<button disabled={disabled||!installs.length} onClick={()=>chooseBlueprint(installs[0]?.blueprint)}>Install outside the grid</button>}
        <ShipCapabilities stats={after??before} showEnergy showWeapons/>
        <FittingHardpoints faction={seat.faction} blueprint={blueprint} draft={draft??blueprint} selectedSlot={changedSlot>=0?changedSlot:null} disabled={disabled} blockedSlots={blockedSlots} onSelect={index=>chooseBlueprint(slotOption(index)?.blueprint)}/>
        {blueprint.outsideParts.length>0&&<div className="dg-ancient-existing"><h4>Permanent parts outside the grid</h4>{blueprint.outsideParts.map(id=><div key={id}>{getShipPart(id).name}<ShipPartStats partId={id}/></div>)}</div>}

      </section>
      <section className="dg-ancient-preview" aria-label="Installation preview">
        <h3>{chosen?.blueprint===null?'Store this part':draft?'Installation preview':'Select a destination'}</h3>
        {!chosen&&classDraft&&<p role="alert">This placement is no longer legal. Choose another slot or store the part.</p>}
        {chosen?.blueprint===null&&<p>Keep {part.name} in storage. Install it later with an Upgrade action.</p>}
        {draft&&<>{part.placement==='outside'&&<p className="dg-ancient-replacement">No component replaced · installed permanently outside the grid</p>}{previousPart&&getShipPart(previousPart).access.kind==='ancient'&&<p className="dg-danger">The replaced ancient part is removed from the game.</p>}<table><thead><tr><th>Ship statistic</th><th>Now</th><th>After</th></tr></thead><tbody>{stats.filter(([,a,b])=>a!==b).map(([label,a,b])=><tr key={label} className={a!==b?'dg-stat-changed':''}><th>{label}</th><td>{a}</td><td>{b}{a!==b?' *':''}</td></tr>)}</tbody></table><small>Only changed statistics are shown.</small></>}
        <button className="sd-primary" disabled={disabled||!chosen} onClick={()=>{if(chosen)onSubmit(chosen.command);}}>{chosen?.blueprint===null?'Store':'Install free'}</button>
        {draft&&<details className="dg-ancient-all-stats"><summary>All ship statistics</summary><table><thead><tr><th>Ship statistic</th><th>Now</th><th>After</th></tr></thead><tbody>{stats.map(([label,a,b])=><tr key={label}><th>{label}</th><td>{a}</td><td>{b}</td></tr>)}</tbody></table></details>}
      </section>
    </div>
  </section>;
}
