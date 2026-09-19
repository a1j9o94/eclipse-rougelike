/** Public consent information only; checkpoints and guest identities stay on the server. */
export interface RollbackPending {
  id: string;
  targetRevision: number;
  targetSummary: string;
  requestedBySeatId: string;
  requiredSeatIds: string[];
  approvedSeatIds: string[];
  createdAt: number;
}
export interface RollbackResolution {
  status: 'applied' | 'rejected' | 'cancelled';
  targetRevision: number;
  resolvedAt: number;
  appliedRevision: number | null;
}
export interface RollbackStatus {
  isHost: boolean;
  revision: number;
  pending: RollbackPending | null;
  lastResolution: RollbackResolution | null;
}
