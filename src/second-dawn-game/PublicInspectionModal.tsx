import { gameRules } from '../../shared/eclipse/gameRules';
import { useEffect, useRef } from 'react';
import type { SpectatorView, PlayerView } from '../../shared/eclipse/types';
import { usePublicInspection } from './PublicInspectionContext';
import { historyPresentationLines, historySectorIds, scoreInspection } from './publicInspection';
import GalaxyBoard from './GalaxyBoard';
import NativeDialog from './NativeDialog';
export default function PublicInspectionModal({
  view,
  sharedMap = false,
}: {
  view: PlayerView | SpectatorView;
  sharedMap?: boolean;
}) {
  const inspection = usePublicInspection(),
    panel = useRef<HTMLElement>(null),
    active = inspection?.active;
  useEffect(() => {
    if (!active || !sharedMap) return;
    const prior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus();
    return () => {
      if (prior?.isConnected) prior.focus();
    };
  }, [active, sharedMap]);
  if (!active) return null;
  const ids =
    active.kind === 'history'
      ? historySectorIds(active.entry)
      : scoreInspection(view, active.seatId, active.category).sectorIds;
  const detail =
      active.kind === 'score' ? scoreInspection(view, active.seatId, active.category) : null,
    presentation = active.kind === 'history' ? historyPresentationLines(active.entry) : [];
  const currentIds = ids.filter((id) => view.sectors.some((sector) => sector.id === id)),
    missing = ids.filter((id) => !currentIds.includes(id));
  const title = active.kind === 'history' ? 'Public history inspection' : 'Public score inspection';
  const content = (close: () => void) => (
    <>
      <header>
        <h2>
          {active.kind === 'history'
            ? active.entry.summary
            : active.category === 'reputation' &&
                view.phase !== 'finished' &&
                !gameRules(view).publicReputation
              ? 'Reputation · hidden until game end'
              : `${detail!.title} · ${detail!.value} VP`}
        </h2>
        <button onClick={close}>Close</button>
      </header>
      <p>
        {active.kind === 'history'
          ? 'Historical references use public action metadata. Ships and control may have changed since this action.'
          : detail!.explanation}
      </p>
      {presentation.length > 0 && (
        <p className="dg-history-presentation">{presentation.join(' · ')}</p>
      )}
      {detail?.contributors.length ? (
        <ul>
          {detail.contributors.map((contributor) => (
            <li key={contributor}>{contributor}</li>
          ))}
        </ul>
      ) : null}
      {!sharedMap && currentIds.length > 0 && (
        <div className="dg-public-inspection-map">
          <GalaxyBoard
            initialFit
            view={view}
            candidates={[]}
            selected={null}
            legalTargetIds={currentIds}
            targetLabel="public contributor sector"
            onSelect={() => {}}
            onExplore={() => {}}
          />
        </div>
      )}
      {missing.length > 0 && (
        <p role="status">
          Referenced historical sector{missing.length === 1 ? ' is' : 's are'} no longer on the
          current public board.
        </p>
      )}
      {!currentIds.length && ids.length === 0 && (
        <p>This public action has no spatial reference to highlight.</p>
      )}
      <p>Highlights and ships use the current public board; historical pieces may have moved.</p>
    </>
  );
  if (sharedMap)
    return (
      <div className="dg-public-inspection-backdrop is-shared-map">
        <section
          ref={panel}
          tabIndex={-1}
          className="dg-public-inspection"
          role="dialog"
          aria-label={title}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              inspection?.dismiss();
            }
          }}
        >
          {content(() => inspection?.dismiss())}
        </section>
      </div>
    );
  return (
    <NativeDialog
      title={title}
      onClose={() => inspection?.dismiss()}
      backdropClassName="dg-public-inspection-backdrop"
      panelClassName="dg-public-inspection"
    >
      {content}
    </NativeDialog>
  );
}
