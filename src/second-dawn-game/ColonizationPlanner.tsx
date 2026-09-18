import { useEffect, useMemo, useRef } from "react";
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import { previewCommand } from "../../shared/eclipse/commandPreview";
import type { GameCommand, PendingDecision, PlayerView, Resource } from "../../shared/eclipse/types";
import ActionEconomy from "./ActionEconomy";
import { PlanetIcon, type PlanetResource } from "./SectorPlanets";
import SectorPlanets from "./SectorPlanets";
import { TradeResourceIcon } from "./TradePanel";
import type { CommandCandidate } from "./SecondDawnBoard";
import { colonizationOptions, decisionColonizationOptions, type PlanetOption } from "./colonizationPlanning";
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
  selectedSectorId: boardSelectedSectorId,
  decision,
}: ColonizationPlannerProps) {
  const options = useMemo(() => decision ? decisionColonizationOptions(view, decision) : colonizationOptions(view, candidates), [view, candidates, decision]);
  const [chosen, setChosen] = useActionDraftState('colonization',{}, {enabled:!decision});
  const [focusedKey, setFocusedKey] = useActionDraftState('colonizationFocus',null, {enabled:!decision});
  const draftGuard=useActionDraftGuard();
  const draftLegal=Object.entries(chosen).every(([key,resource])=>options.some(option=>`${option.sectorId}:${option.squareId}`===key&&option.resources.includes(resource)));
  const confirmRef = useRef<HTMLElement>(null);
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
  const sectors = [...new Set(options.map((option) => option.sectorId))];
  const selectedSectorId = boardSelectedSectorId && sectors.includes(boardSelectedSectorId)
    ? boardSelectedSectorId
    : focused?.sectorId ?? sectors[0] ?? null;
  const visibleOptions = options.filter((option) => option.sectorId === selectedSectorId);
  const choosePlanet = (option: PlanetOption) => {
    const key = `${option.sectorId}:${option.squareId}`;
    setFocusedKey(key);
    setChosen((current) => current[key] ? Object.fromEntries(Object.entries(current).filter(([id]) => id !== key)) : { ...current, [key]: option.resources[0] });
  };
  const resourceCount = (resource: Resource) => placements.filter((placement) => placement.resource === resource).length;
  const withinSupply = placements.length <= (own?.colonyShipsAvailable ?? 0) && (["money", "science", "materials"] as const).every((resource) => resourceCount(resource) <= 11 - (own?.populationTracks[resource] ?? 11));
  const chooseResource = (resource: Resource) => {
    if (!selected) return;
    const key = `${selected.sectorId}:${selected.squareId}`;
    setChosen((current) => ({ ...current, [key]: resource }));
  };
  useEffect(() => {
    const node = confirmRef.current;
    if (command && typeof node?.scrollIntoView === "function")
      node.scrollIntoView({ block: "nearest" });
  }, [command]);
  return (
    <section className="dg-colonization-planner" aria-label="Colonization planner">
      <header>
        <div><small>COLONIZATION</small><h2>Populate your controlled sectors</h2></div>
        <output aria-label="Colony ships available"><b>{own?.colonyShipsAvailable ?? 0}</b><span>colony ships ready</span></output>
      </header>
      <p>{decision ? "Choose any offered population spaces. This draft remains editable until you finish the persisted colonization decision." : "Choose open planets, then their population cubes. Colonization is free: it does not take an action disc."}</p>
      {!options.length ? (
        <p role="status">No compatible empty planets can be colonized now. You may need a colony ship, population cube, advanced technology, or your action turn.</p>
      ) : (
        <div className="dg-colonization-layout">
          <section className="dg-colonization-squares" aria-labelledby="colonize-square-title">
            <h3 id="colonize-square-title">Open population spaces</h3>
            {visibleOptions.map((option) => {
              const sector = view.sectors.find((candidate) => candidate.id === option.sectorId)!;
              const key = `${option.sectorId}:${option.squareId}`;
              const isSelected = !!chosen[key];
              return (
                <button
                  type="button"
                  key={`${option.sectorId}:${option.squareId}`}
                  className={`dg-colonization-square ${isSelected ? "is-selected" : ""}`}
                  aria-pressed={isSelected}
                  aria-label={`Colonize ${planetName(option.resource)} planet ${option.squareId} in sector ${sector.tileId}${option.advanced ? ", advanced" : ""}`}
                  disabled={disabled}
                  onClick={() => choosePlanet(option)}
                >
                  <span className="dg-colonization-orb" style={{ color: option.resource === "science" ? "#b397da" : option.resource === "materials" ? "#b89675" : option.resource === "money" ? "#e7bd67" : "#b5c3cd" }}>
                    <svg viewBox="0 0 20 20" aria-hidden="true"><PlanetIcon resource={option.resource} /></svg>
                    {option.advanced && <i aria-label="Advanced planet">★</i>}
                  </span>
                  <span><strong>{planetName(option.resource)}</strong><small>Sector {sector.tileId} · {option.advanced ? "Advanced" : "Standard"}</small></span>
                </button>
              );
            })}
          </section>
          <aside className="dg-colonization-detail">
            {selectedSectorId && <SectorPlanets sector={view.sectors.find((sector) => sector.id === selectedSectorId)!} view={view} candidates={candidates as CommandCandidate[]} />}
            {selected ? (
              <section className="dg-colonization-resource" aria-label="Population cube choice">
                <h3>Population cube</h3>
                <p>Choose what this {planetName(selected.resource).toLowerCase()} space produces.</p>
                <div>{allowedResources.map((choice) => <button key={choice} type="button" aria-label={`${resourceName(choice)} population`} aria-pressed={chosen[`${selected.sectorId}:${selected.squareId}`] === choice} disabled={disabled} onClick={() => chooseResource(choice)}><TradeResourceIcon resource={choice}/><span>{resourceName(choice)}</span><small>{own?.populationTracks[choice] ?? 0} on track</small></button>)}</div>
              </section>
            ) : <p>Select a planet to see its compatible population cubes.</p>}
          </aside>
        </div>
      )}
      {!draftLegal&&<p role="status">Some saved planets are no longer available. <button type="button" onClick={()=>setChosen({})}>Clear colonization draft</button></p>}
      {(command || decision) && (
        <footer className="dg-colonization-confirm" ref={confirmRef}>
          <ActionEconomy view={view} action="colonize" preview={preview} />
          <p>{placements.length ? `Use ${placements.length} colony ship${placements.length === 1 ? "" : "s"} and matching population cubes.` : "You may finish without placing population."}</p>
          {placements.length > 0 && !withinSupply && <p className="dg-danger" role="status">Your draft needs more colony ships or population cubes than remain available.</p>}
          {command && <button type="button" className="sd-primary" disabled={disabled || !withinSupply || !draftLegal || (!decision&&draftGuard.stale)} onClick={() => onSubmit(command)}>{decision ? "Finish colonization" : "Confirm colonization"}</button>}
          {decision && <button type="button" disabled={disabled} onClick={() => onSubmit({ type: "resolve", decisionId: decision.id, choice: { kind: "colonization", placements: [] } })}>Finish without colonizing</button>}
        </footer>
      )}
    </section>
  );
}
