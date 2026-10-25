import FittingHardpoints from './FittingHardpoints';
import { useCommitLabel } from './commitContext';
import {OutsideGridModule, ShipCapabilities} from './BlueprintLoadout';
import { describeShipPart, describeWeapons } from "./itemDescriptions";
import "./itemDetails.css";
import ShipSilhouette from "./ShipSilhouette";
import { previewCommand } from "../../shared/eclipse/commandPreview";
import type { PlayerView } from "../../shared/eclipse/types";
import { useContext, useEffect, useState } from "react";
import UpgradePartPicker from "./UpgradePartPicker";
import { ActionDraftContext, useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import {
  blueprintDefinition,
  deriveBlueprintStats,
  type ShipBlueprint,
} from "../../shared/eclipse/blueprints";
import {
  getShipPart,
  SHIP_PARTS,
  type ShipPartId,
} from "../../shared/eclipse/parts";
import type { FactionId } from "../../shared/eclipse/catalog";
import type { TechnologyId } from "../../shared/eclipse/technologies";
import type { AncientShipPartId } from "../../shared/eclipse/discoveries";
import type { GameCommand } from "../../shared/eclipse/types";
import { fittingInventory, fittingOrder, reservedAncientParts, type FittingDrafts } from './fittingPlanning';
interface Props {
  view?: PlayerView;
  initialDraft?: ShipBlueprint;
  onDraftChange?: (draft: ShipBlueprint) => void;
  faction: FactionId;
  blueprint: ShipBlueprint;
  blueprints?: readonly ShipBlueprint[];
  technologies: TechnologyId[];
  storedParts: AncientShipPartId[];
  installedAncientParts?: AncientShipPartId[];
  capacity: number;
  disabled: boolean;
  onSubmit: (command: GameCommand) => void;
}
export default function BlueprintEditor({
  faction,
  blueprint,
  blueprints,
  technologies,
  storedParts,
  installedAncientParts,
  capacity,
  disabled,
  onSubmit,
  view,
  initialDraft,
  onDraftChange,
}: Props) {
  const [draft, setDraft] = useActionDraftState(`blueprint-${blueprint.shipType}`,() =>
    structuredClone(initialDraft ?? blueprint),
  );
  const [selectedSlot, setSelectedSlot] = useActionDraftState(`blueprintSlot-${blueprint.shipType}`,0);
  const [pickerOpen,setPickerOpen]=useState(true);
  const [previousDraft,setPreviousDraft]=useState<ShipBlueprint|null>(null);
  const editDraft=(update:(current:ShipBlueprint)=>ShipBlueprint)=>{setPreviousDraft(structuredClone(draft));setDraft(update);};
  const draftContext=useContext(ActionDraftContext);
  const draftGuard=useActionDraftGuard();
  const commitLabel=useCommitLabel();
  useEffect(() => { onDraftChange?.(draft); }, [draft, onDraftChange]);
  const printed = blueprintDefinition(faction, blueprint.shipType).preprinted;
  const originals=blueprints??[blueprint];
  const drafts:FittingDrafts={};
  for(const original of originals){
    const stored=draftContext?.entries[`blueprint-${original.shipType}`]?.value;
    if(stored)drafts[original.shipType]=stored;
  }
  drafts[blueprint.shipType]=draft;
  const reserved=reservedAncientParts(originals,drafts,blueprint.shipType);
  const inventory=fittingInventory({blueprint,draft,technologies,storedParts,installedAncientParts,reservedAncientParts:reserved});
  const order=fittingOrder(faction,originals,drafts,technologies,storedParts,capacity);
  const installations=order.installations;
  const canApply = !disabled && !draftGuard.stale && order.blueprints.length>0 && order.issues.length===0 && capacity>0;
  const command:GameCommand={type:'upgrade',blueprints:order.blueprints};
  const apply = () => { if(canApply) onSubmit(command); };
  const preview = view && order.blueprints.length>0 ? previewCommand(view,command) : null;
  const stats = deriveBlueprintStats(faction, draft);
  const current = deriveBlueprintStats(faction, blueprint);
  const comparison = [
    ["Energy surplus", current.energyProduction - current.energyConsumption, stats.energyProduction - stats.energyConsumption],
    ["Damage to destroy", current.hull + 1, stats.hull + 1],
    ["Movement", current.movement, stats.movement],
    ["Initiative", current.initiative, stats.initiative],
    ["Computer bonus", current.computer, stats.computer],
    ["Shield strength", current.shield, stats.shield],
    ["Weapons (dice × damage)", describeWeapons(current), describeWeapons(stats)],
  ];
  const selectedPart = draft.parts[selectedSlot];
  const selectedPrinted = printed[selectedSlot];
  const selectedEffectivePart = selectedPart ?? selectedPrinted;
  const installPart = (partId: ShipPartId | null) => {
    editDraft((currentDraft) => ({
      ...currentDraft,
      parts: currentDraft.parts.map((part, index) =>
        index === selectedSlot ? partId : part,
      ),
    }));
  };
  const availableOutside=SHIP_PARTS.filter(part=>part.placement==='outside'&&(blueprint.outsideParts.includes(part.id)||part.access.kind==='default'||part.access.kind==='technology'&&technologies.includes(part.access.technology)||part.access.kind==='ancient'&&storedParts.includes(part.id as AncientShipPartId)));
  const replacementSummary = draft.parts.flatMap((part, index) => {
    const before = blueprint.parts[index] ?? printed[index];
    const after = part ?? printed[index];
    return before === after
      ? []
      : `Slot ${index + 1}: ${before ? getShipPart(before).name : "Empty"} → ${after ? getShipPart(after).name : "Empty"}`;
  });
  return (
    <section className="dg-blueprint-editor">
      <header className="dg-shipyard-header">
        <ShipSilhouette type={blueprint.shipType} faction={faction} />
        <div className="dg-shipyard-identity">
          <span className="dg-yard-eyebrow">Shipyard · configuration</span>
          <div className="dg-shipyard-heading-row">
            <h2>Edit {faction==='exiles'&&blueprint.shipType==='starbase'?'Orbital':blueprint.shipType}</h2>
            <div className={`dg-reactor-readout ${stats.energyProduction < stats.energyConsumption ? "dg-danger" : ""}`}><span>Reactor balance</span><strong>{stats.energyProduction - stats.energyConsumption} energy available</strong><small>{stats.energyProduction} generated / {stats.energyConsumption} used</small></div>
          </div>
          <ShipCapabilities stats={stats} showEnergy={false} showWeapons/>
          <p>Applies to every {faction==='exiles'&&blueprint.shipType==='starbase'?'Orbital':blueprint.shipType}.</p>
        </div>
      </header>
      <div className="dg-fitting-workspace">
      <section className="dg-blueprint-canvas" aria-label="Blueprint hardpoints">
        <div className="dg-blueprint-canvas-heading">
          <div><h3>Blueprint hardpoints</h3></div>
          <span>{draft.parts.length} slots</span>
        </div>
        <FittingHardpoints faction={faction} blueprint={blueprint} draft={draft} selectedSlot={selectedSlot} onSelect={index=>{setSelectedSlot(index);setPickerOpen(true);}}/>
        {availableOutside.length>0&&<div className="dg-outside-loadout" role="group" aria-label="Outside-grid parts">
          {availableOutside.map(part=><OutsideGridModule key={part.id} partId={part.id}>
            <label className="dg-outside-install">
              <input type="checkbox" aria-label={`${part.name} ${blueprint.outsideParts.includes(part.id)?'installed permanently':'installation'}`} disabled={disabled||blueprint.outsideParts.includes(part.id)} checked={draft.outsideParts.includes(part.id)}
                onChange={event=>editDraft(current=>({...current,outsideParts:event.target.checked?[...current.outsideParts,part.id]:current.outsideParts.filter(id=>id!==part.id)}))}/>
              <span>{blueprint.outsideParts.includes(part.id)?'Installed · Permanent':draft.outsideParts.includes(part.id)?'In draft':'Install module'}</span>
            </label>
          </OutsideGridModule>)}
        </div>}
      </section>
      {pickerOpen&&<UpgradePartPicker blueprint={blueprint} draft={draft} slot={selectedSlot} printed={selectedPrinted} inventory={inventory} disabled={disabled} onSelect={installPart} onClose={()=>setPickerOpen(false)}/>}
      </div>
      <p className="dg-part-effect" data-testid={`slot-effect-${selectedSlot + 1}`}>{selectedEffectivePart ? describeShipPart(selectedEffectivePart) : "Empty slot: install a part here without covering a printed part."}</p>
      <table className="dg-stat-comparison">
        <caption>Ship performance before confirmation</caption>
        <thead><tr><th scope="col">Statistic</th><th scope="col">Current</th><th scope="col">Draft</th></tr></thead>
        <tbody>{comparison.filter(([,before,after])=>before!==after).map(([label, before, after]) => <tr key={label} className="dg-stat-changed"><th scope="row">{label}</th><td>{before}</td><td>{after}<span className="dg-stat-change"> changed</span></td></tr>)}</tbody>
      </table>
      <details className="dg-unchanged-stats"><summary>Unchanged ship statistics</summary><table className="dg-stat-comparison"><tbody>{comparison.filter(([,before,after])=>before===after).map(([label,before,after])=><tr key={label}><th scope="row">{label}</th><td>{before}</td><td>{after}</td></tr>)}</tbody></table></details>
      {order.blueprints.length>1&&<ul className="dg-upgrade-classes" aria-label="Changed ship classes">{order.blueprints.map(item=><li key={item.shipType}><strong>{item.shipType}</strong> · {item.parts.filter((part,index)=>part!==originals.find(original=>original.shipType===item.shipType)?.parts[index]).length+item.outsideParts.filter(part=>!originals.find(original=>original.shipType===item.shipType)?.outsideParts.includes(part)).length} changes</li>)}</ul>}
      <p role="status">Upgrade order · {installations} / {capacity} installations{order.blueprints.length>1?` across ${order.blueprints.length} ship classes`:""}</p>
      <details className="dg-stat-guide"><summary>How ship statistics work</summary><p>Energy production must cover consumption. Higher initiative fires first; the defender wins ties. Computers add to attack rolls, while enemy shields subtract. A total of 6 hits; natural 6 always hits and natural 1 always misses. Cannons fire each round; missiles fire once at the start of battle. Damage must exceed hull to destroy a ship.</p></details>
      {preview && (
        <p className={preview.moneyBalanceAfter < 0 ? "dg-danger" : ""}>
          Upkeep after confirmation: {preview.upkeepAfter} ·{" "}
          {preview.moneyBalanceAfter < 0
            ? `${-preview.moneyBalanceAfter} money shortfall`
            : `${preview.moneyBalanceAfter} money remaining`}
        </p>
      )}
      {order.issues.map(issue=><p className="dg-danger" role="alert" key={issue}>{issue}</p>)}
      <div className="dg-upgrade-confirm">
      {replacementSummary.length > 0 && <span className="dg-upgrade-summary" role="status">{replacementSummary.join(" · ")}</span>}
      <button
        className="sd-primary"
        disabled={!canApply}
        onClick={apply}
      >
        {commitLabel(`Apply ${installations} ${installations===1?'upgrade':'upgrades'}`)}
      </button>
      <button disabled={draft.parts[selectedSlot]===blueprint.parts[selectedSlot]} onClick={()=>editDraft(current=>({...current,parts:current.parts.map((part,index)=>index===selectedSlot?blueprint.parts[index]:part)}))}>Reset slot {selectedSlot+1}</button>
      <button disabled={disabled||!previousDraft} onClick={()=>{if(previousDraft){setDraft(previousDraft);setPreviousDraft(null);}}}>Undo last edit</button>
      <button onClick={() => editDraft(() => structuredClone(blueprint))}>
        Reset draft
      </button>
      </div>
    </section>
  );
}
