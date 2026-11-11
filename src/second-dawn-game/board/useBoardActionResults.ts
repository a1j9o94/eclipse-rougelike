import { boardReceiptAcknowledges, type PendingBoardReceipt } from './boardReceipt';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { PlayerView } from '../../../shared/eclipse/types';
import type { TechnologyId } from '../../../shared/eclipse/technologies';
import { researchedTechnologyIds } from '../../../shared/eclipse/technologies';
import type { SavedQueuedActionReceipt } from '../ActionDraftProvider';
import type { CommandCandidate } from '../SecondDawnBoard';
import { continuesAction, remainingAction } from '../actionCapacity';
import type { AcceptedBoardReceipt } from './useBoardCommands';
interface ActionResultsOptions {
  scope: string;
  view: PlayerView;
  lastAcceptedCommand?: AcceptedBoardReceipt;
  lastQueuedCommand?: SavedQueuedActionReceipt;
  setBuildOpen: Dispatch<SetStateAction<boolean>>;
  setMoveOpen: Dispatch<SetStateAction<boolean>>;
  setMoveTarget: Dispatch<SetStateAction<string | null>>;
  setResearchDraft: Dispatch<SetStateAction<CommandCandidate | null>>;
  submittedResearch: { current: { id: TechnologyId; command: string } | null };
}
/** Action-specific feedback waits for both receipt and authoritative view. */
export function useBoardActionResults({
  scope,
  view,
  lastAcceptedCommand,
  lastQueuedCommand,
  setBuildOpen,
  setMoveOpen,
  setMoveTarget,
  setResearchDraft,
  submittedResearch,
}: ActionResultsOptions) {
  const [buildResult, setBuildResult] = useState('');
  const pendingBuild = useRef<(PendingBoardReceipt & { count: number }) | null>(null);

  const pendingMove = useRef<(PendingBoardReceipt & { ships: number }) | null>(null);
  const [movementResult, setMovementResult] = useState('');
  useEffect(() => {
    pendingBuild.current = null;
    pendingMove.current = null;
    setBuildResult('');
    setMovementResult('');
  }, [scope]);
  useEffect(() => {
    const pending = pendingMove.current;
    if (!pending || !boardReceiptAcknowledges(pending, lastAcceptedCommand, view.revision, scope))
      return;
    pendingMove.current = null;
    const continuing =
      view.phase === 'action' &&
      view.activeSeatId === view.viewerSeatId &&
      !view.pendingDecision &&
      continuesAction(view, 'move') &&
      remainingAction(view, 'move') > 0;
    setMovementResult(
      `${pending.ships} ${pending.ships === 1 ? 'ship moved' : 'ships moved'}. ${continuing ? 'Choose your next ships and destination.' : 'Movement complete.'}`,
    );
    // Keep the result and departure context visible until the player closes it.
  }, [lastAcceptedCommand, view, setMoveTarget, setMoveOpen, scope]);
  useEffect(() => {
    const pending = pendingBuild.current;
    if (!pending || !boardReceiptAcknowledges(pending, lastAcceptedCommand, view.revision, scope))
      return;
    pendingBuild.current = null;
    setBuildResult(
      `${pending.count} ${pending.count === 1 ? 'piece deployed' : 'pieces deployed'} to your galaxy.`,
    );
    if (
      !(
        view.phase === 'action' &&
        view.activeSeatId === view.viewerSeatId &&
        !view.pendingDecision &&
        continuesAction(view, 'build') &&
        remainingAction(view, 'build') > 0
      )
    )
      setBuildOpen(false);
  }, [lastAcceptedCommand, view, setBuildOpen, scope]);
  useEffect(() => {
    if (lastQueuedCommand) {
      pendingBuild.current = null;
      pendingMove.current = null;
      setBuildResult('');
      setMovementResult('');
    }
  }, [lastQueuedCommand]);
  const [acquiredResearch, setAcquiredResearch] = useState<TechnologyId | null>(null);
  const ownedTechnologyKey = researchedTechnologyIds(
    view.seats.find((seat) => seat.id === view.viewerSeatId)!,
  ).join('|');
  useEffect(() => {
    const submitted = submittedResearch.current;
    if (
      !submitted ||
      !lastAcceptedCommand ||
      !['research', 'trade-and-act'].includes(lastAcceptedCommand.type) ||
      !ownedTechnologyKey.split('|').includes(submitted.id)
    )
      return;
    submittedResearch.current = null;
    setAcquiredResearch(submitted.id);
    setResearchDraft((current) =>
      current && JSON.stringify(current.command) === submitted.command ? null : current,
    );
  }, [lastAcceptedCommand, ownedTechnologyKey, setResearchDraft, submittedResearch]);
  return {
    buildResult,
    setBuildResult,
    pendingBuild,
    movementResult,
    setMovementResult,
    pendingMove,
    acquiredResearch,
  };
}
