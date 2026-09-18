import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { legalCommands } from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';

afterEach(cleanup);

it('keeps desktop navigation and session controls in one compact game bar', () => {
  const state = createGame({ seed: 7, seats: [{ id: 'a', faction: 'eridani', controller: 'human' }, { id: 'b', faction: 'hydran', controller: 'ai' }] });
  const view = getPlayerView(state, 'a')!;
  const { container } = render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()} />);

  const header = container.querySelector('.sd-header')!;
  expect(header.querySelector('nav[aria-label="Game screens"]')).not.toBeNull();
  expect(header.querySelector('.dg-save button')).not.toBeNull();
  expect(container.querySelector('.sd-toolbar')).toBeNull();
});
