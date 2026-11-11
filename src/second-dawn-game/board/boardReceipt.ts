import type { AcceptedBoardReceipt } from './useBoardCommands';
export interface PendingBoardReceipt {
  scope: string;
  receipt: AcceptedBoardReceipt | undefined;
  type: AcceptedBoardReceipt['type'];
}
/**
 * A queued save is not an execution receipt. Match a fresh accepted response, not a
 * revision newer than the retry's view: subscriptions can deliver an executed move
 * before its lost mutation response is recovered using the original command ID.
 */
export function boardReceiptAcknowledges(
  pending: PendingBoardReceipt,
  receipt: AcceptedBoardReceipt | undefined,
  viewRevision: number,
  scope: string,
): boolean {
  return (
    pending.scope === scope &&
    !!receipt &&
    receipt.type === pending.type &&
    receipt !== pending.receipt &&
    viewRevision >= receipt.revision
  );
}
