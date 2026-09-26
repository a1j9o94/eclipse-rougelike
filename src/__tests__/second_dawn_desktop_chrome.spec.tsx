import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { legalCommands } from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';

afterEach(cleanup);

it('keeps turn actions in a fixed rail to the right of the inspector', () => {
  const state = createGame({ seed: 7, seats: [{ id: 'a', faction: 'eridani', controller: 'human' }, { id: 'b', faction: 'hydran', controller: 'ai' }] });
  const view = getPlayerView(state, 'a')!;
  const { container } = render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()} />);

  const header = container.querySelector('.sd-header')!;
  expect(header.querySelector('.sd-actions')).toBeNull();
  const rail = screen.getByRole('navigation', { name: 'Turn actions' });
  const layout = container.querySelector('.sd-layout')!;
  expect([...layout.children].filter(element => element.matches('.sd-main,.sd-inspector,.dg-action-rail')).map(element => element.classList[0])).toEqual(['sd-main','sd-inspector','dg-action-rail']);
  expect(rail).toHaveTextContent('Explore');
  expect(rail).toHaveTextContent('Colonize');
  expect(rail).toHaveTextContent('Trade');
  expect(rail).toHaveTextContent('Pass');
  expect(rail.querySelectorAll('.dg-action-rail-primary button')).toHaveLength(6);
  expect(rail.querySelector('.dg-action-rail-turn')).toContainElement(screen.getByRole('button', { name: 'Pass +2 money' }));
  expect(rail).toContainElement(screen.getByRole('checkbox', { name: 'Auto-pass unless attacked' }));
  expect(header.querySelector('.dg-save button')).not.toBeNull();
  expect(container.querySelector('.sd-toolbar')).toBeNull();
  expect(container.querySelector('.sd-footer')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Research', exact: true }));
  expect(screen.getByRole('heading', { name: 'Research' })).toBeInTheDocument();
});
