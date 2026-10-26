import {useLayoutEffect, useRef, type CSSProperties} from 'react';
import type {PlayerView} from '../../shared/eclipse/types';
import {getFaction} from '../../shared/eclipse/catalog';
import {gameRules} from '../../shared/eclipse/gameRules';
import FactionSymbol from './FactionSymbol';
import {seatColor} from './factionColors';
import {rosterTurnOrder} from './turnOrder';
import {needsUpkeep} from './upkeepParticipation';
import './turnOrderStrip.css';

interface Props {
  view: PlayerView;
  onInspect: (seatId: string) => void;
}

/** A stable orientation strip; full player details remain in Table & activity. */
export default function TurnOrderStrip({view, onInspect}: Props) {
  const actionPhase = view.phase === 'action';
  const label = actionPhase ? 'Turn order' : 'Seat order';
  const listRef = useRef<HTMLOListElement>(null);
  const anchor = actionPhase ? view.activeSeatId ?? view.startSeatId : view.startSeatId;
  useLayoutEffect(() => {
    // A new turn starts at the first chip; ordinary updates preserve manual browsing.
    if (listRef.current) listRef.current.scrollLeft = 0;
  }, [anchor, view.phase]);
  return <nav className="dg-turn-order-strip" aria-label={label}>
    <span className="dg-turn-order-heading" title={actionPhase && gameRules(view).passOrderTurnOrder ? 'Turns follow last round’s pass order.' : undefined}>{label} <span aria-hidden="true">→</span></span>
    <ol ref={listRef}>
      {rosterTurnOrder(view).map(seat => {
        const active = actionPhase && !seat.eliminated && seat.id === view.activeSeatId;
        const status = seat.eliminated ? 'Out' : view.phase === 'upkeep' ? needsUpkeep(view, seat.id) ? 'Upkeep' : 'Ready' : view.phase !== 'finished' && seat.passed ? 'Passed' : null;
        return <li key={seat.id}>
          <button type="button" style={{'--owner': seatColor(seat)} as CSSProperties} aria-current={active ? 'step' : undefined} data-eliminated={seat.eliminated || undefined} onClick={() => onInspect(seat.id)}>
            <span className="dg-turn-order-emblem" aria-hidden="true"><FactionSymbol faction={seat.faction}/></span>
            <strong>{getFaction(seat.faction).name}</strong>
            {seat.id === view.viewerSeatId && <small>You</small>}
            {active && <span className="dg-turn-order-active">Turn</span>}
            {status && <span className="dg-turn-order-state">{status}</span>}
          </button>
        </li>;
      })}
    </ol>
  </nav>;
}
