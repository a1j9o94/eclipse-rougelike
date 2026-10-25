import {useCommitLabel} from './commitContext';
import CommitBar from './CommitBar';
import {DecisionMapContext} from './decisionMapContext';
import { useContext, useEffect, useMemo, useState } from "react";
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import type { GameCommand, PendingDecision, PlayerView, Resource } from "../../shared/eclipse/types";
import SectorPlanets from "./SectorPlanets";
import ActionIcon from './ActionIcon';
import { TradeResourceIcon } from "./TradePanel";
import type { CommandCandidate } from "./SecondDawnBoard";
import { colonizationOptions, decisionColonizationOptions, previewColonizationDraft, type PlanetOption } from "./colonizationPlanning";
import "./colonizationPlanner.css";

type ColonizeCommand = Extract<GameCommand, { type: "colonize" }>;
const resourceName = (resource: Resource) => resource[0].toUpperCase() + resource.slice(1);


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
        <div><small>COLONIZATION</small><h2>Colonize</h2></div>
        <output aria-label="Colony ships available"><b>{own?.colonyShipsAvailable ?? 0}</b><span>colony ships ready</span></output>
      </header>
      <div className="dg-colonization-body">
      {!options.length ? <p role="status">{own?.colonyShipsAvailable===0?'No colony ships ready.':'No available planets.'}</p> : <div className="dg-colonization-layout">
        {sectors.length>1&&<nav className="dg-colonization-sectors" aria-label="Colonizable sectors">{sectors.map(id=>{const sector=view.sectors.find(candidate=>candidate.id===id)!;const selectedCount=placements.filter(placement=>placement.sectorId===id).length;return <button key={id} type="button" aria-pressed={selectedSectorId===id} onClick={()=>{setLocalSectorId(id);onSectorFocus?.(id);decisionMap?.selectSector(id);decisionMap?.focusSector(id);}}>Sector {sector.tileId}{selectedCount>0&&<small>{selectedCount} planned</small>}</button>;})}</nav>}
        {view.sectors.filter(sector=>sector.id===selectedSectorId).map(sector=><SectorPlanets key={sector.id} sector={sector} view={view} candidates={[...candidates]} selection={{label:'Colonize',eligibleSquareIds:visibleOptions.map(option=>option.squareId),selectedSquareId:focused?.squareId,disabled,planned:Object.fromEntries(placements.filter(placement=>placement.sectorId===sector.id).map(placement=>[placement.squareId,placement.resource])),onSelect:squareId=>{const option=visibleOptions.find(item=>item.squareId===squareId);if(option)choosePlanet(option);}}}/>)}
        {selected&&<section className="dg-colonization-resource" aria-label="Population cube choice">
          {allowedResources.length>1&&<><h3>Choose population</h3><div>{allowedResources.map(choice=><button key={choice} type="button" aria-label={`${resourceName(choice)} population`} aria-pressed={chosen[`${selected.sectorId}:${selected.squareId}`]===choice} disabled={disabled} onClick={()=>chooseResource(choice)}><TradeResourceIcon resource={choice}/><span>{resourceName(choice)}</span></button>)}</div></>}
          {chosen[`${selected.sectorId}:${selected.squareId}`]&&<button type="button" disabled={disabled} onClick={()=>setChosen(current=>Object.fromEntries(Object.entries(current).filter(([key])=>key!==`${selected.sectorId}:${selected.squareId}`)))}>Remove this colony</button>}
        </section>}
      </div>}
      {invalidPlacements.map(([key,resource])=><p key={key} role="status">{resourceName(resource)} colony on sector {view.sectors.find(sector=>sector.id===key.split(':')[0])?.tileId??'no longer present'}, space {key.split(':')[1]}, is no longer available. <button type="button" onClick={()=>setChosen(current=>Object.fromEntries(Object.entries(current).filter(([id])=>id!==key)))}>Remove unavailable colony</button></p>)}
      {placements.length>0&&<div className="dg-colonization-payoff" role="region" aria-label="Colonization consequences">{consequences.resources.filter(resource=>resource.placements>0).map(resource=><span key={resource.resource}><TradeResourceIcon resource={resource.resource}/><span>{resourceName(resource.resource)} income <b>{resource.incomeBefore} → {resource.incomeAfter}</b><small>Round end</small></span></span>)}</div>}
      {placements.length > 0 && !withinSupply && <p className="dg-danger" role="status">{placements.length>consequences.colonyShipsBefore?`Need ${placements.length} colony ships; ${consequences.colonyShipsBefore} ready. `:''}{consequences.resources.filter(resource=>resource.placements>resource.cubesBefore).map(resource=>`Need ${resource.placements} ${resource.resource} cubes; ${resource.cubesBefore} available.`).join(' ')}</p>}
      </div>
      {(command || decision) && (
        <CommitBar className="dg-colonization-confirm" summary={placements.length>0&&<span className="dg-colonization-ship-cost" aria-label={`Colony ships ${consequences.colonyShipsBefore} → ${consequences.colonyShipsAfter}`}><ActionIcon kind="colonize"/><span className="sr-only">Colony ships </span><b>{consequences.colonyShipsBefore} → {consequences.colonyShipsAfter}</b></span>}>
          {command && <button type="button" className="sd-primary" disabled={disabled || !withinSupply || !draftLegal || (!decision&&draftGuard.stale)} onClick={() => {if(!decision)draftGuard.markSubmitted(command);onSubmit(command);}}>{commitLabel(decision ? "Finish colonization" : `Colonize ${placements.length} planet${placements.length===1?'':'s'}`)}</button>}
          {decision && <button type="button" disabled={disabled} onClick={() => onSubmit({ type: "resolve", decisionId: decision.id, choice: { kind: "colonization", placements: [] } })}>Finish without colonizing</button>}
        </CommitBar>
      )}
    </section>
  );
}
