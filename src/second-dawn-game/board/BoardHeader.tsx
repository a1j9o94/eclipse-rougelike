import type { ReactNode } from 'react';
import type { PlayerView } from '../../../shared/eclipse/types';
import { gameRoundLimit, gameRules } from '../../../shared/eclipse/gameRules';
import { incomeForPopulationAway } from '../../../shared/eclipse/tracks';
import { needsUpkeep } from '../upkeepParticipation';
import { TradeResourceIcon } from '../TradePanel';
import MobileHeader from '../MobileHeader';
import UpkeepSummary from '../UpkeepSummary';
import { humanize } from './boardLabels';
interface BoardHeaderProps {
  view: PlayerView;
  compact: boolean;
  score: number;
  connected: boolean;
  busy: boolean;
  reviewMode: boolean;
  aiFailure?: string | null;
  onRetryAi?: () => void;
  turnClock?: ReactNode;
  menuLabel: string;
  boardToolsOpen: boolean;
  historyOpen: boolean;
  activityTools: ReactNode;
  mobileActivityTools: ReactNode;
  battleLabel?: string;
  battleControls?: ReactNode;
  onToggleTable: () => void;
  onCloseActivity?: () => void;
  onSettings: () => void;
  onOpenTracks: () => void;
  onMobileScore: () => void;
  onScore: () => void;
  onHistory: () => void;
  onMenu: () => void;
}
/** Stable header markup for both responsive presentations; actions stay with the coordinator. */
export default function BoardHeader({
  view,
  compact,
  score,
  connected,
  busy,
  reviewMode,
  aiFailure,
  onRetryAi,
  turnClock,
  menuLabel,
  boardToolsOpen,
  historyOpen,
  activityTools,
  mobileActivityTools,
  battleLabel,
  battleControls,
  onToggleTable,
  onCloseActivity,
  onSettings,
  onOpenTracks,
  onMobileScore,
  onScore,
  onHistory,
  onMenu,
}: BoardHeaderProps) {
  const own = view.seats.find((seat) => seat.id === view.viewerSeatId)!;
  return compact ? (
    <MobileHeader
      activityLabel={battleLabel}
      activityControls={battleControls}
      onTable={onToggleTable}
      onCloseActivity={onCloseActivity}
      activityTools={mobileActivityTools}
      view={view}
      connected={connected}
      busy={busy}
      score={score}
      turnClock={turnClock}
      onMenu={onMenu}
      onSettings={onSettings}
      onOpenTracks={onOpenTracks}
      onScore={onMobileScore}
    />
  ) : (
    <>
      <header className="sd-header">
        {onCloseActivity && (
          <button
            className="dg-close-activity"
            aria-label="Close activity"
            onClick={onCloseActivity}
          >
            ←
          </button>
        )}
        <div className="sd-brand">
          <span className="sd-eclipse" />
          <div>
            <strong>ECLIPSE</strong>
            <small>SECOND DAWN FOR THE GALAXY</small>
          </div>
        </div>
        <div className="sd-turn">
          <small>
            ROUND {view.round} / {gameRoundLimit(view)}
          </small>
          <strong>
            {view.phase === 'finished'
              ? 'Final results'
              : `${humanize(view.phase)} · ${view.pendingDecision ? 'your decision' : view.waitingFor ? 'opponent decision' : view.phase === 'upkeep' ? (needsUpkeep(view) ? 'your upkeep' : 'upkeep complete') : view.activeSeatId === own.id ? 'your turn' : 'opponent turn'}`}
          </strong>
          {turnClock}
        </div>
        {(['money', 'science', 'materials'] as const).map((resource) => (
          <div
            className="sd-resource"
            key={resource}
            role="group"
            aria-label={`${humanize(resource)}: ${own.resources[resource]}, income ${incomeForPopulationAway(own.populationTracks[resource])}`}
            title={`${humanize(resource)} · ${own.resources[resource]} held · +${incomeForPopulationAway(own.populationTracks[resource])} income`}
          >
            <TradeResourceIcon resource={resource} />
            <strong>
              {own.resources[resource]}
              <em>+{incomeForPopulationAway(own.populationTracks[resource])} income</em>
            </strong>
          </div>
        ))}
        <UpkeepSummary view={view} onOpenTracks={onOpenTracks} />
        <button
          className="dg-running-score"
          onClick={onScore}
          title={
            gameRules(view).publicReputation
              ? 'Open the scoring breakdown, including public reputation.'
              : 'Open the scoring breakdown. Reputation is excluded until game end.'
          }
        >
          <small>{view.phase === 'finished' ? 'Your final score' : 'Your public VP'}</small>
          <strong>
            {score}
            <span>VP</span>
          </strong>
        </button>
        <div className="dg-save">
          {aiFailure && (
            <button disabled={!connected} title={aiFailure} onClick={onRetryAi}>
              AI paused · retry
            </button>
          )}
          <span>
            {connected
              ? reviewMode
                ? 'Unsaved engine fixture'
                : busy
                  ? 'Saving…'
                  : 'Saved'
              : 'Disconnected · waiting to reconnect'}
          </span>
          <button aria-expanded={boardToolsOpen} onClick={onToggleTable}>
            Table & activity
          </button>
          <button className="dg-history-toggle" aria-pressed={historyOpen} onClick={onHistory}>
            History
          </button>
          <details className="dg-shell-menu">
            <summary aria-label="Game tools">•••</summary>
            <div>
              {activityTools}
              <button onClick={onSettings}>Preferences</button>
              <button onClick={onMenu}>{menuLabel}</button>
            </div>
          </details>
        </div>
      </header>
    </>
  );
}
