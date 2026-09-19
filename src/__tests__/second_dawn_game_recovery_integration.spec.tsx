// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getFunctionName } from 'convex/server';
import type { Id } from '../../convex/_generated/dataModel';
import type { MatchPlayerView } from '../../convex/eclipseMatches';
import type { RollbackStatus } from '../../shared/eclipse/rollback';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { useGameRecoveryControls } from '../second-dawn-game/useGameRecoveryControls';

const mocks = vi.hoisted(() => ({ status: null as RollbackStatus | null, resign: vi.fn(), request: vi.fn(), respond: vi.fn(), cancel: vi.fn(), recover:vi.fn() }));
vi.mock('convex/react', () => ({
  useQuery: () => mocks.status,
  useAction:()=>mocks.recover,
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) => ({
    'eclipseMatches:resignMatch': mocks.resign,
    'eclipseRollback:requestRollback': mocks.request,
    'eclipseRollback:respondRollback': mocks.respond,
    'eclipseRollback:cancelRollback': mocks.cancel,
  })[getFunctionName(reference)],
}));
const first = 'first-match' as Id<'eclipseMatchesV1'>;
const second = 'second-match' as Id<'eclipseMatchesV1'>;
const target = { revision: 7, actorSeatId: 'seat-1', actorName: 'Eridani Empire', round: 2, summary: 'Moved one ship', details: [], rollbackAvailable: true };
function view(viewerSeatId = 'seat-1'): MatchPlayerView {
  const state = createGame({ seed: 19, seats: [{ id: 'seat-1', faction: 'eridani', controller: 'human' }, { id: 'seat-2', faction: 'hydran', controller: 'human' }] });
  return { ...getPlayerView(state, viewerSeatId)!, revision: 10, lastSeenRevision: null, multiplayer: null, aiStatus: null, participation: 'active', matchLifecycle: 'active', canResign: true, resignOutcome: 'abandoned' };
}
function Harness({ matchId = first, viewer = view(), connected = true, onHome = () => {} }: { matchId?: Id<'eclipseMatchesV1'>; viewer?: MatchPlayerView; connected?: boolean; onHome?: () => void }) {
  const controls = useGameRecoveryControls({ credential: 'credential', matchId, view: viewer, connected, busy: false, onHome });
  return <><button onClick={controls.openMenu}>Menu</button><button onClick={() => controls.historyRollback.onSelect(target)}>Select historical move</button><button onClick={()=>controls.historyRollback.onSelect({...target,rollbackAvailable:false,rollbackRecoverable:true})}>Select old position</button><output aria-label="Working">{String(controls.working)}</output>{controls.banner}{controls.dialogs}</>;
}
function pending(isHost = false): RollbackStatus {
  return { isHost, revision: 11, pending: { id: 'rollback-one', targetRevision: 7, targetSummary: target.summary, requestedBySeatId: 'seat-1', requiredSeatIds: ['seat-2'], approvedSeatIds: [], createdAt: 100 }, lastResolution: null };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.status = { isHost: true, revision: 10, pending: null, lastResolution: null };
  mocks.request.mockResolvedValue(pending(true)); mocks.respond.mockResolvedValue(undefined); mocks.cancel.mockResolvedValue(undefined);
  mocks.resign.mockResolvedValue({ ok: true, revision: 11, outcome: 'abandoned', duplicate: false });
});
afterEach(cleanup);

it('save and return home performs no mutation; solo quit waits for its authoritative success', async () => {
  const home = vi.fn();
  render(<Harness onHome={home}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save & return home' }));
  expect(home).toHaveBeenCalledOnce();
  expect(mocks.resign).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Quit this game' }));
  expect(mocks.resign).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm quit' }));
  await waitFor(() => expect(home).toHaveBeenCalledTimes(2));
  expect(mocks.resign).toHaveBeenCalledWith({ credential: 'credential', matchId: first, commandId: expect.any(String), expectedRevision: 10 });
});
it('submits the selected checkpoint and current revision only after explicit host confirmation', async () => {
  const { rerender } = render(<Harness/>);
  fireEvent.click(screen.getByRole('button', { name: 'Select historical move' }));
  expect(mocks.request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Request undo' }));
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith({ credential: 'credential', matchId: first, targetRevision: 7, expectedRevision: 10 }));
  mocks.status = pending(true); rerender(<Harness/>);
  expect(await screen.findByRole('button', { name: 'Cancel undo request' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel undo request' }));
  await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith({ credential: 'credential', matchId: first, rollbackId: 'rollback-one' }));
});
it.each([true, false])('persists and restores the shared vote dialog and submits approval=%s once', async approve => {
  mocks.status = pending();
  const { rerender } = render(<Harness viewer={view('seat-2')}/>);
  expect(await screen.findByRole('dialog', { name: 'Undo game actions' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Close undo game actions' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Review undo request' }));
  fireEvent.click(screen.getByRole('button', { name: approve ? 'Approve undo' : 'Keep current game' }));
  await waitFor(() => expect(mocks.respond).toHaveBeenCalledWith({ credential: 'credential', matchId: first, rollbackId: 'rollback-one', approve }));
  mocks.status = { isHost: false, revision: approve ? 12 : 11, pending: null, lastResolution: { status: approve ? 'applied' : 'rejected', targetRevision: 7, resolvedAt: 200, appliedRevision: approve ? 12 : null } };
  rerender(<Harness viewer={view('seat-2')}/>);
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByText(approve ? /Game restored/ : /Undo declined/)).toBeVisible();
});
it('keeps the vote visible after a server error and disables voting while disconnected', async () => {
  mocks.status = pending(); mocks.respond.mockRejectedValueOnce(new Error('Connection interrupted'));
  const { rerender } = render(<Harness viewer={view('seat-2')}/>);
  fireEvent.click(await screen.findByRole('button', { name: 'Approve undo' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted');
  rerender(<Harness viewer={view('seat-2')} connected={false}/>);
  expect(screen.getByRole('button', { name: 'Approve undo' })).toBeDisabled();
  expect(mocks.respond).toHaveBeenCalledOnce();
});
it('does not let an old resignation completion navigate away from a newly opened game', async () => {
  let complete: (result: { ok: true; revision: number; outcome: 'abandoned'; duplicate: false }) => void = () => {};
  mocks.resign.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  const home = vi.fn();
  const { rerender } = render(<Harness onHome={home}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Quit this game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm quit' }));
  expect(screen.getByLabelText('Working')).toHaveTextContent('true');
  rerender(<Harness matchId={second} onHome={home}/>);
  expect(screen.getByLabelText('Working')).toHaveTextContent('false');
  await act(async () => complete({ ok: true, revision: 11, outcome: 'abandoned', duplicate: false }));
  expect(home).not.toHaveBeenCalled();
});

it('verifies an older checkpoint before offering the existing consent flow',async()=>{
 let complete:(value:{ok:boolean})=>void=()=>{};mocks.recover.mockImplementation(()=>new Promise(resolve=>{complete=resolve;}));render(<Harness/>);
 fireEvent.click(screen.getByRole('button',{name:'Select old position'}));expect(mocks.recover).toHaveBeenCalledWith({credential:'credential',matchId:first,targetRevision:7});
 expect(screen.getByRole('button',{name:'Request undo'})).toBeDisabled();expect(mocks.request).not.toHaveBeenCalled();
 await act(async()=>complete({ok:true}));expect(screen.getByRole('button',{name:'Request undo'})).toBeEnabled();expect(mocks.request).not.toHaveBeenCalled();
});
