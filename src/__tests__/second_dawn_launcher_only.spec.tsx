import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SecondDawnGame from '../second-dawn-game/SecondDawnGame';

vi.mock('convex/react', async importOriginal => {
  const actual = await importOriginal<typeof import('convex/react')>();
  return { ...actual, useConvex: () => undefined };
});

it('explains how to reconnect when the game server is unconfigured', () => {
  render(<SecondDawnGame />);
  expect(screen.getByRole('heading', { name: 'Second Dawn needs a server connection.' })).toBeVisible();
  expect(screen.getByText(/connect the application to its game server/i)).toBeVisible();
  expect(screen.queryByRole('link', { name: /playable preview|legacy|roguelike/i })).not.toBeInTheDocument();
});
