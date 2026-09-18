import {useEffect, useState} from 'react';

export type ConnectionRecoveryState = 'ready' | 'offline' | 'connecting' | 'connection-stalled' | 'session-loading' | 'session-stalled';

/** Convex owns automatic socket retries; this adds an actionable UI deadline. */
export function useConnectionRecovery(connected: boolean, browserOnline: boolean, sessionReady: boolean): ConnectionRecoveryState {
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    setStalled(false);
    if ((!browserOnline && !connected) || (connected && sessionReady)) return;
    const timer = window.setTimeout(() => setStalled(true), 10000);
    return () => window.clearTimeout(timer);
  }, [connected, browserOnline, sessionReady]);
  if (!connected && !browserOnline) return 'offline';
  if (!connected) return stalled ? 'connection-stalled' : 'connecting';
  if (!sessionReady) return stalled ? 'session-stalled' : 'session-loading';
  return 'ready';
}

/** Recreates the public Convex client without deleting identity or saved games. */
export function retryGameConnection(): void {
  window.location.reload();
}
