import {retryGameConnection, useConnectionRecovery} from './useConnectionRecovery';
import './connectionStatus.css';

export interface ConnectionStatusProps {
  connected: boolean;
  browserOnline: boolean;
  sessionReady: boolean;
  status?: string;
  readyMessage?: string;
  onRetry?: () => void;
}

export default function ConnectionStatus({connected, browserOnline, sessionReady, status = '', readyMessage = '', onRetry = retryGameConnection}: ConnectionStatusProps) {
  const state = useConnectionRecovery(connected, browserOnline, sessionReady);
  const recovery = ['offline', 'connection-stalled', 'session-stalled'].includes(state);
  const message = state === 'offline' ? 'The game server is disconnected. Your browser reports that you are offline.'
    : state === 'connecting' ? 'Connecting to the game server…'
    : state === 'connection-stalled' ? 'The game server connection is taking longer than expected.'
    : state === 'session-loading' ? status || 'Preparing your player session…'
    : state === 'session-stalled' ? 'Your player session has not finished loading.'
    : status || readyMessage;
  if (!message) return null;
  return <div className={`dg-connection-status${recovery ? ' needs-recovery' : ''}`}>
    <div role="status">{message}</div>
    {recovery && <>
      <p>{state === 'connection-stalled'
        ? 'We keep reconnecting automatically. If this continues, check your connection or try another network; some networks or browser extensions block the live game connection.'
        : state === 'offline'
          ? 'The game reconnects automatically when your connection returns.'
          : 'Retry to reload this page and reconnect. If this continues, check whether browser storage is enabled.'}</p>
      <button type="button" onClick={onRetry}>Retry connection</button>
      <small>Reloads this page. Your player identity and saved games stay intact.</small>
    </>}
  </div>;
}
