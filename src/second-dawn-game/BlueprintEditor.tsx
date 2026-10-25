import FittingHardpoints from './FittingHardpoints';
import FittingSummary from './FittingSummary';
import CommitBar from './CommitBar';
import ActionEconomy from './ActionEconomy';
import { CommitContext, useCommitLabel } from './commitContext';
import {OutsideGridModule} from './BlueprintLoadout';
import "./itemDetails.css";
import { previewCommand } from "../../shared/eclipse/commandPreview";
import type { PlayerView } from "../../shared/eclipse/types";
import { useContext, useEffect, useState } from "react";
import UpgradePartPicker from "./UpgradePartPicker";
import { ActionDraftContext, useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import {
  blueprintDefinition,
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
  const [previousDraft,setPreviousDraft]=useState<ShipBlueprint|null>(null);
  const editDraft=(update:(current:ShipBlueprint)=>ShipBlueprint)=>{setPreviousDraft(structuredClone(draft));setDraft(update);};
  const draftContext=useContext(ActionDraftContext);
  const draftGuard=useActionDraftGuard();
  const commitLabel=useCommitLabel();
  const queuedCommit=useContext(CommitContext);
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
  const selectedPrinted = printed[selectedSlot];
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
      <FittingSummary faction={faction} blueprint={blueprint} draft={draft} selectedSlot={selectedSlot} allowance={{used:installations,limit:capacity}} onRestore={()=>editDraft(current=>({...current,parts:current.parts.map((part,index)=>index===selectedSlot?blueprint.parts[index]:part)}))}/>
      <div className="dg-fitting-workspace">
      <section className="dg-blueprint-canvas" aria-label="Blueprint hardpoints">
        <div className="dg-blueprint-canvas-heading">
          <div><h3>Blueprint hardpoints</h3></div>
          <span>{draft.parts.length} slots</span>
        </div>
        <FittingHardpoints faction={faction} blueprint={blueprint} draft={draft} selectedSlot={selectedSlot} onSelect={setSelectedSlot}/>
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
      <UpgradePartPicker blueprint={blueprint} draft={draft} slot={selectedSlot} printed={selectedPrinted} inventory={inventory} disabled={disabled} onSelect={installPart}/>
      </div>
      {order.blueprints.length>1&&<ul className="dg-upgrade-classes" aria-label="Changed ship classes">{order.blueprints.map(item=><li key={item.shipType}><strong>{item.shipType}</strong> · {item.parts.filter((part,index)=>part!==originals.find(original=>original.shipType===item.shipType)?.parts[index]).length+item.outsideParts.filter(part=>!originals.find(original=>original.shipType===item.shipType)?.outsideParts.includes(part)).length} changes</li>)}</ul>}
      {order.issues.map(issue=><p className="dg-danger" role="alert" key={issue}>{issue}</p>)}
      <CommitBar className="dg-upgrade-confirm" summary={<>{replacementSummary.length>0&&<span className="dg-upgrade-summary" role="status">{replacementSummary.join(' · ')}</span>}{view&&preview&&<ActionEconomy view={view} action="upgrade" preview={preview}/>}</>}>
        <button className="sd-primary" data-queued={queuedCommit} disabled={!canApply} onClick={apply}>{commitLabel(`Apply ${installations} ${installations===1?'upgrade':'upgrades'}`)}</button>
        {!draftContext&&<><button disabled={disabled||!previousDraft} onClick={()=>{if(previousDraft){setDraft(previousDraft);setPreviousDraft(null);}}}>Undo last edit</button><details className="dg-fitting-reset"><summary>Reset options</summary><button onClick={()=>editDraft(()=>structuredClone(blueprint))}>Reset this ship</button></details></>}
      </CommitBar>
    </section>
  );
}
