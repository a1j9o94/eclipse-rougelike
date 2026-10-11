import { useEffect, useRef } from 'react';

interface AiRecoveryState {
  revision: number;
  status: 'thinking' | 'scheduled' | 'waiting' | 'failed' | 'finished';
  attempts: number;
  timerFailed: boolean;
}

/** A connected owner offers one automatic retry per failed decision. The server enforces the same bound. */
export function useAiRecovery(credential: string | null, matchId: string | null, connected: boolean, state: AiRecoveryState | null, recover: (credential: string, matchId: string) => Promise<void>): void {
  const attempted = useRef<string | null>(null);
  useEffect(() => {
    if (!credential || !matchId || !connected || state?.status !== 'failed' || state.attempts !== 1 || state.timerFailed) return;
    const key = `${credential}:${matchId}:${state.revision}:1`;
    if (attempted.current === key) return;
    attempted.current = key;
    void recover(credential, matchId).catch(() => {
      // The manual retry control stays available if automatic recovery cannot connect.
    });
  }, [credential, matchId, connected, state?.revision, state?.status, state?.attempts, state?.timerFailed, recover]);
}
