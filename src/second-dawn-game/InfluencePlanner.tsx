import CommitBar from './CommitBar';
import {useCommitLabel} from './commitContext';
import AdvancedPlanetBadge from './AdvancedPlanetBadge';
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
    <span><strong>{selected&&<span aria-hidden="true">✓ </span>}{purpose === 'transfer' ? 'Use this disc' : `Sector ${sector.tileId}`}</strong>
      <small>{purpose === 'control' ? `${definition?.victoryPoints ?? 0} VP · Uncontrolled` : `Lose ${definition?.victoryPoints ?? 0} VP · return ${sector.population.length} population`}</small>
      <span className="dg-influence-planets" aria-label="Sector planets">{definition?.population.map((planet,index)=><span key={index} title={`${planet.advanced ? 'Advanced ' : ''}${planet.resource} planet`}><svg viewBox="0 0 20 20" aria-hidden="true"><PlanetIcon resource={planet.resource}/></svg>{planet.advanced&&<AdvancedPlanetBadge className="dg-influence-advanced"/>}</span>)}</span>
    </span>
  </button>;
}

/** Every staged choice is an authoritative candidate, including transfer and refresh. */
export default function InfluencePlanner({ view, candidates, disabled, onSubmit, selectedSectorId, onLegalTargetIdsChange, onSectorFocus }: InfluencePlannerProps) {
  const commitLabel=useCommitLabel();
  const choices = useMemo(() => influenceChoices(candidates), [candidates]);
  const [sourceId, setSourceId] = useActionDraftState('influenceSource',null);
  const [draft, setDraft] = useActionDraftState('influenceDraft',null);
  const [focusedId,setFocusedId] = useState<string|null>(()=>draft?.command.type==='influence' ? draft.command.addSectorIds[0]??null : null);
  const [choosingSource,setChoosingSource]=useState(false);
  const [sourceIssue,setSourceIssue]=useState<string|null>(null);
  const draftGuard=useActionDraftGuard();
  const firstSelection=useRef(true);
  const own=view.seats.find(seat=>seat.id===view.viewerSeatId);
  const selected=view.sectors.find(sector=>sector.id===focusedId);
  const owner=view.seats.find(seat=>seat.id===selected?.owner);
  const transfers=useMemo(()=>[...choices.transfersBySource.values()].flat(),[choices]);
  const targetIds=useMemo(()=>[...new Set([...choices.addOnly,...transfers].flatMap(candidate=>candidate.command.type==='influence'?candidate.command.addSectorIds:[]))],[choices,transfers]);
  const selectedTransfers=useMemo(()=>transfers.filter(candidate=>candidate.command.type==='influence'&&candidate.command.addSectorIds[0]===focusedId),[transfers,focusedId]);
  const sourceIds=useMemo(()=>[...new Set(selectedTransfers.flatMap(candidate=>candidate.command.type==='influence'?candidate.command.removeSectorIds:[]))],[selectedTransfers]);
  const mapTargetIds=choosingSource?sourceIds:targetIds;
  const draftLegal=!!draft&&candidates.some(candidate=>JSON.stringify(candidate.command)===JSON.stringify(draft.command));
  const preview=draft?previewCommand(view,draft.command):null;
  const removed=draft?.command.type==='influence'?draft.command.removeSectorIds:[];
  const added=draft?.command.type==='influence'?draft.command.addSectorIds:[];
  const tile=(id:string)=>view.sectors.find(sector=>sector.id===id)?.tileId??id;
  const confirmation=removed.length ? added.length ? `Withdraw from ${removed.map(tile).join(', ')} and control ${added.map(tile).join(', ')}` : `Withdraw from sector ${removed.map(tile).join(', ')}` : added.length ? `Take control of sector ${added.map(tile).join(', ')}` : 'Confirm refresh colony ships';
  const compactConfirmation=removed.length?(added.length?'Transfer disc':`Withdraw ${removed.map(tile).join(', ')}`):added.length?`Control ${added.map(tile).join(', ')}`:'Refresh colony ships';
  const chooseTarget=(id:string)=>{
    setFocusedId(id);setChoosingSource(false);setSourceIssue(null);
    if(sourceId&&targetIds.includes(id)){
      const transfer=transfers.find(candidate=>candidate.command.type==='influence'&&candidate.command.removeSectorIds[0]===sourceId&&candidate.command.addSectorIds[0]===id);
      setDraft(transfer??{command:{type:'influence',removeSectorIds:[sourceId],addSectorIds:[id]},label:'Transfer control',description:''});
    }else setDraft(choices.addOnly.find(candidate=>candidate.command.type==='influence'&&candidate.command.addSectorIds[0]===id)??null);
  };
  const chooseSource=(id:string)=>{
    const transfer=selectedTransfers.find(candidate=>candidate.command.type==='influence'&&candidate.command.removeSectorIds[0]===id);
    if(!transfer){setSourceIssue('Choose a highlighted controlled sector whose disc can reach this destination.');return;}
    setSourceId(id);setDraft(transfer);setChoosingSource(false);setSourceIssue(null);
  };
  useEffect(()=>{onLegalTargetIdsChange?.(mapTargetIds);},[onLegalTargetIdsChange,mapTargetIds]);
  useEffect(()=>{
    if(firstSelection.current){firstSelection.current=false;if(draft)return;}
    if(selectedSectorId){if(choosingSource)chooseSource(selectedSectorId);else chooseTarget(selectedSectorId);}
    // Map selection is a deliberate draft change. Candidate refresh must not replace a saved selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectedSectorId]);
  const hasChoices=!!choices.refresh||choices.removeOnly.length>0||targetIds.length>0;
  const consequencePreview=draft&&<div className="dg-influence-preview">
    {!draftLegal&&<p role="status">{sourceId&&added.length?`The disc from sector ${tile(sourceId)} cannot control sector ${added.map(tile).join(', ')}. Choose another source or use a disc from the track.`:'This influence choice is no longer available. Choose another sector or reset the draft.'}</p>}
    <div className="dg-influence-stakes" aria-label="Territory consequences">
      {removed.map(id=>{const sector=view.sectors.find(item=>item.id===id);return sector?<p key={id}><strong>Withdraw from sector {sector.tileId}</strong> · lose {sectorDefinition(Number(sector.tileId))?.victoryPoints??0} VP · {sector.population.length} population return next.</p>:null;})}
      {added.map(id=><p key={id}>{selected?.id!==id&&<>Sector {tile(id)} · </>}<strong>+{sectorDefinition(Number(tile(id)))?.victoryPoints??0} VP</strong></p>)}
      {!removed.length&&!added.length&&<p>Refresh up to two colony ships.</p>}
    </div>
    <ActionEconomy view={view} action="influence" preview={preview}/>
  </div>;

  return <section className="dg-influence-planner" aria-label="Influence planner">
    <header><div><small>INFLUENCE</small><h2>{selected||draft?'Influence':'Choose a sector to control'}</h2></div><output aria-label="Influence discs remaining"><b>{own?.influenceOnTrack??0}</b><span>influence discs</span></output></header>
    <div className="dg-influence-body">
    {!hasChoices&&<p role="status">No influence changes available.</p>}
    {selected&&<section className="dg-influence-selected" aria-label="Selected influence sector">
      <h3>Sector {selected.tileId}</h3>
      {selected.owner===view.viewerSeatId?<p>You already control this sector.</p>:owner?<p>Controlled by {getFaction(owner.faction).name??owner.faction}.</p>:targetIds.includes(selected.id)?null:<p>Not an available control target.</p>}
      {consequencePreview}
      {sourceId&&choices.addOnly.some(candidate=>candidate.command.type==='influence'&&candidate.command.addSectorIds[0]===focusedId)&&<button type="button" disabled={disabled} onClick={()=>{setSourceId(null);setDraft(choices.addOnly.find(candidate=>candidate.command.type==='influence'&&candidate.command.addSectorIds[0]===focusedId)??null);}}>Use a disc from the track</button>}
      {selectedTransfers.length>0&&<details className="dg-influence-transfer" open={!choices.addOnly.some(candidate=>candidate.command.type==='influence'&&candidate.command.addSectorIds[0]===focusedId)}>
        <summary>{choices.addOnly.some(candidate=>candidate.command.type==='influence'&&candidate.command.addSectorIds[0]===focusedId)?'Use a disc from an existing sector instead':'Choose a sector to give up for its disc'}</summary>
        <button type="button" disabled={disabled} aria-pressed={choosingSource} onClick={()=>{setChoosingSource(true);setSourceIssue(null);}}>Choose source on map</button>
        {choosingSource&&<p role="status">Choose a highlighted source · destination stays sector {selected.tileId}.</p>}{sourceIssue&&<p role="alert">{sourceIssue}</p>}
        <div className="dg-influence-sector-list">{selectedTransfers.map(candidate=>candidate.command.type==='influence'&&<SectorChoice key={candidate.command.removeSectorIds.join('-')} sectorId={candidate.command.removeSectorIds[0]} view={view} purpose="transfer" selected={sourceId===candidate.command.removeSectorIds[0]} disabled={disabled} onClick={()=>{if(candidate.command.type==='influence')chooseSource(candidate.command.removeSectorIds[0]);}}/>)}</div>
      </details>}
    </section>}
    {!selected&&draft&&<section className="dg-influence-selected" aria-label="Selected influence change">{consequencePreview}</section>}
    {targetIds.length>0&&<details className="dg-influence-destinations" open={onLegalTargetIdsChange?undefined:true}><summary>Choose from sector list</summary><div className="dg-influence-sector-list">{targetIds.map(id=><SectorChoice key={id} sectorId={id} view={view} purpose="control" selected={focusedId===id} disabled={disabled} onClick={()=>{chooseTarget(id);onSectorFocus?.(id);}}/>)}</div></details>}
    <div className="dg-influence-other">
      {choices.refresh&&<button type="button" className="dg-influence-refresh" aria-label="Refresh colony ships" disabled={disabled} onClick={()=>{setFocusedId(null);setSourceId(null);setDraft(choices.refresh);}}><span aria-hidden="true">↻</span><span><strong>Refresh colony ships</strong></span></button>}
      {choices.removeOnly.length>0&&<details className="dg-influence-withdraw"><summary>Withdraw control from a sector</summary><div className="dg-influence-sector-list">{choices.removeOnly.map(candidate=>candidate.command.type==='influence'&&<SectorChoice key={candidate.command.removeSectorIds.join('-')} sectorId={candidate.command.removeSectorIds[0]} view={view} purpose="withdraw" selected={sourceId===candidate.command.removeSectorIds[0]&&draft===candidate} disabled={disabled} onClick={()=>{if(candidate.command.type==='influence')setSourceId(candidate.command.removeSectorIds[0]);setFocusedId(null);setDraft(candidate);}}/>)}</div></details>}
    </div>
    </div>
    {draft&&<CommitBar className={`dg-influence-confirm ${removed.length?'is-withdrawal':''}`}>
      <button type="button" className={removed.length?'dg-influence-danger':'sd-primary'} aria-label={commitLabel(confirmation)} disabled={disabled||draftGuard.stale||!draftLegal} onClick={()=>{if(!disabled&&!draftGuard.stale&&draftLegal)onSubmit(draft.command);}}>{commitLabel(compactConfirmation)}</button>
    </CommitBar>}
  </section>;
}
