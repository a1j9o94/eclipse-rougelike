import {useCommitLabel} from './commitContext';
import AdvancedPlanetBadge from './AdvancedPlanetBadge';
import {DecisionMapContext} from './decisionMapContext';
import { useContext, useEffect, useMemo, useState } from "react";
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import { previewCommand } from "../../shared/eclipse/commandPreview";
import type { GameCommand, PendingDecision, PlayerView, Resource } from "../../shared/eclipse/types";
import ActionEconomy from "./ActionEconomy";
import { PlanetIcon, type PlanetResource } from "./SectorPlanets";
import { TradeResourceIcon } from "./TradePanel";
import type { CommandCandidate } from "./SecondDawnBoard";
import { colonizationOptions, decisionColonizationOptions, previewColonizationDraft, type PlanetOption } from "./colonizationPlanning";
import "./colonizationPlanner.css";

type ColonizeCommand = Extract<GameCommand, { type: "colonize" }>;
const resourceName = (resource: Resource) => resource[0].toUpperCase() + resource.slice(1);
const planetName = (resource: PlanetResource) =>
  resource === "gray" ? "Any resource" : resource === "orbital" ? "Orbital" : resourceName(resource);

export interface ColonizationPlannerProps {
  view: PlayerView;
  candidates: readonly CommandCandidate[];
  disabled: boolean;
  onSubmit: (command: GameCommand) => void;
  /** Selecting a controlled sector on the galaxy narrows the visible planet grid. */
  selectedSectorId?: string | null;
  /** An outstanding automatic-colonization choice uses the same editable planet tray. */
  decision?: Extract<PendingDecision, { kind: "colonization" }>;
  onColonizableSectorIdsChange?: (ids: readonly string[]) => void;
  onSectorFocus?: (sectorId: string) => void;
}

/**
 * Colonization stays candidate-driven: resource chips select between existing
 * legal commands, so advanced/gray/orbital rules remain server authoritative.
 */
export default function ColonizationPlanner({
  view,
  candidates,
  disabled,
  onSubmit,
  selectedSectorId: suppliedSectorId,
  decision,
  onColonizableSectorIdsChange,
  onSectorFocus,
}: ColonizationPlannerProps) {
  const commitLabel=useCommitLabel();
  const sharedMap=useContext(DecisionMapContext);
  const decisionMap=decision?sharedMap:null;
  const boardSelectedSectorId=decisionMap?.selectedSectorId??suppliedSectorId;
  const setMapPresentation=decisionMap?.setPresentation;
  const options = useMemo(() => decision ? decisionColonizationOptions(view, decision) : colonizationOptions(view, candidates), [view, candidates, decision]);
  const [chosen, setChosen] = useActionDraftState('colonization',{}, {enabled:!decision});
  const [focusedKey, setFocusedKey] = useActionDraftState('colonizationFocus',null, {enabled:!decision});
  const draftGuard=useActionDraftGuard();
  const invalidPlacements=Object.entries(chosen).filter(([key,resource])=>!options.some(option=>`${option.sectorId}:${option.squareId}`===key&&option.resources.includes(resource)));
  const draftLegal=invalidPlacements.length===0;
  const focused = options.find((option) => `${option.sectorId}:${option.squareId}` === focusedKey) ?? null;
  const placements = useMemo(() => options.flatMap((option) => {
    const key = `${option.sectorId}:${option.squareId}`;
    const resource = chosen[key];
    return resource ? [{ sectorId: option.sectorId, squareId: option.squareId, resource }] : [];
  }), [options, chosen]);
  const selected = focused ?? options.find((option) => chosen[`${option.sectorId}:${option.squareId}`]) ?? null;
  const allowedResources = selected?.resources ?? [];
  const normalCommand = useMemo<ColonizeCommand>(() => ({ type: "colonize", placements }), [placements]);
  const command = useMemo<GameCommand | undefined>(() => placements.length
    ? decision
      ? { type: "resolve", decisionId: decision.id, choice: { kind: "colonization", placements } }
      : normalCommand
    : undefined, [decision, normalCommand, placements]);
  const preview = !decision && placements.length ? previewCommand(view, normalCommand) : null;
  const own = view.seats.find((seat) => seat.id === view.viewerSeatId);
  const sectors = useMemo(()=>[...new Set(options.map((option) => option.sectorId))],[options]);
  useEffect(()=>{if(!setMapPresentation)return;setMapPresentation({view,legalTargetIds:sectors,targetLabel:'available planet',plannedColonies:placements});return()=>setMapPresentation(null);},[setMapPresentation,view,sectors,placements]);
  const [localSectorId,setLocalSectorId]=useState<string|null>(boardSelectedSectorId??null);
  const selectedSectorId = boardSelectedSectorId && sectors.includes(boardSelectedSectorId) ? boardSelectedSectorId : localSectorId && sectors.includes(localSectorId) ? localSectorId : focused?.sectorId ?? sectors[0] ?? null;
  const visibleOptions = options.filter((option) => option.sectorId === selectedSectorId);
  const choosePlanet = (option: PlanetOption) => {
    const key = `${option.sectorId}:${option.squareId}`;
    setFocusedKey(key);
    setChosen((current) => !current[key]&&option.resources.length===1?{...current,[key]:option.resources[0]}:current);
  };
  const consequences=previewColonizationDraft(view,placements);
  const withinSupply = consequences.legal;
  const chooseResource = (resource: Resource) => {
    if (!selected) return;
    const key = `${selected.sectorId}:${selected.squareId}`;
    setChosen((current) => ({ ...current, [key]: resource }));
  };
  useEffect(()=>{onColonizableSectorIdsChange?.(sectors);},[onColonizableSectorIdsChange,sectors]);
  return (
    <section className="dg-colonization-planner" aria-label="Colonization planner">
      <header>
        <div><small>COLONIZATION</small><h2>Populate your controlled sectors</h2></div>
        <output aria-label="Colony ships available"><b>{own?.colonyShipsAvailable ?? 0}</b><span>colony ships ready</span></output>
      </header>
      <p>No action disc · Place population on open planets</p>
      {!options.length ? (
        <p role="status">No compatible empty planets can be colonized now. You may need a colony ship, population cube, advanced technology, or your action turn.</p>
      ) : (
        <div className="dg-colonization-layout">
          <section className="dg-colonization-squares" aria-labelledby="colonize-square-title">
            <h3 id="colonize-square-title">Open population spaces</h3>
            {sectors.length>1&&<nav className="dg-colonization-sectors" aria-label="Colonizable sectors">{sectors.map(id=>{const sector=view.sectors.find(candidate=>candidate.id===id)!;const selectedCount=placements.filter(placement=>placement.sectorId===id).length;return <button key={id} type="button" aria-pressed={selectedSectorId===id} onClick={()=>{setLocalSectorId(id);onSectorFocus?.(id);decisionMap?.selectSector(id);decisionMap?.focusSector(id);}}>Sector {sector.tileId}<small>{selectedCount?`${selectedCount} selected`:`${options.filter(option=>option.sectorId===id).length} open`}</small></button>;})}</nav>}
            {visibleOptions.map((option) => {
              const sector = view.sectors.find((candidate) => candidate.id === option.sectorId)!;
              const key = `${option.sectorId}:${option.squareId}`;
              const isSelected = !!chosen[key];
              return (
                <button
                  type="button"
                  key={`${option.sectorId}:${option.squareId}`}
                  className={`dg-colonization-square ${isSelected ? "is-selected" : focusedKey===key ? "is-focused" : ""}`}
                  aria-pressed={isSelected}
                  aria-label={`Colonize ${planetName(option.resource)} planet ${option.squareId} in sector ${sector.tileId}${option.advanced ? ", advanced" : ""}`}
                  disabled={disabled}
                  onClick={() => choosePlanet(option)}
                >
                  <span className="dg-colonization-orb" style={{ color: option.resource === "science" ? "#b397da" : option.resource === "materials" ? "#b89675" : option.resource === "money" ? "#e7bd67" : "#b5c3cd" }}>
                    <svg viewBox="0 0 20 20" aria-hidden="true"><PlanetIcon resource={option.resource} /></svg>
                    {option.advanced && <AdvancedPlanetBadge className="dg-colonization-advanced"/>}
                  </span>
                  <span><strong>{planetName(option.resource)}</strong><small>Sector {sector.tileId} · {option.advanced ? "Advanced" : "Standard"}</small></span>
                </button>
              );
            })}
          </section>
          <aside className="dg-colonization-detail">
            {selected ? (
              <section className="dg-colonization-resource" aria-label="Population cube choice">
                <h3>Population cube</h3>
                {allowedResources.length===1?<p><TradeResourceIcon resource={allowedResources[0]}/>{resourceName(allowedResources[0])} population planned</p>:<div>{allowedResources.map((choice) => <button key={choice} type="button" aria-label={`${resourceName(choice)} population`} aria-pressed={chosen[`${selected.sectorId}:${selected.squareId}`] === choice} disabled={disabled} onClick={() => chooseResource(choice)}><TradeResourceIcon resource={choice}/><span>{resourceName(choice)}</span><small>{own?.populationTracks[choice] ?? 0} on track</small></button>)}</div>}
                {chosen[`${selected.sectorId}:${selected.squareId}`]&&<button type="button" disabled={disabled} onClick={()=>setChosen(current=>Object.fromEntries(Object.entries(current).filter(([key])=>key!==`${selected.sectorId}:${selected.squareId}`)))}>Remove this colony</button>}
              </section>
            ) : <p>Select a planet to see its compatible population cubes.</p>}
          </aside>
        </div>
      )}
      {invalidPlacements.map(([key,resource])=><p key={key} role="status">{resourceName(resource)} colony on sector {view.sectors.find(sector=>sector.id===key.split(':')[0])?.tileId??'no longer present'}, space {key.split(':')[1]}, is no longer available. <button type="button" onClick={()=>setChosen(current=>Object.fromEntries(Object.entries(current).filter(([id])=>id!==key)))}>Remove unavailable colony</button></p>)}
      {(command || decision) && (
        <footer className="dg-colonization-confirm">
          <details><summary>Action and upkeep details</summary><ActionEconomy view={view} action="colonize" preview={preview} /></details>
          <section className="dg-colonization-payoff" aria-label="Colonization consequences"><h3>What this changes</h3><p><strong>Colony ships</strong><span>{consequences.colonyShipsBefore} → {consequences.colonyShipsAfter}</span></p>{consequences.resources.filter(resource=>resource.placements>0).map(resource=><p key={resource.resource}><strong>{resourceName(resource.resource)}</strong><span>{resource.cubesBefore} → {resource.cubesAfter} cubes · income {resource.incomeBefore} → {resource.incomeAfter} <b>+{resource.incomeDelta}</b></span></p>)}</section>
          <p>{placements.length ? `Populate ${placements.length} planet${placements.length === 1 ? "" : "s"} across ${new Set(placements.map(placement=>placement.sectorId)).size} sector${new Set(placements.map(placement=>placement.sectorId)).size===1?'':'s'}.` : "You may finish without placing population."}</p>
          {placements.length > 0 && !withinSupply && <p className="dg-danger" role="status">{placements.length>consequences.colonyShipsBefore?`Need ${placements.length} colony ships; ${consequences.colonyShipsBefore} ready. `:''}{consequences.resources.filter(resource=>resource.placements>resource.cubesBefore).map(resource=>`Need ${resource.placements} ${resource.resource} cubes; ${resource.cubesBefore} available.`).join(' ')}</p>}
          {command && <button type="button" className="sd-primary" disabled={disabled || !withinSupply || !draftLegal || (!decision&&draftGuard.stale)} onClick={() => {if(!decision)draftGuard.markSubmitted(command);onSubmit(command);}}>{commitLabel(decision ? "Finish colonization" : `Colonize ${placements.length} planet${placements.length===1?'':'s'}`)}</button>}
          {decision && <button type="button" disabled={disabled} onClick={() => onSubmit({ type: "resolve", decisionId: decision.id, choice: { kind: "colonization", placements: [] } })}>Finish without colonizing</button>}
        </footer>
      )}
    </section>
  );
}
