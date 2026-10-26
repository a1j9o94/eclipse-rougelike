import {useContext,useLayoutEffect,useState} from 'react';
import {BattlefieldContext} from './battlefieldContext';
import {automaticCombatAllocation} from '../../shared/eclipse/combatAutomation';
import {riftDieOutcome} from '../../shared/eclipse/combat';
import {combatAllocationPreview,combatHitPreview,combatTargetStats} from './combatAllocationPreview';
import FactoryBadge from './FactoryBadge';
import { researchedTechnologyIds } from '../../shared/eclipse/technologies';
import { getFaction, type FactionId } from "../../shared/eclipse/catalog";
import { deriveBlueprintStats, neutralBlueprint } from "../../shared/eclipse/blueprints";
import { connectionBetween } from "../../shared/eclipse/geometry";
import { publicBlueprint } from "../../shared/eclipse/legal";
import { mapSector } from "../../shared/eclipse/rulesState";
import { sectorDefinition } from "../../shared/eclipse/sectors";
import type { PendingDecision, PlayerView, Ship } from "../../shared/eclipse/types";
import ShipSilhouette from "./ShipSilhouette";
import { NeutralShipSilhouette } from "./BattleOverview";
import { PlanetIcon } from "./SectorPlanets";
import DiceRoll3D from "./DiceRoll3D";
import EclipseDieFace from "./EclipseDieFace";
import {eclipseDieFace} from "./dice3d/faces";
import { useDice3dEnabled } from "./presentationSettings";
import "./combatDecisionVisuals.css";
import {shipClassName} from './shipLabels';

const shipNames: Record<Ship["type"], string> = {
  interceptor: "Interceptor",
  cruiser: "Cruiser",
  dreadnought: "Dreadnought",
  starbase: "Starbase",
  ancient: "Ancient",
  guardian: "Guardian",
  gcds: "GCDS",
};
type AllocationDecision = Extract<PendingDecision, { kind: "combat-allocation" }>;

export function CombatVolleyAllocator({ view, decision, targetLabels, values, setValue, motionEnabled = true }: {
  view?: PlayerView;
  decision: AllocationDecision;
  targetLabels: Record<string, string>;
  values: Record<string, string>;
  setValue: (key: string, value: string) => void;
  motionEnabled?: boolean;
}) {
  const [dice3dEnabled] = useDice3dEnabled();
  const battlefield=useContext(BattlefieldContext);
  const [allocationError,setAllocationError]=useState('');
  const autoAssign=()=>{
    if(!view)return;
    try {
      const {allocations}=automaticCombatAllocation(view,decision);
      for(const die of decision.dice) {
        if(die.split)for(const target of die.targets)setValue(`${die.id}/${target}`,String(allocations.filter(item=>item.dieId===die.id&&item.targetId===target).reduce((sum,item)=>sum+(item.damage??0),0)));
        else setValue(die.id,allocations.find(item=>item.dieId===die.id)?.targetId??'');
      }
      setAllocationError('');
    } catch {setAllocationError('Inspect the current targets before assigning this volley.');}
  };
  const actionable = decision.dice.filter((die) => die.targets.length && die.hitTargets?.length !== 0);
  const selectedId = values.__selectedDie || actionable.find((die) => !values[die.id])?.id || actionable[0]?.id || "";
  const selected = decision.dice.find((die) => die.id === selectedId);
  const assignedTo = (targetId: string) => decision.dice.filter((die) => !die.split && values[die.id] === targetId);
  const projection=combatAllocationPreview(view,decision,values);
  const targetIds = [...new Set(decision.dice.flatMap((die) => die.targets))];
  const shipStats = (targetId: string) => {
    const ship = view?.ships.find((candidate) => candidate.id === targetId);
    if (!ship) return undefined;
    const seat = view?.seats.find((candidate) => candidate.id === ship.owner);
    return ship.type === "ancient" || ship.type === "guardian" || ship.type === "gcds"
      ? neutralBlueprint(`${ship.type}-standard`).stats
      : seat?.blueprints.find((candidate) => candidate.shipType === ship.type)
        ? deriveBlueprintStats(seat.faction, publicBlueprint(seat.blueprints.find((candidate) => candidate.shipType === ship.type)!))
        : undefined;
  };
  const hitFor = (die: AllocationDecision["dice"][number], targetId: string, shield?: number): boolean | undefined => {
    if (die.hitTargets !== undefined) return die.hitTargets.includes(targetId);
    if (die.weaponColor === "magenta") return die.damage > 0;
    if (die.face === 1) return false;
    if (die.face === 6) return true;
    return die.computer !== undefined && shield !== undefined ? die.face + die.computer - shield >= 6 : undefined;
  };
  const setAllocation=battlefield?.setAllocation;
  useLayoutEffect(()=>{
    if(!setAllocation)return;
    const choices=decision.dice.filter(die=>die.targets.length&&die.hitTargets?.length!==0);
    const selected=decision.dice.find(die=>die.id===(values.__selectedDie||choices.find(die=>!values[die.id])?.id||choices[0]?.id));
    const projection=combatAllocationPreview(view,decision,values);
    setAllocation({decisionId:decision.id,targets:projection.targets.map(target=>{const shield=combatTargetStats(view,target.id)?.shield,hit=selected?combatHitPreview(selected,target.id,shield):undefined;return {...target,label:targetLabels[target.id]??target.id,hit,explanation:!selected?'Select a die to inspect its hit.':selected.weaponColor==='magenta'?'Rift damage ignores computers and shields.':selected.face===6?'Natural 6 always hits.':selected.face===1?'Natural 1 always misses.':hit===undefined?'Legacy hit preview is unknown.':selected.computer===undefined||shield===undefined?`Recorded ${hit?'hit':'miss'} · modifiers unavailable`:`${selected.face} + ${selected.computer??0} computer − ${shield??0} shield · ${hit?'hit':'miss'}`};}),onTarget:id=>{if(selected&&!selected.split&&selected.hitTargets?.length!==0)setValue(selected.id,id);},onClear:id=>{for(const die of decision.dice){if(die.split)setValue(`${die.id}/${id}`,'0');else if(values[die.id]===id)setValue(die.id,'');}}});
    return()=>setAllocation(null);
  },[setAllocation,decision,view,values,setValue,targetLabels]);
  const targetGrid = <div className="dg-volley-targets" role="group" aria-label="Volley targets">
    {targetIds.map((targetId) => {
      const stats = shipStats(targetId);
      const dice = assignedTo(targetId);
      const {damage:assignedDamage,uncertainDamage,hp,destroyed,assigned}=projection.targets.find(target=>target.id===targetId)!;
      const hit = selected ? hitFor(selected, targetId, stats?.shield) : undefined;
      const explanation = selected ? selected.weaponColor === "magenta" ? `${eclipseDieFace("magenta",selected.face).label}. Rift damage ignores computers and shields.` : selected.face === 1 ? "Natural 1 always misses." : selected.face === 6 ? "Natural 6 always hits." : hit === undefined ? `Roll ${selected.face}; computer or shield provenance is unavailable, so this legacy hit preview is unknown.` : `${selected.face} + ${selected.computer} computer vs shield ${stats?.shield} ${hit ? "hits" : "misses"}.` : "Select a die to preview this target.";
      return <article className={`dg-volley-target${hit === false ? " is-miss" : ""}${assigned?' is-planned':''}${destroyed?' will-destroy':''}`} key={targetId}>
        <ShipCard view={view} targetId={targetId} label={targetLabels[targetId] ?? targetId} selected={assigned} hit={hit} onClick={() => selected && !selected.split && selected.hitTargets?.length !== 0 && setValue(selected.id, targetId)}/>
        <div className="dg-target-projection"><span>{hp === undefined ? "HP unknown" : uncertainDamage ? `${hp} HP → unknown` : `${hp} HP → ${Math.max(0, hp-assignedDamage)} HP`}</span><span>{assignedDamage} assigned{uncertainDamage ? ` · +${uncertainDamage} uncertain` : hp !== undefined && assignedDamage > hp ? ` · ${assignedDamage-hp} excess` : ""}</span></div>
        {destroyed&&<strong className="dg-destruction-preview">Will destroy</strong>}
        <div className="dg-target-dice">{dice.map((die) => <button type="button" key={die.id} aria-label={`Remove die ${decision.dice.indexOf(die)+1} from ${targetLabels[targetId] ?? targetId}`} onClick={() => setValue(die.id, "")}><EclipseDieFace color={die.weaponColor??"#bac0ce"} face={die.face} decorative/> ×</button>)}</div>
        <details><summary>Hit calculation</summary><p>{explanation}</p></details>
      </article>;
    })}
  </div>;
  return <div className="dg-volley-workspace">
    {allocationError&&<p role="status">{allocationError}</p>}
    <div className="dg-volley-aim">
    <DiceRoll3D rolls={decision.dice.map(die => ({ id: die.id, face: die.face, color: die.weaponColor ?? "#bac0ce" }))} rollId={JSON.stringify([decision.battleId, decision.dice.map(die => [die.id, die.face])])} enabled={dice3dEnabled && motionEnabled}>
    <div className={`dg-dice-tray${battlefield?' is-battlefield-tray':''}`} role="group" aria-label="Rolled attack dice">
      <header><strong>Your dice</strong>{battlefield&&selected&&<details className="dg-die-inspection"><summary>Die info</summary><p>{selected.weaponColor==='magenta'?`${eclipseDieFace('magenta',selected.face).label} · ignores computers and shields`:`${selected.weaponColor&&selected.weaponKind?`${selected.weaponColor} ${selected.weaponKind}`:'Weapon unavailable'} · ${selected.damage} damage${selected.computer===undefined?' · computer unavailable':` · computer +${selected.computer}`}`}</p></details>}{view&&<button type="button" onClick={autoAssign}>Auto assign</button>}</header>
      <div className="dg-volley-rolls">
      {decision.dice.map((die, index) => {
        const assigned = !die.split && values[die.id];
        const backfire=die.weaponColor==='magenta'?riftDieOutcome(die.face).backfire:0;
        const weapon = die.weaponKind && die.weaponColor ? `${die.weaponColor} ${die.weaponKind}` : "Unknown weapon";
        const label = `Die ${index + 1}, roll ${die.face}, ${weapon}, ${die.damage} damage${die.weaponColor==="magenta"&&(die.face===5||die.face===6)?", 1 self-damage":""}${assigned ? `, assigned to ${targetLabels[assigned] ?? assigned}` : ""}`;
        return <button type="button" key={die.id} className={`dg-volley-die is-${die.weaponColor ?? "unknown"}${selectedId === die.id ? " is-selected" : ""}${assigned ? " is-assigned" : ""}${backfire?' has-backfire':die.hitTargets?.length === 0 ? " is-auto-miss" : ""}`} aria-label={label} aria-pressed={selectedId === die.id} onClick={() => die.hitTargets?.length !== 0 && setValue("__selectedDie", die.id)}>
          <EclipseDieFace color={die.weaponColor??"#bac0ce"} face={die.face} decorative/><span className="dg-die-provenance"><strong>{die.weaponColor==="magenta"?"Rift cannon":weapon}</strong><small>{die.weaponColor==="magenta"?`${eclipseDieFace("magenta",die.face).label.replace("Rift die: ","")} · ignores shields`: `${die.damage} damage · ${die.computer === undefined ? "computer unknown" : `computer +${die.computer}`}`}</small></span>{battlefield&&<><small className="dg-die-damage">{die.damage} damage</small>{backfire>0&&<small className="dg-die-backfire">{backfire} self-damage</small>}<b className="dg-die-state" aria-hidden="true">{assigned?'✓':backfire?'!':die.hitTargets?.length===0?'×':''}</b></>}
        </button>;
      })}
      </div>
      {decision.dice.some(die=>die.hitTargets?.length===0&&(die.weaponColor!=='magenta'||!riftDieOutcome(die.face).backfire))&&<p className="dg-all-miss-note">Dashed dice need no target.</p>}
    </div>
    </DiceRoll3D>
    {!selected ? <p className="dg-all-miss-note">{projection.backfire?"No enemy damage to assign · backfire resolves with this volley.":"All dice missed · no targets needed."}</p> : selected.split && selected.hitTargets?.length !== 0 ? <><SplitDamageCards view={view} targetLabels={targetLabels} dieNumber={decision.dice.indexOf(selected) + 1} targets={selected.targets} damage={selected.damage} values={Object.fromEntries(selected.targets.map((target) => [target, Number(values[`${selected.id}/${target}`] ?? "0")]))} onChange={(target, next) => setValue(`${selected.id}/${target}`, String(next))}/>{!battlefield&&targetGrid}</> : !battlefield&&targetGrid}
    </div>
  </div>;
}

export function CombatVolleyResult({ volley }: { volley: NonNullable<import("../../shared/eclipse/types").GameEvent["combatVolley"]> }) {
  return <div className="dg-volley-result" aria-label="Resolved combat volley">
    <div className="dg-result-dice">{volley.dice.map((die) => <span role="img" key={die.id} className={`is-${die.weaponColor ?? "unknown"}`} aria-label={die.weaponColor==="magenta"?eclipseDieFace("magenta",die.face).label:`Roll ${die.face}, ${die.damage} damage`}><EclipseDieFace color={die.weaponColor??"#bac0ce"} face={die.face} decorative/><small>{die.weaponColor && die.weaponKind ? `${die.weaponColor} ${die.weaponKind}` : "weapon unavailable"}</small></span>)}</div>
    <ul>{volley.targets.map((target) => <li key={target.id}><strong>{target.id}</strong><span>{target.hpBefore} → {target.hpAfter} HP</span>{target.destroyed && <b>Destroyed</b>}{target.excess > 0 && <small>{target.excess} excess</small>}</li>)}</ul>
  </div>;
}


function ShipArt({ type, faction }: { type: Ship["type"]; faction?: FactionId }) {
  return type === "ancient" || type === "guardian" || type === "gcds" ? (
    <NeutralShipSilhouette type={type} />
  ) : (
    <ShipSilhouette type={type} faction={faction} />
  );
}

function ownerName(view: PlayerView | undefined, owner: string | null) {
  const seat = view?.seats.find((candidate) => candidate.id === owner);
  if (seat) return getFaction(seat.faction).name;
  if (owner === "ancient") return "Ancients";
  if (owner === "guardian") return "Guardians";
  if (owner === "gcds") return "Galactic Center Defense System";
  return owner ?? "Uncontrolled";
}

function ShipCard({
  view,
  targetId,
  label,
  selected,
  hit,
  onClick,
}: {
  view?: PlayerView;
  targetId: string;
  label: string;
  selected: boolean;
  hit: boolean | undefined;
  onClick: () => void;
}) {
  const ship = view?.ships.find((candidate) => candidate.id === targetId);
  const ordinal = ship
    ? (view?.ships.filter((candidate) => candidate.owner === ship.owner && candidate.type === ship.type).findIndex((candidate) => candidate.id === ship.id) ?? 0) + 1
    : 0;
  const name = ship ? `${shipClassName(ship.type,view?.seats.find(seat=>seat.id===ship.owner)?.faction,ship.orbitalShip)} #${ordinal}` : label;
  const owner = ship ? ownerName(view, ship.owner) : null;
  const seat = ship ? view?.seats.find((candidate) => candidate.id === ship.owner) : undefined;
  const blueprint = ship ? seat?.blueprints.find((candidate) => candidate.shipType === ship.type) : undefined;
  const stats = ship
    ? ship.type === "ancient" || ship.type === "guardian" || ship.type === "gcds"
      ? neutralBlueprint(`${ship.type}-standard`).stats
      : seat && blueprint
        ? deriveBlueprintStats(seat.faction, publicBlueprint(blueprint))
        : undefined
    : undefined;
  const condition = stats && ship ? `${Math.max(0, stats.hull + 1 - ship.damage)}/${stats.hull + 1} HP` : ship?.damage ? `${ship.damage} damage` : "Condition unavailable";
  return (
    <button
      type="button"
      className={`dg-combat-ship-card${selected ? " is-selected" : ""}${hit === false ? " is-miss" : ""}`}
      aria-pressed={selected}
      aria-label={`Target ${label}${ship?.factoryPopulation?" · Materials factory":""}${hit === undefined ? "" : hit ? " · hit" : " · miss"}`}
      onClick={onClick}
    >
      {ship && <span className="dg-combat-ship-art"><ShipArt type={ship.type} faction={seat?.faction} /></span>}
      <span className="dg-combat-card-copy">
        <strong>{name}</strong>
        {owner && <small>{owner}</small>}
        {ship && <small>{condition}</small>}{ship?.factoryPopulation&&<small className="dg-factory-status"><FactoryBadge/>Materials factory · cube returns if destroyed</small>}
      </span>
      <span className="dg-combat-hit-mark" aria-hidden="true">{hit === false ? "MISS" : selected ? "✓ Assigned" : "Assign hit"}</span>
    </button>
  );
}

export function CombatTargetCards({
  view,
  targetLabels,
  targets,
  hitTargets,
  selected,
  onSelect,
}: {
  view?: PlayerView;
  targetLabels: Record<string, string>;
  targets: readonly string[];
  hitTargets?: readonly string[];
  selected: string;
  onSelect: (target: string) => void;
}) {
  return (
    <div className="dg-combat-target-cards" role="group" aria-label="Legal ship targets">
      {targets.map((target) => (
        <ShipCard
          key={target}
          view={view}
          targetId={target}
          label={targetLabels[target] ?? target}
          selected={selected === target}
          hit={hitTargets ? hitTargets.includes(target) : undefined}
          onClick={() => onSelect(target)}
        />
      ))}
    </div>
  );
}

export function SplitDamageCards({
  view,
  targetLabels,
  dieNumber,
  targets,
  values,
  damage,
  onChange,
}: {
  view?: PlayerView;
  targetLabels: Record<string, string>;
  dieNumber: number;
  targets: readonly string[];
  values: Record<string, number>;
  damage: number;
  onChange: (target: string, next: number) => void;
}) {
  const allocated = targets.reduce((sum, target) => sum + (values[target] ?? 0), 0);
  return (
    <div className="dg-combat-target-cards dg-split-targets" role="group" aria-label={`Split damage from die ${dieNumber}`}>
      {targets.map((target) => {
        const amount = values[target] ?? 0;
        const label = targetLabels[target] ?? target;
        const ship = view?.ships.find((candidate) => candidate.id === target);
        return (
          <article className={`dg-combat-split-card${amount ? " is-selected" : ""}`} key={target}>
            {ship && <span className="dg-combat-ship-art"><ShipArt type={ship.type} faction={view?.seats.find(seat => seat.id === ship.owner)?.faction} /></span>}
            <div className="dg-split-target-copy"><strong>{ship ? shipClassName(ship.type,view?.seats.find(seat=>seat.id===ship.owner)?.faction,ship.orbitalShip) : label}</strong><small>{ship ? ownerName(view, ship.owner) : label}</small></div>
            <div className="dg-damage-stepper" aria-label={`Damage allocated to ${label}`}>
              <button type="button" aria-label={`Decrease damage from die ${dieNumber} to ${label}`} disabled={amount === 0} onClick={() => onChange(target, amount - 1)}>−</button>
              <output aria-label={`Damage from die ${dieNumber} to ${label}`}>{amount}</output>
              <button type="button" aria-label={`Increase damage from die ${dieNumber} to ${label}`} disabled={allocated >= damage} onClick={() => onChange(target, amount + 1)}>+</button>
            </div>
          </article>
        );
      })}
      <p className={allocated === damage ? "dg-damage-total is-complete" : "dg-damage-total"}>{allocated} / {damage} damage assigned</p>
    </div>
  );
}

function retreatSector(view: PlayerView | undefined, id: string) {
  const sector = view?.sectors.find((candidate) => candidate.id === id);
  const ships = view?.ships.filter((ship) => ship.sectorId === id) ?? [];
  const fleet = [...new Set(ships.map((ship) => shipClassName(ship.type,view?.seats.find(seat=>seat.id===ship.owner)?.faction,ship.orbitalShip)))];
  return { sector, fleet };
}

export function RetreatCards({
  view,
  destinationIds,
  value,
  includeFight,
  forced,
  disabled = false,
  onSelect,
}: {
  view?: PlayerView;
  destinationIds: readonly string[];
  value: string | null;
  includeFight: boolean;
  forced?: boolean;
  disabled?: boolean;
  onSelect: (destination: string | null) => void;
}) {
  return (
    <div className="dg-retreat-cards" role="group" aria-label="Battle decision">
      {includeFight && (
        <button type="button" disabled={disabled} className={`dg-fight-card${value === null ? " is-selected" : ""}`} aria-pressed={value === null} onClick={() => onSelect(null)}>
          <span className="dg-fight-emblem" aria-hidden="true" /><strong>Fight here</strong><small>Fire weapons and remain in the battle.</small>
        </button>
      )}
      {destinationIds.map((id) => {
        const { sector, fleet } = retreatSector(view, id);
        const sectorLabel = `Sector ${sector?.tileId ?? id}`;
        const origin = view?.battle ? view.sectors.find((candidate) => candidate.id === view.battle?.sectorId) : undefined;
        const viewer = view?.seats.find((candidate) => candidate.id === view.viewerSeatId);
        const hasGenerator = viewer ? researchedTechnologyIds(viewer).includes("wormhole-generator") : false;
        const connection = origin && sector ? connectionBetween(mapSector(origin), mapSector(sector), hasGenerator) : "none";
        const connectionLabel = connection === "warp" ? "Warp portal link" : connection === "generator" ? "Wormhole generator route" : connection === "wormhole" ? "Paired wormholes" : "Connected retreat route";
        return (
          <button key={id} type="button" disabled={disabled} className={`dg-retreat-card${value === id ? " is-selected" : ""}`} aria-pressed={value === id} aria-label={`Retreat to ${sectorLabel}`} onClick={() => onSelect(id)}>
            <span className="dg-mini-hex" aria-hidden="true">{sector?.tileId ?? "?"}</span>
            <span><strong>{sectorLabel}</strong><small>{connectionLabel}</small><small>{ownerName(view, sector?.owner ?? null)} · {fleet.length ? `${fleet.join(", ")} present` : "No ships present"}</small></span>
          </button>
        );
      })}
      {forced && <p className="dg-forced-retreat">Weapons cannot fire · retreat required.</p>}
    </div>
  );
}

export function InitiativeQueue({view,groupIds,selected,onReorder,disabled=false}:{
 view?:PlayerView;
 groupIds:readonly string[];
 selected:readonly string[];
 onReorder:(ids:string[])=>void;
 disabled?:boolean;
}) {
 const order=[...selected.filter(id=>groupIds.includes(id)),...groupIds.filter(id=>!selected.includes(id))];
 const move=(index:number,offset:number)=>{
  const next=[...order],destination=index+offset;
  if(disabled||destination<0||destination>=next.length)return;
  [next[index],next[destination]]=[next[destination],next[index]];
  onReorder(next);
 };
 return <div className="dg-initiative-queue" role="group" aria-label="Tied firing groups">
  <ol className="dg-initiative-strip">{order.map((id,index)=>{
   const [owner,typeValue]=id.split('/');
   const shipType=typeValue in shipNames?typeValue as Ship['type']:undefined;
   const label=shipType?`${ownerName(view,owner)} ${shipClassName(shipType,view?.seats.find(seat=>seat.id===owner)?.faction)}`:id;
   return <li className="dg-initiative-card is-selected" key={id}>
    <span className="dg-initiative-order">{index+1}</span>
    {shipType&&<span className="dg-combat-ship-art"><ShipArt type={shipType} faction={view?.seats.find(seat=>seat.id===owner)?.faction}/></span>}
    <strong>{label}</strong>
    <div><button type="button" aria-label={`Move ${label} earlier`} disabled={disabled||index===0} onClick={()=>move(index,-1)}>↑</button><button type="button" aria-label={`Move ${label} later`} disabled={disabled||index===order.length-1} onClick={()=>move(index,1)}>↓</button></div>
   </li>;
  })}</ol>
 </div>;
}

export function BombardmentTargets({
  view,
  neutronBombs,
  sectorId,
  squareIds,
  selected,
  hits,
  onToggle,
  onSelect,
}: {
  view?: PlayerView;
  neutronBombs: boolean;
  sectorId: string;
  squareIds: readonly string[];
  selected: readonly string[];
  hits: number;
  onToggle: (id: string) => void;
  onSelect: (ids: string[]) => void;
}) {
  const sector = view?.sectors.find((candidate) => candidate.id === sectorId);
  const definition = sector ? sectorDefinition(Number(sector.tileId)) : undefined;
  const allTargets = squareIds.slice(0, hits);
  return (
    <div className="dg-bombardment-targets" role="group" aria-label={neutronBombs?'Neutron Bombs choice':'Population targets'}>
      <p>{neutronBombs?'Neutron Bombs · no roll':`${selected.length} / ${hits} hits assigned`} · Sector {sector?.tileId ?? sectorId}</p>
      <div className="dg-bombardment-actions">
        <button type="button" aria-pressed={selected.length===allTargets.length} onClick={() => onSelect(allTargets)}>{neutronBombs?`Destroy all ${allTargets.length} population with Neutron Bombs`:'Select all available'}</button>
        <button type="button" aria-pressed={selected.length===0} onClick={() => onSelect([])}>Clear targets</button>
      </div>
      <div className="dg-planet-target-grid">
        {squareIds.map((id) => {
          const cube = sector?.population.find((candidate) => candidate.squareId === id);
          const squareIndex = id.startsWith("p") ? Number(id.slice(1)) : -1;
          const advanced = squareIndex >= 0 && definition?.population[squareIndex]?.advanced;
          const name = cube ? `${cube.resource[0].toUpperCase()}${cube.resource.slice(1)}${advanced ? " advanced" : ""} population` : `${advanced ? "Advanced " : ""}population square`;
          const isSelected = selected.includes(id);
          const contents=<><span className="dg-planet-target-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><PlanetIcon resource={cube?.resource ?? "gray"} /></svg></span><strong>{name}</strong><small>{isSelected ? "× Will be removed" : "Keep population"}</small></>;
          return neutronBombs?<div key={id} className={`dg-planet-target${isSelected?' is-selected':''}`} role="img" aria-label={`${name}, ${isSelected?'will be removed':'spared'}`}>{contents}</div>:<button key={id} type="button" className={`dg-planet-target${isSelected ? " is-selected" : ""}`} aria-pressed={isSelected} aria-label={`Target population square ${id}`} disabled={!isSelected && selected.length >= hits} onClick={() => onToggle(id)}>{contents}</button>;
        })}
      </div>
    </div>
  );
}
