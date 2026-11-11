import { useRef, useState } from 'react';
import type { PlayerView } from '../../../shared/eclipse/types';
import { useActionDraftState } from '../actionDraftContext';

/** Navigation owns presentation state; persisted values still live only in ActionDraftProvider. */
export function useBoardNavigation(view: PlayerView, initialSectorId?: string) {
  const [mobileSheet, setMobileSheet] = useState<'closed' | 'peek' | 'expanded'>('closed');
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [mobileActionMode, setMobileActionMode] = useState(false);
  const [aiDismissed, setAiDismissed] = useState(false);
  const [reviewAi, setReviewAi] = useState(false);
  const [historyOpen, setHistoryOpen] = useActionDraftState('historyOpen', false);
  const [boardToolsOpen, setBoardToolsOpen] = useState(false);
  const [empireMapSeat, setEmpireMapSeat] = useState<string | null>(null);
  const [upkeepBrowsing, setUpkeepBrowsing] = useState(false);
  const [screen, setScreen] = useActionDraftState(
    'screen',
    view.phase === 'finished' ? 'Scoring' : 'Galaxy',
  );
  const [inspectorOpen, setInspectorOpen] = useState(Boolean(initialSectorId) || historyOpen);
  const spatialDecision =
    !!view.pendingDecision &&
    ['exploration', 'control', 'bankruptcy', 'portal-placement', 'colonization'].includes(
      view.pendingDecision.kind,
    );
  const restoreChoiceFocus = useRef(false);
  const showDecisionMap = () => {
    restoreChoiceFocus.current = true;
    setScreen('Galaxy');
    setMobileSheet('closed');
    setMobileActionsOpen(false);
    setMobileActionMode(false);
    setReviewAi(false);
    setAiDismissed(true);
    setHistoryOpen(false);
    setInspectorOpen(false);
  };
  const browseGalaxy = () => {
    showDecisionMap();
    setEmpireMapSeat(null);
    setUpkeepBrowsing(view.phase === 'upkeep');
  };
  const returnToChoice = () => {
    setScreen('Decision');
    setInspectorOpen(spatialDecision);
    setEmpireMapSeat(null);
    setMobileSheet(spatialDecision ? 'expanded' : 'closed');
    setMobileActionsOpen(false);
    setMobileActionMode(false);
    setHistoryOpen(false);
  };
  const browseTechnologies = () => {
    setScreen('Research');
    setEmpireMapSeat(null);
    setInspectorOpen(false);
    setHistoryOpen(false);
    setReviewAi(false);
    setAiDismissed(true);
    setMobileSheet('closed');
    setMobileActionsOpen(false);
    setMobileActionMode(false);
  };
  return {
    mobileSheet,
    setMobileSheet,
    mobileActionsOpen,
    setMobileActionsOpen,
    mobileActionMode,
    setMobileActionMode,
    aiDismissed,
    setAiDismissed,
    reviewAi,
    setReviewAi,
    historyOpen,
    setHistoryOpen,
    boardToolsOpen,
    setBoardToolsOpen,
    empireMapSeat,
    setEmpireMapSeat,
    upkeepBrowsing,
    setUpkeepBrowsing,
    screen,
    setScreen,
    inspectorOpen,
    setInspectorOpen,
    restoreChoiceFocus,
    showDecisionMap,
    browseGalaxy,
    returnToChoice,
    browseTechnologies,
  };
}
