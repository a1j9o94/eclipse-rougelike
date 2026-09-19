import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SecondDawnGame from '../second-dawn-game/SecondDawnGame';

vi.mock('convex/react', async importOriginal => {
  const actual = await importOriginal<typeof import('convex/react')>();
  return { ...actual, useConvex: () => undefined };
});

it('offers the shared playable preview when the game server is unconfigured', () => {
  render(<SecondDawnGame />);
  expect(screen.getByRole('heading', { name: 'Second Dawn needs a server connection.' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Explore the playable preview' })).toHaveAttribute('href', '#second-dawn-preview');
  expect(screen.queryByRole('link', { name: /legacy|roguelike/i })).not.toBeInTheDocument();
});
