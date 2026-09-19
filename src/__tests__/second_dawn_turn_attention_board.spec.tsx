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
