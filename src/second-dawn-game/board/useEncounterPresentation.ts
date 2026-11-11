import { useEffect, useRef, useState } from 'react';
import type { PlayerView } from '../../../shared/eclipse/types';
import type { HistoryFeed } from '../../second-dawn-session/useMatchHistory';
import { latestCombatPlayback } from '../combatPlayback';
import { useCombatResultNotice } from '../useCombatResultNotice';

/** Remembers the public encounter while the engine advances through aftermath choices. */
export function useEncounterPresentation(view: PlayerView, screen: string, history?: HistoryFeed) {
  const reputationSummaryId = view.private.reputationSummary?.id;
  const [dismissedReputationId, setDismissedReputationId] = useState<string | null>(null);
  useEffect(() => {
    if (!reputationSummaryId || view.private.reputationSummary?.battleId) return;
    const timer = setTimeout(() => setDismissedReputationId(reputationSummaryId), 10000);
    return () => clearTimeout(timer);
  }, [reputationSummaryId, view.private.reputationSummary?.battleId]);
  const playback = latestCombatPlayback(view, history?.entries ?? []);
  const combatNotice = useCombatResultNotice(
    playback?.volleys.some((volley) => volley.targets.some((target) => target.destroyed))
      ? playback.revision
      : null,
    view.revision,
    screen,
  );
  const knownShips = useRef(new Map(view.ships.map((ship) => [ship.id, ship])));
  useEffect(() => {
    for (const ship of view.ships) knownShips.current.set(ship.id, ship);
  }, [view.ships]);

  const lastBattle = useRef(view.battle);
  if (view.battle) lastBattle.current = view.battle;
  const battleFlowActive = useRef(!!view.battle);
  if (view.battle) battleFlowActive.current = true;
  else if (!view.pendingDecision) battleFlowActive.current = false;
  const battleContext = lastBattle.current;
  const [battleMapEncounterId, setBattleMapEncounterId] = useState<string | null>(null);
  const resultBattle =
    !view.pendingDecision && view.private.reputationSummary?.id !== dismissedReputationId
      ? view.private.reputationSummary?.battleId
      : undefined;
  const battleIdentity = battleContext
    ? (battleContext.id ??
      `battle:${view.round}:${battleContext.sectorId}:${battleContext.attacker}:${battleContext.defender}`)
    : undefined;
  const encounterId = view.battle
    ? battleIdentity
    : view.pendingDecision && battleFlowActive.current
      ? battleIdentity
      : resultBattle === battleContext?.id
        ? resultBattle
        : undefined;
  const reputationSummaryVisible =
    !!reputationSummaryId &&
    reputationSummaryId !== dismissedReputationId &&
    view.private.reputationSummary?.round === view.round;
  const combatReputationVisible =
    reputationSummaryVisible && !!view.private.reputationSummary?.battleId;
  const dismissCombatReputation = () => {
    setDismissedReputationId(reputationSummaryId!);
    combatNotice.dismiss();
  };
  return {
    reputationSummaryId,
    dismissedReputationId,
    setDismissedReputationId,
    playback,
    combatNotice,
    knownShips,
    battleContext,
    battleMapEncounterId,
    setBattleMapEncounterId,
    encounterId,
    reputationSummaryVisible,
    combatReputationVisible,
    dismissCombatReputation,
  };
}
