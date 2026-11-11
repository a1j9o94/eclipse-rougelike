import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { legalCommands } from '../../shared/eclipse/legal';
import { processGameCommand } from '../../shared/eclipse/engine';

afterEach(cleanup);

it('recovers original build confirmation after subscription overtakes a lost mutation response', () => {
  const state = createGame({ seed: 42, seats: [
    { id: 'a', faction: 'terran-directorate', controller: 'human' },
    { id: 'b', faction: 'hydran', controller: 'ai' },
  ] });
  state.activeSeatId = 'a';
  state.revision = 10;
  state.seats[0].resources = { money: 20, science: 20, materials: 20 };
  const submit = vi.fn();
  const initial = getPlayerView(state, 'a');
  const controls = { connected: true, busy: false, status: '', onSubmit: submit, onMenu: vi.fn() };
  const ui = render(<SecondDawnBoard view={initial} candidates={legalCommands(initial)} {...controls}/>);
  fireEvent.click(screen.getAllByRole('button', { name: 'Build', exact: true })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Add interceptor' }));
  fireEvent.click(screen.getByText('Choose from sector list'));
  fireEvent.click(screen.getByRole('button', { name: 'Place interceptor in sector 221' }));
  fireEvent.click(screen.getByRole('button', { name: /^Build 1 ship/ }));
  const command = submit.mock.calls[0][0];
  const accepted = processGameCommand(state, 'a', command);
  if (!accepted.ok) throw Error(accepted.error.message);
  const subscribed = getPlayerView({ ...accepted.state, revision: 11 }, 'a');
  ui.rerender(<SecondDawnBoard view={subscribed} candidates={legalCommands(subscribed)} {...controls}/>);
  expect(screen.queryByText('1 piece deployed to your galaxy.')).not.toBeInTheDocument();
  // The same draft is still present. The session retries its original idempotency ID.
  fireEvent.click(screen.getByRole('button', { name: /^Build 1 ship/ }));
  expect(submit).toHaveBeenCalledTimes(2);
  expect(submit.mock.calls[1][0]).toEqual(command);
  ui.rerender(<SecondDawnBoard view={subscribed} candidates={legalCommands(subscribed)} {...controls} lastAcceptedCommand={{ revision: 11, type: command.type }}/>);
  expect(screen.getByText('1 piece deployed to your galaxy.')).toBeInTheDocument();
});
