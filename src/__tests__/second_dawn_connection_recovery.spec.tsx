import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import ConnectionStatus from '../second-dawn-session/ConnectionStatus';

afterEach(() => {cleanup();vi.useRealTimers();});

it('replaces an unexplained prolonged connection wait with recovery controls', () => {
  vi.useFakeTimers();
  const retry = vi.fn();
  render(<ConnectionStatus connected={false} browserOnline sessionReady={false} onRetry={retry}/>);
  expect(screen.getByRole('status')).toHaveTextContent('Connecting to the game server');
  expect(screen.queryByRole('button', {name: 'Retry connection'})).toBeNull();
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByRole('status')).toHaveTextContent('The game server connection is taking longer than expected');
  expect(screen.getByText(/automatically/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', {name: 'Retry connection'}));
  expect(retry).toHaveBeenCalledOnce();
});

it('identifies offline state immediately, then clears recovery guidance after reconnect', () => {
  vi.useFakeTimers();
  const {rerender} = render(<ConnectionStatus connected={false} browserOnline={false} sessionReady onRetry={vi.fn()}/>);
  expect(screen.getByRole('status')).toHaveTextContent('Your browser reports that you are offline');
  rerender(<ConnectionStatus connected browserOnline sessionReady status="Game saved" onRetry={vi.fn()}/>);
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByRole('status')).toHaveTextContent('Game saved');
  expect(screen.queryByRole('button', {name: 'Retry connection'})).toBeNull();
});

it('does not let an earlier successful save status hide a lost connection', () => {
  render(<ConnectionStatus connected={false} browserOnline={false} sessionReady status="Game saved" onRetry={vi.fn()}/>);
  expect(screen.getByRole('status')).toHaveTextContent('Your browser reports that you are offline');
  expect(screen.getByRole('status')).not.toHaveTextContent('Game saved');
});

it('offers recovery when guest initialization stalls even with a healthy socket', () => {
  vi.useFakeTimers();
  render(<ConnectionStatus connected browserOnline sessionReady={false} onRetry={vi.fn()}/>);
  expect(screen.getByRole('status')).toHaveTextContent('Preparing your player session');
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByRole('status')).toHaveTextContent('Your player session has not finished loading');
  expect(screen.getByRole('button', {name: 'Retry connection'})).toBeEnabled();
});

it('trusts a healthy game socket over an incorrect browser offline hint', () => {
  render(<ConnectionStatus connected browserOnline={false} sessionReady readyMessage="Ready to play"/>);
  expect(screen.getByRole('status')).toHaveTextContent('Ready to play');
  expect(screen.queryByRole('button', {name: 'Retry connection'})).toBeNull();
});

it('still detects stalled session loading when the socket works but the browser reports offline', () => {
  vi.useFakeTimers();
  render(<ConnectionStatus connected browserOnline={false} sessionReady={false}/>);
  expect(screen.getByRole('status')).toHaveTextContent('Preparing your player session');
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByRole('status')).toHaveTextContent('Your player session has not finished loading');
});
