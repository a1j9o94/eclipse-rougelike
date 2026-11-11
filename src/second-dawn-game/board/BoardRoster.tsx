import type { CSSProperties } from 'react';
import type { PlayerView } from '../../../shared/eclipse/types';
import { getFaction } from '../../../shared/eclipse/catalog';
import { gameRoundLimit, gameRules } from '../../../shared/eclipse/gameRules';
import { AI_DIFFICULTY_LABELS, type AiDifficulty } from '../../../shared/eclipse/aiConfig';
import { rosterTurnOrder } from '../turnOrder';
import { needsUpkeep } from '../upkeepParticipation';
import { seatColor } from '../factionColors';
import FactionSymbol from '../FactionSymbol';
import type { runningScore } from '../runningScore';
interface BoardRosterProps {
  view: PlayerView;
  aiDifficulty: AiDifficulty;
  playerNames: Record<string, string>;
  scores: ReturnType<typeof runningScore>['breakdown'][];
  onInspect: (seatId: string) => void;
}
export default function BoardRoster({
  view,
  aiDifficulty,
  playerNames,
  scores,
  onInspect,
}: BoardRosterProps) {
  const faction = (id: string) => {
    const seat = view.seats.find((seat) => seat.id === id);
    return seat ? getFaction(seat.faction) : undefined;
  };
  const color = (id: string) => {
    const seat = view.seats.find((seat) => seat.id === id);
    return seat ? seatColor(seat) : '#66778b';
  };
  return (
    <div
      className="sd-player-list"
      role="region"
      aria-label="Civilization roster"
      aria-description={
        view.phase === 'action'
          ? 'Current player first, followed by clockwise turns. Passed players can still react.'
          : 'Clockwise from the start player tile holder.'
      }
      tabIndex={0}
    >
      {rosterTurnOrder(view).map((seat) => (
        <button
          className={`sd-player ${(view.phase === 'upkeep' ? needsUpkeep(view, seat.id) : seat.id === view.activeSeatId) ? 'sd-active' : ''}`}
          key={seat.id}
          style={{ '--owner': color(seat.id) } as CSSProperties}
          onClick={() => onInspect(seat.id)}
        >
          <span className="sd-owner">
            <FactionSymbol faction={seat.faction} />
          </span>
          <div>
            <strong>
              {faction(seat.id)?.name ?? seat.faction}
              {seat.traitor && <span className="dg-traitor-marker"> · Traitor −2</span>}
            </strong>
            <small>
              {seat.id === view.viewerSeatId
                ? playerNames[seat.id]
                  ? `You · ${playerNames[seat.id]}`
                  : 'You'
                : seat.controller === 'ai'
                  ? `${AI_DIFFICULTY_LABELS[aiDifficulty]} AI`
                  : (playerNames[seat.id] ?? 'Human')}{' '}
              ·{' '}
              {seat.eliminated
                ? 'eliminated'
                : view.phase === 'upkeep'
                  ? view.upkeepDone?.includes(seat.id)
                    ? 'upkeep complete'
                    : 'preparing upkeep'
                  : seat.passed
                    ? 'passed'
                    : seat.id === view.activeSeatId
                      ? 'active'
                      : 'waiting'}
              {!gameRules(view).passOrderTurnOrder &&
                view.round < gameRoundLimit(view) &&
                view.phase !== 'finished' &&
                seat.id === view.firstPasser &&
                !seat.eliminated && (
                  <span
                    className="dg-next-starter"
                    title="Passed first: gained 2 money and starts the next round."
                  >
                    {' '}
                    · Next round first
                  </span>
                )}
              {gameRules(view).passOrderTurnOrder &&
                view.phase === 'action' &&
                view.passOrder?.includes(seat.id) && (
                  <span className="dg-next-starter">
                    {' '}
                    · Next round #{view.passOrder.indexOf(seat.id) + 1}
                  </span>
                )}
              {gameRules(view).publicReputation && (
                <span>
                  {' '}
                  · Reputation{' '}
                  {view.lessRandom?.reputationBySeat[seat.id]?.reduce(
                    (total, value) => total + value,
                    0,
                  ) ?? 0}{' '}
                  VP
                </span>
              )}
            </small>
          </div>
          <span
            className="dg-roster-vp"
            title={
              view.phase === 'finished'
                ? 'Final victory points'
                : gameRules(view).publicReputation
                  ? `Public victory points, including ${view.lessRandom?.reputationBySeat[seat.id]?.reduce((total, value) => total + value, 0) ?? 0} reputation`
                  : 'Public victory points; reputation excluded'
            }
          >
            {scores.find((score) => score.playerId === seat.id)!.total}
            <small>VP</small>
          </span>
        </button>
      ))}
    </div>
  );
}
