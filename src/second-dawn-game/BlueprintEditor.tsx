import { describeShipPart, describeWeapons } from "./itemDescriptions";
import "./itemDetails.css";
import ShipPartStats from "./ShipPartStats";
import ShipSilhouette from "./ShipSilhouette";
import { planBlueprintUpgrade } from "../../shared/eclipse/upgradePlan";
import { previewCommand } from "../../shared/eclipse/commandPreview";
import type { PlayerView } from "../../shared/eclipse/types";
import { useEffect } from "react";
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
interface Props {
  view?: PlayerView;
  initialDraft?: ShipBlueprint;
  onDraftChange?: (draft: ShipBlueprint) => void;
  faction: FactionId;
  blueprint: ShipBlueprint;
  technologies: TechnologyId[];
  storedParts: AncientShipPartId[];
  capacity: number;
  disabled: boolean;
  onSubmit: (command: GameCommand) => void;
}
export default function BlueprintEditor({
  faction,
  blueprint,
  technologies,
  storedParts,
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
  const available = SHIP_PARTS.filter(
    (p) =>
      p.access.kind === "default" ||
      (p.access.kind === "technology" &&
        technologies.includes(p.access.technology)) ||
      (p.access.kind === "ancient" &&
        owned.includes(p.id as AncientShipPartId)),
  );
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
  const changes =
    draft.parts.filter(
      (part, i) => part !== null && part !== blueprint.parts[i],
    ).length +
    draft.outsideParts.filter((part) => !blueprint.outsideParts.includes(part))
      .length;
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
  const previousEffectivePart = blueprint.parts[selectedSlot] ?? selectedPrinted;
  const installPart = (partId: ShipPartId | null) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      parts: currentDraft.parts.map((part, index) =>
        index === selectedSlot ? partId : part,
      ),
    }));
  };
  const unavailableReason = (part: (typeof SHIP_PARTS)[number]) => {
    if (part.placement !== "grid") return "This component installs outside the blueprint grid.";
    if (part.access.kind === "technology") return `Research ${part.name} before installing it.`;
    if (part.access.kind === "ancient") return `Acquire ${part.name} from an Ancient discovery before installing it.`;
    return "This component is unavailable.";
  };
  const slotName = (part: ShipPartId | null, printedPart: ShipPartId | null) =>
    part ? getShipPart(part).name : printedPart ? getShipPart(printedPart).name : "Empty slot";
  const partGroups = [
    { name: "Standard components", parts: available.filter((part) => part.placement === "grid" && part.access.kind === "default") },
    { name: "Researched components", parts: available.filter((part) => part.placement === "grid" && part.access.kind === "technology") },
    { name: "Ancient components", parts: available.filter((part) => part.placement === "grid" && part.access.kind === "ancient") },
  ].filter((group) => group.parts.length > 0);
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
        <ShipSilhouette type={blueprint.shipType} />
        <div className="dg-shipyard-identity"><span className="dg-yard-eyebrow">Shipyard · configuration</span><h2>Edit {blueprint.shipType}</h2><p>Fit your ship below. Every ship of this class uses this blueprint.</p></div>
        <div className={`dg-reactor-readout ${stats.energyProduction < stats.energyConsumption ? "dg-danger" : ""}`}><span>Reactor balance</span><strong>{stats.energyProduction - stats.energyConsumption} energy available</strong><small>{stats.energyProduction} generated / {stats.energyConsumption} used</small></div>
      </header>
      <section className="dg-blueprint-canvas" aria-label="Blueprint hardpoints">
        <div className="dg-blueprint-canvas-heading">
          <div><h3>Blueprint hardpoints</h3><p>Choose a hardpoint, then select a component from the parts tray.</p></div>
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
              onClick={() => setSelectedSlot(index)}
            >
              <span className="dg-slot-title"><b>{String(index + 1).padStart(2, "0")}</b> {part ? "Installed" : printed[index] ? "Printed" : "Open"}</span>
              {effectivePart ? <><strong>{getShipPart(effectivePart).name}</strong><ShipPartStats partId={effectivePart} /></> : <strong className="dg-slot-empty">Open hardpoint</strong>}
              <small>{isSelected ? "Selecting components below" : "Select hardpoint"}</small>
            </button>;
          })}
        </div>
      </section>
      <section className="dg-parts-tray" aria-label={`Parts tray for slot ${selectedSlot + 1}`}>
        <header>
          <div><span className="dg-yard-eyebrow">Selected hardpoint {selectedSlot + 1}</span><h3>{selectedEffectivePart ? `${getShipPart(selectedEffectivePart).name} is installed` : "Open hardpoint"}</h3></div>
          <p>{selectedPart ? "Choose a part to replace the installed overlay, or reveal the printed component." : selectedPrinted ? "The printed component is active until you install an overlay." : "Install any available grid component here."}</p>
        </header>
        <div className="dg-slot-replacement" role="status" aria-label={`Slot ${selectedSlot + 1} replacement preview`}>
          <span>Current <strong>{previousEffectivePart ? getShipPart(previousEffectivePart).name : "Empty"}</strong></span><b aria-hidden="true">→</b><span>Draft <strong>{selectedEffectivePart ? getShipPart(selectedEffectivePart).name : "Empty"}</strong></span>
        </div>
        <div className="dg-parts-tray-grid dg-part-reveal-row" role="group" aria-label={`Available parts for slot ${selectedSlot + 1}`}>
          <button
            type="button"
            className={`dg-part-choice dg-part-reveal${selectedPart === null ? " is-selected" : ""}`}
            aria-label={`Reveal printed component in slot ${selectedSlot + 1}`}
            aria-pressed={selectedPart === null}
            onClick={() => installPart(null)}
            disabled={disabled}
          >
            <span className="dg-part-choice-title">{selectedPrinted ? "Reveal printed component" : "Leave hardpoint empty"}</span>
            <small>{selectedPrinted ? getShipPart(selectedPrinted).name : "No component"}</small>
          </button>
        </div>
        {partGroups.map((group) => <section className="dg-part-group" key={group.name} aria-label={group.name}>
          <h4>{group.name}</h4>
          <div className="dg-parts-tray-grid">
            {group.parts.map((part) => <button
              key={part.id}
              type="button"
              className={`dg-part-choice${selectedPart === part.id ? " is-selected" : ""}`}
              aria-label={`Install ${part.name} in slot ${selectedSlot + 1}`}
              aria-pressed={selectedPart === part.id}
              disabled={disabled}
              onClick={() => installPart(part.id)}
            >
              <span className="dg-part-choice-title">{part.name}</span>
              <ShipPartStats partId={part.id} />
              <small>{describeShipPart(part.id)}</small>
            </button>)}
          </div>
        </section>)}
        <details className="dg-unavailable-parts">
          <summary>Unavailable components</summary>
          <div>{SHIP_PARTS.filter((part) => !available.includes(part)).map((part) => <button key={part.id} type="button" disabled aria-label={`${part.name} unavailable: ${unavailableReason(part)}`}><strong>{part.name}</strong><small>{unavailableReason(part)}</small></button>)}</div>
        </details>
        <p className="dg-part-effect" data-testid={`slot-effect-${selectedSlot + 1}`}>{selectedEffectivePart ? describeShipPart(selectedEffectivePart) : "Empty slot: install a part here without covering a printed part."}</p>
      </section>
      {available
        .filter((p) => p.placement === "outside")
        .map((p) => (
          <label className="dg-check" key={p.id}>
            <input
              type="checkbox"
              disabled={blueprint.outsideParts.includes(p.id)}
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
        <tbody>{comparison.map(([label, before, after]) => <tr key={label} className={before === after ? "" : "dg-stat-changed"}><th scope="row">{label}</th><td>{before}</td><td>{after}{before !== after && <span className="dg-stat-change"> changed</span>}</td></tr>)}</tbody>
      </table>
      <p>Parts installed: {changes} / {capacity}. Removing an overlay reveals its printed part.</p>
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
      {changes > capacity && (
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
          changes > capacity
        }
        onClick={() => onSubmit({ type: "upgrade", blueprints: [draft] })}
      >
        Confirm blueprint
      </button>
      <button onClick={() => setDraft(structuredClone(blueprint))}>
        Reset draft
      </button>
      </div>
    </section>
  );
}
