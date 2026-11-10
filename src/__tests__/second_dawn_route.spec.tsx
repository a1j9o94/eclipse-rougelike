import { afterEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

vi.mock('../second-dawn-game/SecondDawnGame', () => ({ default: () => <h1>Second Dawn saved games</h1> }));
afterEach(() => {
  window.history.replaceState(null, '', '/');
});

it.each([
  '/#legacy',
  '/#second-dawn-design-archive',
  '/#second-dawn-preview',
  '/?position=combat#second-dawn-preview',
])('opens saved games from retired links (%s)', async path => {
  window.history.replaceState(null, '', path);
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Second Dawn saved games' })).toBeVisible();
  expect(screen.queryByRole('navigation', { name: 'Preview game stages' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Review position')).not.toBeInTheDocument();
});

it('uses the full-game menu by default', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Second Dawn saved games' })).toBeVisible();
});
