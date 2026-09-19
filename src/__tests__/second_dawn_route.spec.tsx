import { afterEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

vi.mock('../second-dawn-game/SecondDawnGame', () => ({ default: () => <h1>Second Dawn saved games</h1> }));
afterEach(() => {
  window.history.replaceState(null, '', '/');
});

it('opens the real engine fixture view from the public preview route', async () => {
  window.history.replaceState(null, '', '/#second-dawn-preview');
  render(<App />);
  expect(await screen.findByLabelText('Review position')).toBeInTheDocument();
  expect(screen.getByRole('group',{name:'Galaxy map'})).toBeInTheDocument();
  expect(screen.queryByText(/Illustrative fixtures/i)).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Legacy game' }),
  ).not.toBeInTheDocument();
});

it('routes retired legacy bookmarks to the full-game menu', async () => {
  window.history.replaceState(null, '', '/#legacy');
  render(<App />);
  expect(
    await screen.findByRole('heading', { name: 'Second Dawn saved games' }),
  ).toBeInTheDocument();
});

it('uses the full-game menu by default', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Second Dawn saved games' })).toBeInTheDocument();
});

it('offers visible game-stage shortcuts and opens a shared link directly in active combat', async () => {
  window.history.replaceState(null, '', '/?position=combat#second-dawn-preview');
  render(<App />);
  expect(await screen.findByRole('navigation', {name:'Preview game stages'})).toBeInTheDocument();
  for (const name of ['Opening','Round 4','Round 8','Active combat','Ancients']) expect(screen.getByRole('button',{name,exact:true})).toBeInTheDocument();
  expect(screen.getByLabelText('Review position')).toHaveValue('combat');
  expect(screen.getByRole('heading',{name:/Battle.*Sector/i})).toBeInTheDocument();
});

it('routes retired design-archive bookmarks to the full-game menu', async () => {
  window.history.replaceState(null, '', '/#second-dawn-design-archive');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Second Dawn saved games' })).toBeInTheDocument();
});
