import type { ReactNode } from 'react';
import type { PlayerView } from '../../../shared/eclipse/types';
import type { CombatAutomationStatus } from '../../../shared/eclipse/combatAutomation';
import type { latestCombatPlayback } from '../combatPlayback';
import BattleOverview from '../BattleOverview';
import CombatAutomationControl from '../CombatAutomationControl';
import ReputationSummary from '../ReputationSummary';
import { DicePresentationVisibilityContext } from '../dice3d/visibility';
interface EncounterWorkspaceProps {
  view: PlayerView;
  battleContext: PlayerView['battle'];
  playback: ReturnType<typeof latestCombatPlayback>;
  knownShips: PlayerView['ships'];
  visible: boolean;
  diceVisible: boolean;
  compact: boolean;
  blocked: boolean;
  motionEnabled: boolean;
  soundEligible: boolean;
  spatialDecision: boolean;
  combatReputationVisible: boolean;
  pendingDecisionPanel: ReactNode;
  battleContinuation: ReactNode;
  combatAutomation?: CombatAutomationStatus | null;
  onCombatAutomation?: (enabled: boolean) => void;
  opponentName?: string;
  onInspectFleet: () => void;
  dismissCombatReputation: () => void;
}
/** Kept mounted for the encounter ID, including hidden map and inspection excursions. */
export default function EncounterWorkspace({
  view,
  battleContext,
  playback,
  knownShips,
  visible,
  diceVisible,
  compact,
  blocked,
  motionEnabled,
  soundEligible,
  spatialDecision,
  combatReputationVisible,
  pendingDecisionPanel,
  battleContinuation,
  combatAutomation,
  onCombatAutomation,
  opponentName,
  onInspectFleet,
  dismissCombatReputation,
}: EncounterWorkspaceProps) {
  return (
    <DicePresentationVisibilityContext.Provider value={diceVisible}>
      <section className="dg-encounter-workspace" aria-label="Battle workspace" hidden={!visible}>
        <header className="dg-choice-header">
          <strong>
            Battle · sector{' '}
            {view.sectors.find((sector) => sector.id === battleContext?.sectorId)?.tileId}
          </strong>
          <div>
            {onCombatAutomation && (
              <CombatAutomationControl
                view={view}
                status={combatAutomation}
                disabled={blocked}
                onChange={onCombatAutomation}
              />
            )}
            <button onClick={onInspectFleet}>Inspect fleet</button>
          </div>
        </header>
        <BattleOverview
          integrated
          compact={compact}
          showHeading={false}
          controls={
            <>
              {view.pendingDecision && !spatialDecision
                ? pendingDecisionPanel
                : !battleContinuation && (
                    <p role="status">
                      Waiting for{' '}
                      {view.waitingFor ? (opponentName ?? 'your opponent') : 'your opponent'}
                    </p>
                  )}
              {combatReputationVisible && (
                <ReputationSummary compact view={view} onDismiss={dismissCombatReputation} />
              )}
              {battleContinuation}
            </>
          }
          soundEligible={soundEligible}
          view={view.battle ? view : { ...view, battle: battleContext }}
          fastPlayback={!motionEnabled}
          recentVolleys={playback?.volleys ?? []}
          knownShips={knownShips}
        />
      </section>
    </DicePresentationVisibilityContext.Provider>
  );
}
