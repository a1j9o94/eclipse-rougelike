import { useEffect, useMemo, useRef } from "react";
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import { previewCommand } from "../../shared/eclipse/commandPreview";
import type { GameCommand, PlayerView } from "../../shared/eclipse/types";
import ActionEconomy from "./ActionEconomy";
import type { CommandCandidate } from "./SecondDawnBoard";
import { influenceChoices } from "./influencePlanning";
import "./influencePlanner.css";

export interface InfluencePlannerProps {
  view: PlayerView;
  candidates: readonly CommandCandidate[];
  disabled: boolean;
  onSubmit: (command: GameCommand) => void;
  /** The sector selected on the galaxy; it chooses the source or destination. */
  selectedSectorId?: string | null;
  /** Allows the board to ring the legal destination hexes without changing selection. */
  onLegalTargetIdsChange?: (legalTargetIds: string[]) => void;
}


function SectorChoice({
  sectorId,
  view,
  purpose,
  selected,
  disabled,
  onClick,
}: {
  sectorId: string;
  view: PlayerView;
  purpose: "remove" | "place";
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const sector = view.sectors.find((candidate) => candidate.id === sectorId);
  if (!sector) return null;
  const ships = view.ships.filter((ship) => ship.sectorId === sectorId).length;
  const population = sector.population.length;
  const owner = view.seats.find((seat) => seat.id === sector.owner);
  const label =
    purpose === "remove"
      ? `Remove control from sector ${sector.tileId}`
      : `Place disc in sector ${sector.tileId}`;
  return (
    <button
      type="button"
      className={`dg-influence-sector ${selected ? "is-selected" : ""}`}
      aria-pressed={selected}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="dg-influence-hex" aria-hidden="true">
        <span>{sector.tileId}</span>
        <i>{purpose === "remove" ? "−" : "+"}</i>
      </span>
      <span>
        <strong>{purpose === "remove" ? "Return disc" : "Place disc"}</strong>
        <small>
          {owner ? "Your controlled sector" : "Uncontrolled sector"} · {population} population · {ships} ships
        </small>
      </span>
    </button>
  );
}

/**
 * A visual, candidate-driven Influence draft. It never synthesizes a command:
 * every final selection is one candidate returned by the authoritative rules.
 */
export default function InfluencePlanner({
  view,
  candidates,
  disabled,
  onSubmit,
  selectedSectorId,
  onLegalTargetIdsChange,
}: InfluencePlannerProps) {
  const choices = useMemo(() => influenceChoices(candidates), [candidates]);
  const [sourceId, setSourceId] = useActionDraftState('influenceSource',null);
  const [draft, setDraft] = useActionDraftState('influenceDraft',null);
  const draftGuard=useActionDraftGuard();
  const firstSelection=useRef(true);
  const draftLegal=!!draft&&candidates.some(candidate=>JSON.stringify(candidate.command)===JSON.stringify(draft.command));
  const confirmRef = useRef<HTMLElement>(null);
  const targets = useMemo(
    () => sourceId ? choices.transfersBySource.get(sourceId) ?? [] : choices.addOnly,
    [choices, sourceId],
  );
  const targetIds = useMemo(
    () => targets.flatMap((candidate) => candidate.command.type === "influence" ? candidate.command.addSectorIds : []),
    [targets],
  );
  const preview = draft ? previewCommand(view, draft.command) : null;
  const own = view.seats.find((seat) => seat.id === view.viewerSeatId);

  const chooseSource = (id: string) => {
    setSourceId(id);
    setDraft(
      choices.removeOnly.find(
        (candidate) =>
          candidate.command.type === "influence" &&
          candidate.command.removeSectorIds[0] === id,
      ) ?? null,
    );
  };
  const chooseTarget = (id: string) => {
    const candidate = targets.find(
      (item) =>
        item.command.type === "influence" &&
        item.command.addSectorIds[0] === id,
    );
    if (candidate) setDraft(candidate);
  };
  useEffect(() => {
    onLegalTargetIdsChange?.(targetIds);
  }, [onLegalTargetIdsChange, targetIds]);
  useEffect(() => {
    const node = confirmRef.current;
    if (draft && typeof node?.scrollIntoView === "function")
      node.scrollIntoView({ block: "nearest" });
  }, [draft]);
  useEffect(() => {
    if(firstSelection.current){firstSelection.current=false;if(draft)return;}
    if (!selectedSectorId) return;
    if (targetIds.includes(selectedSectorId)) {
      chooseTarget(selectedSectorId);
      return;
    }
    if (
      selectedSectorId !== sourceId &&
      (choices.removeOnly.some(
        (candidate) => candidate.command.type === "influence" && candidate.command.removeSectorIds[0] === selectedSectorId,
      ) || choices.transfersBySource.has(selectedSectorId))
    ) chooseSource(selectedSectorId);
  // `choices` is derived from candidates; map selection deliberately changes only the local editable draft.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectorId]);
  const reset = () => {
    setSourceId(null);
    setDraft(null);
  };
  const hasChoices =
    !!choices.refresh ||
    choices.removeOnly.length > 0 ||
    choices.addOnly.length > 0 ||
    choices.transfersBySource.size > 0;

  return (
    <section className="dg-influence-planner" aria-label="Influence planner">
      <header>
        <div>
          <small>INFLUENCE</small>
          <h2>Place and return influence discs</h2>
        </div>
        <output aria-label="Influence discs remaining">
          <b>{own?.influenceOnTrack ?? 0}</b>
          <span>influence discs</span>
        </output>
      </header>
      <p className="dg-influence-guide">
        Choose a controlled sector to return its disc, then choose one of its legal connected destinations. A destination without a returned disc uses one from your track.
      </p>
      {!hasChoices ? (
        <p role="status">No legal influence changes are available. Finish the current action, remove enemy ships, or free an influence disc.</p>
      ) : (
        <>
          {choices.refresh && (
            <button
              type="button"
              className={`dg-influence-refresh ${draft === choices.refresh ? "is-selected" : ""}`}
              aria-label="Refresh colony ships"
              aria-pressed={draft === choices.refresh}
              disabled={disabled}
              onClick={() => {
                setSourceId(null);
                setDraft(choices.refresh);
              }}
            >
              <span aria-hidden="true">↻</span>
              <span><strong>Refresh colony ships</strong><small>Restore up to two colony ships as this Influence action.</small></span>
            </button>
          )}
          <div className="dg-influence-columns">
            <section aria-labelledby="influence-return-title">
              <h3 id="influence-return-title">1. Return a disc</h3>
              <p>Returning control also returns this sector’s population later in the action.</p>
              <div className="dg-influence-sector-list">
                {[...new Set([...choices.removeOnly, ...[...choices.transfersBySource.values()].flat()]
                  .flatMap((candidate) => candidate.command.type === "influence" ? candidate.command.removeSectorIds : []))]
                  .map((id) => (
                    <SectorChoice
                      key={id}
                      sectorId={id}
                      view={view}
                      purpose="remove"
                      selected={sourceId === id}
                      disabled={disabled}
                      onClick={() => chooseSource(id)}
                    />
                  ))}
                {choices.removeOnly.length === 0 && choices.transfersBySource.size === 0 && <p>No controlled discs can be returned this activation.</p>}
              </div>
            </section>
            <section aria-labelledby="influence-place-title">
              <h3 id="influence-place-title">2. Place a disc</h3>
              <p>{sourceId ? "Choose a connected uncontrolled sector." : "Choose a destination to use a disc from your track."}</p>
              <div className="dg-influence-sector-list">
                {targets.map((candidate) => {
                  if (candidate.command.type !== "influence") return null;
                  const id = candidate.command.addSectorIds[0];
                  return (
                    <SectorChoice
                      key={id}
                      sectorId={id}
                      view={view}
                      purpose="place"
                      selected={draft === candidate}
                      disabled={disabled}
                      onClick={() => chooseTarget(id)}
                    />
                  );
                })}
                {!targets.length && <p>{sourceId ? "No connected uncontrolled sector is legal from this source." : "Choose a return source or use a legal destination when one is available."}</p>}
              </div>
            </section>
          </div>
          {draft && (
            <footer className="dg-influence-confirm" ref={confirmRef}>
              <strong>{draft.label}</strong>
              {!draftLegal&&<p role="status">This saved influence choice is no longer legal. Choose another sector or clear the draft.</p>}
              <ActionEconomy view={view} action="influence" preview={preview} />
              {draft.command.type === "influence" && draft.command.removeSectorIds.length > 0 && <p>Population on the returned sector will be sent back for you to allocate if required.</p>}
              <button
                type="button"
                className="sd-primary"
                disabled={disabled||draftGuard.stale||!draftLegal}
                onClick={() => {
                  if(!draftGuard.stale&&draftLegal)onSubmit(draft.command);
                }}
              >
                Confirm influence
              </button>
              <button type="button" disabled={disabled} onClick={reset}>Clear draft</button>
            </footer>
          )}
        </>
      )}
    </section>
  );
}
