// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { legalCommands } from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';

const originalScrollIntoView = Element.prototype.scrollIntoView;
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Element.prototype.scrollIntoView = originalScrollIntoView;
  localStorage.clear();
});

function renderBoard(mobile: boolean) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: mobile, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const state = createGame({ seed: 31, seats: [
    { id: 'a', faction: 'hydran', controller: 'human' },
    { id: 'b', faction: 'eridani', controller: 'ai' },
  ] });
  const view = getPlayerView(state, 'a')!;
  const onSubmit = vi.fn();
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={onSubmit} onMenu={vi.fn()} />);
  return { onSubmit, scroll };
}

it.each([false, true])('opens own Command Center tracks from the header economy controls (mobile: %s)', mobile => {
  const { onSubmit, scroll } = renderBoard(mobile);
  if (mobile) fireEvent.click(screen.getByRole('button', { name: 'Open income and upkeep tracks in Command Center' }));
  else {
    fireEvent.doubleClick(screen.getByLabelText(/more actions? affordable this round/));
    fireEvent.click(screen.getByRole('button', {name: 'Inspect economy tracks'}));
  }
  expect(screen.getByRole('heading', { name: 'Income & upkeep tracks' })).toBeVisible();
  expect(within(screen.getByRole('region', { name: 'Economy tracks' })).getByRole('region', { name: 'Money income track' })).toBeVisible();
  expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  expect(onSubmit).not.toHaveBeenCalled();
});

it('keeps gold detail behind double-click without navigating away from play', () => {
  renderBoard(false);
  fireEvent.doubleClick(screen.getByLabelText(/more actions? affordable this round/));
  expect(screen.getByText('Held')).toBeVisible();
  expect(screen.getByText(/Purchase costs and later income changes/)).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Income & upkeep tracks' })).toBeNull();
});
