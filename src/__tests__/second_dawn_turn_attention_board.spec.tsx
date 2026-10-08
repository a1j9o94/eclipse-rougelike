import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { legalCommands } from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';

afterEach(cleanup);
it('opens an upkeep review from the notice without submitting payment until confirmation', () => {
  const state = createGame({ seed: 19, warpPortals: false, seats: [{ id: 'a', faction: 'eridani', controller: 'human' }, { id: 'b', faction: 'hydran', controller: 'ai' }] });
  state.phase = 'upkeep';
  const view = getPlayerView(state, 'a')!;
  const onSubmit = vi.fn();
  render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={onSubmit} onMenu={() => {}}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Review upkeep' }));
  expect(onSubmit).not.toHaveBeenCalled();
  const inspector = screen.getByRole('complementary', { name: 'Selection and action details' });
  expect(within(inspector).getByRole('region', { name: 'Action cost preview' })).toBeVisible();
  fireEvent.click(within(inspector).getByRole('button', { name: 'Finish upkeep', exact: true }));
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

it('announces a new turn while the player is viewing another pane', () => {
  const state = createGame({ seed: 31, seats: [{ id: 'a', faction: 'eridani', controller: 'human' }, { id: 'b', faction: 'hydran', controller: 'ai' }] });
  const view = getPlayerView(state, 'a')!;
  const waitingView = { ...view, activeSeatId: 'b' };
  const ui = render(<SecondDawnBoard view={waitingView} candidates={legalCommands(waitingView)} connected busy={false} status="Saved" onSubmit={vi.fn()} onMenu={() => {}}/>);
  fireEvent.click(within(screen.getByRole('region', { name: 'Civilization roster' })).getByRole('button', { name: /Eridani Empire/ }));
  expect(screen.queryByRole('dialog', { name: 'Your turn' })).not.toBeInTheDocument();
  ui.rerender(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={vi.fn()} onMenu={() => {}}/>);
  expect(screen.getByRole('dialog', { name: 'Your turn' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'View turn' }));
  expect(screen.queryByRole('dialog', { name: 'Your turn' })).not.toBeInTheDocument();
});
