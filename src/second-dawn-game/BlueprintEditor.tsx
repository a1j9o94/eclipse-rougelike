import { describeShipPart, describeWeapons } from "./itemDescriptions";
import "./itemDetails.css";
import ShipPartStats from "./ShipPartStats";
import ShipSilhouette from "./ShipSilhouette";
import { planBlueprintUpgrade } from "../../shared/eclipse/upgradePlan";
import { previewCommand } from "../../shared/eclipse/commandPreview";
import type { PlayerView } from "../../shared/eclipse/types";
import { useEffect, useState, useRef } from "react";
import UpgradePartPicker from "./UpgradePartPicker";
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import {
  blueprintDefinition,
  deriveBlueprintStats,
  validateBlueprint,
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
import { fittingInventory } from './fittingPlanning';
interface Props {
  view?: PlayerView;
  initialDraft?: ShipBlueprint;
  onDraftChange?: (draft: ShipBlueprint) => void;
  faction: FactionId;
  blueprint: ShipBlueprint;
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
  const [pickerOpen,setPickerOpen]=useState(false);
  const slotTrigger=useRef<HTMLElement|null>(null);
  const draftGuard=useActionDraftGuard();
  useEffect(() => { onDraftChange?.(draft); }, [draft, onDraftChange]);
  const printed = blueprintDefinition(faction, blueprint.shipType).preprinted;
  const owned = [
    ...storedParts,
    ...blueprint.parts,
    ...blueprint.outsideParts,
  ].filter(
    (id): id is AncientShipPartId =>
      id !== null &&
      SHIP_PARTS.some((p) => p.id === id && p.access.kind === "ancient"),
  );
  const inventory=fittingInventory({blueprint,draft,technologies,storedParts,installedAncientParts});
  const issues = validateBlueprint(
    faction,
    draft,
    technologies,
    owned,
    blueprint,
  );
  const plan = planBlueprintUpgrade(
    faction,
    blueprint,
    draft,
    technologies,
    owned,
  );
  const installations=plan.ok?plan.installations:0;
  const changed = JSON.stringify(draft) !== JSON.stringify(blueprint);
  const preview = view
    ? previewCommand(view, { type: "upgrade", blueprints: [draft] })
    : null;
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
    setDraft((currentDraft) => ({
      ...currentDraft,
      parts: currentDraft.parts.map((part, index) =>
        index === selectedSlot ? partId : part,
      ),
    }));
  };
  const slotName = (part: ShipPartId | null, printedPart: ShipPartId | null) =>
    part ? getShipPart(part).name : printedPart ? getShipPart(printedPart).name : "Empty slot";
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
        <div className="dg-shipyard-identity"><span className="dg-yard-eyebrow">Shipyard · configuration</span><h2>Edit {blueprint.shipType}</h2><p>Fit your ship below. Every ship of this class uses this blueprint.</p></div>
        <div className={`dg-reactor-readout ${stats.energyProduction < stats.energyConsumption ? "dg-danger" : ""}`}><span>Reactor balance</span><strong>{stats.energyProduction - stats.energyConsumption} energy available</strong><small>{stats.energyProduction} generated / {stats.energyConsumption} used</small></div>
      </header>
      <section className="dg-blueprint-canvas" aria-label="Blueprint hardpoints">
        <div className="dg-blueprint-canvas-heading">
          <div><h3>Blueprint hardpoints</h3><p>Tap a slot to replace its component.</p></div>
          <span>{draft.parts.length} slots</span>
        </div>
        <div className="dg-blueprints" role="group" aria-label="Blueprint hardpoints">
          {draft.parts.map((part, index) => {
            const effectivePart = part ?? printed[index];
            const isSelected = selectedSlot === index;
            return <button
              className={`dg-blueprint-slot${isSelected ? " is-selected" : ""}${part ? " has-overlay" : ""}`}
              key={index}
              type="button"
              aria-label={`Slot ${index + 1}: ${slotName(part, printed[index])}`}
              aria-pressed={isSelected}
              aria-haspopup="dialog"
              onClick={event => {slotTrigger.current=event.currentTarget;setSelectedSlot(index);setPickerOpen(true);}}
            >
              <span className="dg-slot-title"><b>{String(index + 1).padStart(2, "0")}</b> {part ? "Installed" : printed[index] ? "Printed" : "Open"}</span>
              {effectivePart ? <><strong>{getShipPart(effectivePart).name}</strong><ShipPartStats partId={effectivePart} /></> : <strong className="dg-slot-empty">Open hardpoint</strong>}
              <small>{"Choose replacement"}</small>
            </button>;
          })}
        </div>
      </section>
      {pickerOpen&&<UpgradePartPicker blueprint={blueprint} draft={draft} slot={selectedSlot} printed={selectedPrinted} inventory={inventory} disabled={disabled} returnFocus={slotTrigger.current} onSelect={part=>{installPart(part);setPickerOpen(false);}} onClose={()=>setPickerOpen(false)}/>}
      <p className="dg-part-effect" data-testid={`slot-effect-${selectedSlot + 1}`}>{selectedEffectivePart ? describeShipPart(selectedEffectivePart) : "Empty slot: install a part here without covering a printed part."}</p>
      {availableOutside
        .map((p) => (
          <label className="dg-check" key={p.id}>
            <input
              type="checkbox"
              disabled={disabled||blueprint.outsideParts.includes(p.id)}
              checked={draft.outsideParts.includes(p.id)}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  outsideParts: e.target.checked
                    ? [...d.outsideParts, p.id]
                    : d.outsideParts.filter((id) => id !== p.id),
                }))
              }
            />
            {p.name} · {describeShipPart(p.id)}
            {blueprint.outsideParts.includes(p.id) ? " · permanent" : ""}
          </label>
        ))}
      <table className="dg-stat-comparison">
        <caption>Ship performance before confirmation</caption>
        <thead><tr><th scope="col">Statistic</th><th scope="col">Current</th><th scope="col">Draft</th></tr></thead>
        <tbody>{comparison.filter(([,before,after])=>before!==after).map(([label, before, after]) => <tr key={label} className="dg-stat-changed"><th scope="row">{label}</th><td>{before}</td><td>{after}<span className="dg-stat-change"> changed</span></td></tr>)}</tbody>
      </table>
      <details className="dg-unchanged-stats"><summary>Unchanged ship statistics</summary><table className="dg-stat-comparison"><tbody>{comparison.filter(([,before,after])=>before===after).map(([label,before,after])=><tr key={label}><th scope="row">{label}</th><td>{before}</td><td>{after}</td></tr>)}</tbody></table></details>
      <p>Installation plan: {installations} / {capacity} upgrades. Removing an overlay reveals its printed part.</p>
      <details className="dg-stat-guide"><summary>How ship statistics work</summary><p>Energy production must cover consumption. Higher initiative fires first; the defender wins ties. Computers add to attack rolls, while enemy shields subtract. A total of 6 hits; natural 6 always hits and natural 1 always misses. Cannons fire each round; missiles fire once at the start of battle. Damage must exceed hull to destroy a ship.</p></details>
      {preview && (
        <p className={preview.moneyBalanceAfter < 0 ? "dg-danger" : ""}>
          Upkeep after confirmation: {preview.upkeepAfter} ·{" "}
          {preview.moneyBalanceAfter < 0
            ? `${-preview.moneyBalanceAfter} money shortfall`
            : `${preview.moneyBalanceAfter} money remaining`}
        </p>
      )}
      {!plan.ok && issues.length === 0 && (
        <p className="dg-danger">{plan.message}</p>
      )}
      {issues.map((issue, i) => (
        <p className="dg-danger" key={i}>
          {issue.message}
        </p>
      ))}
      {installations > capacity && (
        <p className="dg-danger">
          This action allows {capacity} installed parts.
        </p>
      )}
      <div className="dg-upgrade-confirm">
      {replacementSummary.length > 0 && <span className="dg-upgrade-summary" role="status">{replacementSummary.join(" · ")}</span>}
      <button
        className="sd-primary"
        disabled={
          disabled ||
          draftGuard.stale ||
          !changed ||
          !plan.ok ||
          issues.length > 0 ||
          installations > capacity
        }
        onClick={() => onSubmit({ type: "upgrade", blueprints: [draft] })}
      >
        Apply {installations} {installations===1?'upgrade':'upgrades'}
      </button>
      <button onClick={() => setDraft(structuredClone(blueprint))}>
        Reset draft
      </button>
      </div>
    </section>
  );
}
