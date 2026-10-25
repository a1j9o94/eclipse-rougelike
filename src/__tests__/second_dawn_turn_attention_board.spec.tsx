import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { legalCommands } from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';

afterEach(cleanup);
it('presents upkeep settlement without submitting payment until collection', () => {
  const state = createGame({ seed: 19, warpPortals: false, seats: [{ id: 'a', faction: 'eridani', controller: 'human' }, { id: 'b', faction: 'hydran', controller: 'ai' }] });
  state.phase = 'upkeep';
  const view = getPlayerView(state, 'a')!;
  const onSubmit = vi.fn();
  render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={onSubmit} onMenu={() => {}}/>);
  expect(onSubmit).not.toHaveBeenCalled();
  const inspector = screen.getByRole('region', { name: 'Upkeep settlement' });
  fireEvent.click(within(inspector).getByRole('button', { name: 'Collect income', exact: true }));
  expect(onSubmit).toHaveBeenCalledWith({ type: 'finish-upkeep' });
});

it('keeps direct turn actions available without action-queue controls', () => {
  const state = createGame({ seed: 29, seats: [{ id: 'a', faction: 'terran-directorate', controller: 'human' }, { id: 'b', faction: 'hydran', controller: 'ai' }] });
  const view = getPlayerView(state, 'a')!;
  const formerQueueProps = { onSaveQueue: vi.fn(), actionQueue: null };
  render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={vi.fn()} onMenu={() => {}} {...formerQueueProps}/>);
  expect(screen.queryByRole('button', { name: 'Open action queue' })).toBeNull();
  expect(screen.queryByLabelText('Queue instead of play')).toBeNull();
  expect(screen.getByRole('button', { name: 'Explore', exact: true })).toBeVisible();
});

it('preserves inspection when the next turn arrives', () => {
  const state = createGame({ seed: 31, seats: [{ id: 'a', faction: 'eridani', controller: 'human' }, { id: 'b', faction: 'hydran', controller: 'ai' }] });
  const view = getPlayerView(state, 'a')!;
  const waitingView = { ...view, activeSeatId: 'b' };
  const ui = render(<SecondDawnBoard view={waitingView} candidates={legalCommands(waitingView)} connected busy={false} status="Saved" onSubmit={vi.fn()} onMenu={() => {}}/>);
  fireEvent.click(within(screen.getByRole('region', { name: 'Civilization roster' })).getByRole('button', { name: /Eridani Empire/ }));
  expect(screen.queryByRole('dialog', { name: 'Your turn' })).not.toBeInTheDocument();
  ui.rerender(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={vi.fn()} onMenu={() => {}}/>);
  expect(screen.getByRole('heading', {name:'Eridani Empire'})).toBeVisible();
  expect(screen.queryByRole('button', { name: 'View turn' })).toBeNull();
  expect(screen.queryByRole('dialog', { name: 'Your turn' })).not.toBeInTheDocument();
});
