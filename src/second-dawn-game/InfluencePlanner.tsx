import { useEffect, useMemo, useRef, useState } from "react";
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import { previewCommand } from "../../shared/eclipse/commandPreview";
import type { GameCommand, PlayerView } from "../../shared/eclipse/types";
import { getFaction } from "../../shared/eclipse/catalog";
import ActionEconomy from "./ActionEconomy";
import type { CommandCandidate } from "./SecondDawnBoard";
import { influenceChoices } from "./influencePlanning";
import { sectorDefinition } from "../../shared/eclipse/sectors";
import { PlanetIcon } from "./SectorPlanets";
import "./influencePlanner.css";

export interface InfluencePlannerProps {
  view: PlayerView;
  candidates: readonly CommandCandidate[];
  disabled: boolean;
  onSubmit: (command: GameCommand) => void;
  /** Selecting a galaxy sector offers control; it never selects withdrawal. */
  selectedSectorId?: string | null;
  onLegalTargetIdsChange?: (legalTargetIds: string[]) => void;
  onSectorFocus?: (sectorId: string) => void;
}

function SectorChoice({ sectorId, view, purpose, selected, disabled, onClick }: {
  sectorId: string; view: PlayerView; purpose: "withdraw" | "control" | "transfer";
  selected: boolean; disabled: boolean; onClick: () => void;
}) {
  const sector = view.sectors.find(candidate => candidate.id === sectorId);
  if (!sector) return null;
  const definition = sectorDefinition(Number(sector.tileId));
  const label = purpose === 'transfer' ? `Use disc from sector ${sector.tileId}` : `Select sector ${sector.tileId} to ${purpose}`;
  return <button type="button" className={`dg-influence-sector ${purpose !== 'control' ? 'is-withdrawal' : ''} ${selected ? 'is-selected' : ''}`} aria-pressed={selected} aria-label={label} disabled={disabled} onClick={onClick}>
    <span className="dg-influence-hex" aria-hidden="true"><span>{sector.tileId}</span><i>{purpose === 'control' ? '+' : '−'}</i></span>
    <span><strong>{purpose === 'transfer' ? 'Use this disc' : `Sector ${sector.tileId}`}</strong>
      <small>{purpose === 'control' ? `${definition?.victoryPoints ?? 0} VP · Uncontrolled` : `Lose ${definition?.victoryPoints ?? 0} VP · return ${sector.population.length} population`}</small>
      <span className="dg-influence-planets" aria-label="Sector planets">{definition?.population.map((planet,index)=><span key={index} title={`${planet.advanced ? 'Advanced ' : ''}${planet.resource} planet`}><svg viewBox="0 0 20 20" aria-hidden="true"><PlanetIcon resource={planet.resource}/></svg>{planet.advanced&&<b aria-label="Advanced">★</b>}</span>)}</span>
    </span>
  </button>;
}

/** Every staged choice is an authoritative candidate, including transfer and refresh. */
export default function InfluencePlanner({ view, candidates, disabled, onSubmit, selectedSectorId, onLegalTargetIdsChange, onSectorFocus }: InfluencePlannerProps) {
  const choices = useMemo(() => influenceChoices(candidates), [candidates]);
  const [sourceId, setSourceId] = useActionDraftState('influenceSource',null);
  const [draft, setDraft] = useActionDraftState('influenceDraft',null);
  const [focusedId,setFocusedId] = useState<string|null>(()=>draft?.command.type==='influence' ? draft.command.addSectorIds[0]??null : null);
  const draftGuard=useActionDraftGuard();
  const firstSelection=useRef(true);
  const own=view.seats.find(seat=>seat.id===view.viewerSeatId);
  const selected=view.sectors.find(sector=>sector.id===focusedId);
  const owner=view.seats.find(seat=>seat.id===selected?.owner);
  const transfers=useMemo(()=>[...choices.transfersBySource.values()].flat(),[choices]);
  const targetIds=useMemo(()=>[...new Set([...choices.addOnly,...transfers].flatMap(candidate=>candidate.command.type==='influence'?candidate.command.addSectorIds:[]))],[choices,transfers]);
  const selectedTransfers=transfers.filter(candidate=>candidate.command.type==='influence'&&candidate.command.addSectorIds[0]===focusedId);
  const draftLegal=!!draft&&candidates.some(candidate=>JSON.stringify(candidate.command)===JSON.stringify(draft.command));
  const preview=draft?previewCommand(view,draft.command):null;
  const removed=draft?.command.type==='influence'?draft.command.removeSectorIds:[];
  const added=draft?.command.type==='influence'?draft.command.addSectorIds:[];
  const tile=(id:string)=>view.sectors.find(sector=>sector.id===id)?.tileId??id;
  const confirmation=removed.length ? added.length ? `Withdraw from ${removed.map(tile).join(', ')} and control ${added.map(tile).join(', ')}` : `Withdraw from sector ${removed.map(tile).join(', ')}` : added.length ? `Take control of sector ${added.map(tile).join(', ')}` : 'Confirm refresh colony ships';
  const chooseTarget=(id:string)=>{
    setFocusedId(id);setSourceId(null);
    setDraft(choices.addOnly.find(candidate=>candidate.command.type==='influence'&&candidate.command.addSectorIds[0]===id)??null);
  };
  useEffect(()=>{onLegalTargetIdsChange?.(targetIds);},[onLegalTargetIdsChange,targetIds]);
  useEffect(()=>{
    if(firstSelection.current){firstSelection.current=false;if(draft)return;}
    if(selectedSectorId)chooseTarget(selectedSectorId);
    // Map selection is a deliberate draft change. Candidate refresh must not replace a saved selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectedSectorId]);
  const reset=()=>{setSourceId(null);setDraft(null);setFocusedId(null);};
  const hasChoices=!!choices.refresh||choices.removeOnly.length>0||targetIds.length>0;

  return <section className="dg-influence-planner" aria-label="Influence planner">
    <header><div><small>INFLUENCE</small><h2>{selected||draft?'Influence':'Choose a sector to control'}</h2></div><output aria-label="Influence discs remaining"><b>{own?.influenceOnTrack??0}</b><span>influence discs</span></output></header>
    {!selected&&!draft&&<p className="dg-influence-guide">Select a highlighted sector on the galaxy, then take control.</p>}
    {!hasChoices&&<p role="status">No legal influence changes are available. Finish the current action, remove enemy ships, or free an influence disc.</p>}
    {selected&&<section className="dg-influence-selected" aria-label="Selected influence sector">
      <h3>Sector {selected.tileId}</h3>
      {selected.owner===view.viewerSeatId?<p>You already control this sector.</p>:owner?<p>Controlled by {getFaction(owner.faction).name??owner.faction}. You cannot take control with Influence.</p>:targetIds.includes(selected.id)?<p>{sectorDefinition(Number(selected.tileId))?.victoryPoints??0} VP · Control unlocks its empty planets for colonization.</p>:<p>You cannot control this sector now. It needs a legal connection and no blocking enemy ships.</p>}
      {selected.owner===view.viewerSeatId&&<p>Choose an uncontrolled sector to expand. Giving up territory is a separate option below.</p>}
      {selectedTransfers.length>0&&<details className="dg-influence-transfer" open={!choices.addOnly.some(candidate=>candidate.command.type==='influence'&&candidate.command.addSectorIds[0]===focusedId)}>
        <summary>{choices.addOnly.some(candidate=>candidate.command.type==='influence'&&candidate.command.addSectorIds[0]===focusedId)?'Use a disc from an existing sector instead':'Choose a sector to give up for its disc'}</summary>
        <p>This withdraws control from the source. Its population returns and you lose its sector points.</p>
        <div className="dg-influence-sector-list">{selectedTransfers.map(candidate=>candidate.command.type==='influence'&&<SectorChoice key={candidate.command.removeSectorIds.join('-')} sectorId={candidate.command.removeSectorIds[0]} view={view} purpose="transfer" selected={draft===candidate} disabled={disabled} onClick={()=>{if(candidate.command.type==='influence')setSourceId(candidate.command.removeSectorIds[0]);setDraft(candidate);}}/>)}</div>
      </details>}
    </section>}
    {draft&&<footer className={`dg-influence-confirm ${removed.length?'is-withdrawal':''}`}>
      {!draftLegal&&<p role="status">This saved influence choice is no longer legal. Choose another sector or clear the draft.</p>}
      <div className="dg-influence-stakes" aria-label="Territory consequences">
        {removed.map(id=>{const sector=view.sectors.find(item=>item.id===id);return sector?<p key={id}><strong>Withdraw from sector {sector.tileId}</strong> · lose {sectorDefinition(Number(sector.tileId))?.victoryPoints??0} sector VP · {sector.population.length} population cubes return in the next choice.</p>:null;})}
        {added.map(id=><p key={id}><strong>Take control of sector {tile(id)}</strong> · gain {sectorDefinition(Number(tile(id)))?.victoryPoints??0} sector VP.</p>)}
        {!removed.length&&!added.length&&<p>Refresh up to two colony ships as an Influence action.</p>}
      </div>
      {preview&&<p className="dg-influence-cost">Round-end upkeep: {preview.upkeepAfter} money · {preview.resourcesAfter.money + preview.moneyIncomeAfter - preview.upkeepAfter < 0 ? `${preview.upkeepAfter - preview.resourcesAfter.money - preview.moneyIncomeAfter} money short` : `${preview.resourcesAfter.money + preview.moneyIncomeAfter - preview.upkeepAfter} money left`}{preview.populationChoiceMayChangeIncome?' before population choices':''}</p>}
      <details className="dg-influence-cost-details"><summary>Action and upkeep details</summary><ActionEconomy view={view} action="influence" preview={preview}/></details>
      <button type="button" className={removed.length?'dg-influence-danger':'sd-primary'} disabled={disabled||draftGuard.stale||!draftLegal} onClick={()=>{if(!disabled&&!draftGuard.stale&&draftLegal)onSubmit(draft.command);}}>{confirmation}</button>
      <button type="button" disabled={disabled} onClick={reset}>Clear selection</button>
    </footer>}
    {targetIds.length>0&&<section className="dg-influence-destinations" aria-label="Available sectors to control"><h3>Available sectors</h3><div className="dg-influence-sector-list">{targetIds.map(id=><SectorChoice key={id} sectorId={id} view={view} purpose="control" selected={focusedId===id} disabled={disabled} onClick={()=>{chooseTarget(id);onSectorFocus?.(id);}}/>)}</div></section>}
    <div className="dg-influence-other">
      {choices.refresh&&<button type="button" className="dg-influence-refresh" aria-label="Refresh colony ships" disabled={disabled} onClick={()=>{setFocusedId(null);setSourceId(null);setDraft(choices.refresh);}}><span aria-hidden="true">↻</span><span><strong>Refresh colony ships</strong><small>Restore up to two colony ships.</small></span></button>}
      {choices.removeOnly.length>0&&<details className="dg-influence-withdraw"><summary>Withdraw control from a sector</summary><p>Give up territory: lose its sector VP and return its population. This does not claim a new sector.</p><div className="dg-influence-sector-list">{choices.removeOnly.map(candidate=>candidate.command.type==='influence'&&<SectorChoice key={candidate.command.removeSectorIds.join('-')} sectorId={candidate.command.removeSectorIds[0]} view={view} purpose="withdraw" selected={sourceId===candidate.command.removeSectorIds[0]&&draft===candidate} disabled={disabled} onClick={()=>{if(candidate.command.type==='influence')setSourceId(candidate.command.removeSectorIds[0]);setFocusedId(null);setDraft(candidate);}}/>)}</div></details>}
    </div>
  </section>;
}
