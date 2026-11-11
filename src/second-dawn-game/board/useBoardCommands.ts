import { useEffect, useRef } from 'react';
import type { GameCommand, PlayerView } from '../../../shared/eclipse/types';
import type { TechnologyId } from '../../../shared/eclipse/technologies';
import { canQueueCommand } from '../../../shared/eclipse/queuedActions';
import type { ActionDraftGuard } from '../actionDraftContext';
import type { GameSoundFeedback } from '../sound/useGameSoundFeedback';

export interface AcceptedBoardReceipt {
  revision: number;
  type: GameCommand['type'];
}
export const directTurnActions: GameCommand['type'][] = ['end-action', 'pass', 'finish-upkeep'];
interface BoardCommandsOptions {
  scope: string;
  view: PlayerView;
  queueMode: boolean;
  interactionBlockedReason?: string;
  lastAcceptedCommand?: AcceptedBoardReceipt;
  draftGuard: ActionDraftGuard;
  sound: Pick<GameSoundFeedback, 'submitted' | 'rejected'>;
  submitAuthoritative: (command: GameCommand) => void;
  onQueue?: (command: GameCommand | null) => void;
}
/** Routes intent only. Queuing never manufactures execution feedback or a turn handoff. */
export function useBoardCommands({
  scope,
  view,
  queueMode,
  interactionBlockedReason,
  lastAcceptedCommand,
  draftGuard,
  sound,
  submitAuthoritative,
  onQueue,
}: BoardCommandsOptions) {
  const submittedResearch = useRef<{ id: TechnologyId; command: string } | null>(null);
  const submittedTurnHandoff = useRef<{
    receipt: AcceptedBoardReceipt | undefined;
    revision: number;
    type: GameCommand['type'];
  } | null>(null);
  useEffect(() => {
    submittedResearch.current = null;
    submittedTurnHandoff.current = null;
  }, [scope]);
  const onSubmit = (command: GameCommand) => {
    if (interactionBlockedReason) return;
    if (command.type === 'set-auto-pass') {
      submitAuthoritative(command);
      return;
    }
    if (queueMode) {
      if (canQueueCommand(command)) {
        draftGuard.markSubmitted(command, 'queued');
        onQueue?.(command);
      }
      return;
    }
    if (draftGuard.stale && !view.pendingDecision && !directTurnActions.includes(command.type)) {
      sound.rejected();
      return;
    }
    sound.submitted(command);
    submittedTurnHandoff.current = {
      receipt: lastAcceptedCommand,
      revision: view.revision,
      type: command.type,
    };
    const action = command.type === 'trade-and-act' ? command.action : command;
    if (action.type === 'research')
      submittedResearch.current = {
        id: action.tileId as TechnologyId,
        command: JSON.stringify(command),
      };
    draftGuard.markSubmitted(command);
    submitAuthoritative(command);
  };
  return { onSubmit, submittedResearch, submittedTurnHandoff };
}
