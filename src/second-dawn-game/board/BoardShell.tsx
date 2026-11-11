import type { ReactNode } from 'react';
import type { GameCommand } from '../../../shared/eclipse/types';
import type { GameSoundFeedback } from '../sound/useGameSoundFeedback';
interface BoardShellProps {
  children: ReactNode;
  sound: GameSoundFeedback;
  buildStage: 'catalog' | 'placement';
  encounterVisible: boolean;
  compact: boolean;
  desktopInspectorVisible: boolean;
  screen: string;
  historyOpen: boolean;
  buildOpen: boolean;
  inspectingGalaxy: boolean;
  spatialDecisionOpen: boolean;
  moveOpen: boolean;
  action: GameCommand['type'];
  hasDraft: boolean;
  motionEnabled: boolean;
}
/** Layout classes are derived in one place; no rules or draft ownership in the shell. */
export default function BoardShell({
  children,
  sound,
  buildStage,
  encounterVisible,
  compact,
  desktopInspectorVisible,
  screen,
  historyOpen,
  buildOpen,
  inspectingGalaxy,
  spatialDecisionOpen,
  moveOpen,
  action,
  hasDraft,
  motionEnabled,
}: BoardShellProps) {
  return (
    <main
      onClickCapture={sound.capture}
      onClick={sound.clicked}
      data-build-stage={buildStage}
      className={`sd-app dg-app dg-tabletop dg-visual-play${encounterVisible ? ' dg-in-battle' : ''}${!compact && !desktopInspectorVisible ? ' dg-inspector-collapsed' : ''}${['Players', 'Empire'].includes(screen) && !historyOpen ? ' dg-empire-mode' : ''}${buildOpen && !inspectingGalaxy && screen === 'Galaxy' ? ' dg-build-mode' : ''}${compact ? ' dg-mobile-board' : ''}${spatialDecisionOpen ? ' dg-spatial-decision' : ''}${screen === 'Galaxy' && !inspectingGalaxy && (moveOpen || ['influence', 'colonize'].includes(action) || (action === 'explore' && hasDraft)) ? ' dg-spatial-action' : ''}`}
      data-motion={motionEnabled ? 'on' : 'off'}
      data-mobile-screen={compact ? screen : undefined}
    >
      {children}
    </main>
  );
}
