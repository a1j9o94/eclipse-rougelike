import { useLayoutEffect, useRef, useState } from 'react';
import type { PublicHistoryEntry } from '../../shared/eclipse/history';
import type { HistoryFeed } from '../second-dawn-session/useMatchHistory';
import { CombatVolleyResult } from './CombatDecisionVisuals';
import { FACTION_COLORS } from './factionColors';
import FactionSymbol from './FactionSymbol';
import { BattleRetreats, UpgradeChanges } from './PublicActionResults';
import { usePublicInspection } from './PublicInspectionContext';
import { historyPresentationLines } from './publicInspection';
import './history.css';

export interface HistoryRollbackControl {
  isHost: boolean;
  disabled: boolean;
  onSelect: (entry: PublicHistoryEntry) => void;
}

type HistoryTurn = { key: string; heading: string; entries: PublicHistoryEntry[] };
type HistoryRound = { key: string; round: PublicHistoryEntry['round']; turns: HistoryTurn[] };
type HistoryAnchor = { revision: string; offset: number };

function visibleHistoryAnchor(node: HTMLDivElement): HistoryAnchor | null {
  if (node.scrollTop === 0) return null;
  const top = node.getBoundingClientRect().top;
  for (const row of node.querySelectorAll<HTMLElement>('[data-history-revision]')) {
    const bounds = row.getBoundingClientRect();
    if (bounds.bottom > top) return { revision: row.dataset.historyRevision!, offset: bounds.top - top };
  }
  return null;
}

function groupHistory(entries: readonly PublicHistoryEntry[]): HistoryRound[] {
  const rounds: HistoryRound[] = [];
  const occurrences = new Map<string, number>();
  const uniqueKey = (key: string) => {
    const count = occurrences.get(key) ?? 0;
    occurrences.set(key, count + 1);
    return `${key}:${count}`;
  };
  for (const entry of entries) {
    let round = rounds.at(-1);
    if (!round || round.round !== entry.round) {
      round = { key: uniqueKey(`round:${entry.round}`), round: entry.round, turns: [] };
      rounds.push(round);
    }
    let turn = round.turns.at(-1);
    const previous = turn?.entries[0];
    if (!turn || previous?.actorSeatId !== entry.actorSeatId ||
      previous.phase !== entry.phase || previous.actionTurnSerial !== entry.actionTurnSerial) {
      const label = entry.actionTurnSerial !== undefined
        ? `Turn ${entry.actionTurnSerial + 1}`
        : entry.phase === 'combat' || entry.phase === 'cleanup' ? 'Combat'
          : entry.phase === 'upkeep' ? 'Upkeep' : null;
      turn = {
        key: uniqueKey(`${round.key}:${entry.phase}:${entry.actionTurnSerial}:${entry.actorSeatId}`),
        heading: label ? `${label} · ${entry.actorName}` : entry.actorName,
        entries: [],
      };
      round.turns.push(turn);
    }
    turn.entries.push(entry);
  }
  return rounds;
}

function HistoryAction({ entry, editing, rollback }: {
  entry: PublicHistoryEntry;
  editing: boolean;
  rollback?: HistoryRollbackControl;
}) {
  const inspection = usePublicInspection();
  const volleys = entry.combatVolleys ?? (entry.combatVolley ? [entry.combatVolley] : []);
  const changes = entry.presentation?.kind === 'upgrade' ? entry.presentation.changes : undefined;
  const presentation = changes ? [] : historyPresentationLines(entry)
    .filter(line => !entry.summary.toLowerCase().includes(line.toLowerCase()));
  const details = entry.details.filter(detail => !entry.combatRetreats?.some(retreat =>
    detail.endsWith(`retreated to sector ${retreat.destinationTileId}.`)));
  const count = changes
    ? `${changes.length} ${changes.length === 1 ? 'slot' : 'slots'} changed`
    : volleys.length > 0 ? `${volleys.length} ${volleys.length === 1 ? 'volley' : 'volleys'}` : null;
  const heading = <>
    <span>{entry.summary}</span>
    <small className={editing ? undefined : 'dg-history-revision'}>#{entry.revision}</small>
    {count && <span className="dg-history-action-count">{count}</span>}
  </>;
  const expandable = !!(changes || volleys.length || details.length || presentation.length || inspection);
  return <li className="dg-history-action" data-history-revision={entry.revision}>
    {expandable ? <details className="dg-history-action-details">
      <summary className="dg-history-action-top">{heading}</summary>
      <div className="dg-history-action-body">
        {presentation.length > 0 && <p className="dg-history-presentation">{presentation.join(' · ')}</p>}
        {changes && <UpgradeChanges changes={changes} faction={entry.actorFaction} showStats/>}
        {volleys.length > 0 && <div aria-label="Combat results">
          {volleys.map((volley,index) => <CombatVolleyResult key={index} volley={volley}/>)}
        </div>}
        {details.map((detail,index) => <p key={index}>{detail}</p>)}
        {inspection && <button className="dg-history-inspect" onClick={() => inspection.request({ kind:'history', entry })}>Inspect public reference</button>}
      </div>
    </details> : <div className="dg-history-action-top">{heading}</div>}
    {entry.combatRetreats && <BattleRetreats retreats={entry.combatRetreats}/>}
    {rollback?.isHost && editing && <div className="dg-history-undo">
      <button disabled={rollback.disabled || (!entry.rollbackAvailable && !entry.rollbackRecoverable)} onClick={() => rollback.onSelect(entry)}>Undo to before this action</button>
      {!entry.rollbackAvailable && <small className="dg-history-undo-reason">{entry.rollbackRecoverable ? 'Earlier history will be verified before restoring.' : entry.rollbackUnavailableReason ?? 'This action has no saved rollback checkpoint.'}</small>}
    </div>}
  </li>;
}

export default function HistoryPanel({ feed, rollback }: { feed: HistoryFeed; rollback?: HistoryRollbackControl }) {
  const scroll = useRef<HTMLDivElement>(null);
  const previousFirst = useRef(0);
  const anchor = useRef<HistoryAnchor | null>(null);
  const [jumpBeginning, setJumpBeginning] = useState(false);
  const [editing, setEditing] = useState(false);
  const recordAnchor = () => {
    if (scroll.current) anchor.current = visibleHistoryAnchor(scroll.current);
  };

  useLayoutEffect(() => {
    if (!jumpBeginning) return;
    if (!feed.loadingOlder) {
      if (scroll.current) {
        scroll.current.scrollTop = scroll.current.scrollHeight;
        anchor.current = visibleHistoryAnchor(scroll.current);
      }
      setJumpBeginning(false);
    } else if (feed.error) setJumpBeginning(false);
  }, [jumpBeginning, feed.entries, feed.error, feed.loadingOlder]);

  useLayoutEffect(() => {
    const node = scroll.current;
    if (!node) return;
    const first = feed.entries[0]?.revision ?? 0;
    if (previousFirst.current && first !== previousFirst.current && anchor.current && node.scrollTop > 0) {
      const row = node.querySelector(`[data-history-revision="${anchor.current.revision}"]`);
      if (row) node.scrollTop += row.getBoundingClientRect().top - node.getBoundingClientRect().top - anchor.current.offset;
    }
    previousFirst.current = first;
    anchor.current = visibleHistoryAnchor(node);
  }, [feed.entries]);

  return <section className="dg-history-panel">
    <header>
      <h2>Action history</h2>
      {rollback?.isHost && <button aria-pressed={editing} onClick={() => setEditing(value => !value)}>{editing ? 'Done editing history' : 'Edit history'}</button>}
      {feed.loadBeginning && <button disabled={feed.loading || feed.loadingOlder || !feed.entries.length} onClick={() => { void feed.loadBeginning?.().then(() => setJumpBeginning(true)); }}>Beginning of game</button>}
    </header>
    <div ref={scroll} className="dg-history-scroll" role="log" aria-label="Match actions" aria-live="off" tabIndex={0} onScroll={recordAnchor} onToggle={recordAnchor}>
      {feed.loading && <p>Loading saved actions…</p>}
      {!feed.loading && !feed.entries.length && <p>No actions yet. Human and AI actions will appear here.</p>}
      {groupHistory(feed.entries).map(round => <section key={round.key} className="dg-history-round-group">
        <h3 className="dg-history-round">{round.round === null ? 'Match updates' : `Round ${round.round}`}</h3>
        {round.turns.map(turn => {
          const { actorColor, actorFaction } = turn.entries[0];
          const color = actorColor ? FACTION_COLORS[actorColor] : undefined;
          return <div key={turn.key} className="dg-history-turn" role="group" aria-label={turn.heading}>
            <h4 style={{ color }}>{actorFaction && <FactionSymbol faction={actorFaction}/>}<span>{turn.heading}</span></h4>
            <ol>{turn.entries.map(entry => <HistoryAction key={entry.revision} entry={entry} editing={editing} rollback={rollback}/>)}</ol>
          </div>;
        })}
      </section>)}
      {feed.error && <p role="alert">{feed.error}</p>}
      {feed.hasOlder && <button disabled={feed.loadingOlder} onClick={feed.loadOlder}>{feed.loadingOlder ? 'Loading earlier actions…' : 'Load earlier actions'}</button>}
    </div>
  </section>;
}
