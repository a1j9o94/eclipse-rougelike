import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { BASE_FACTIONS } from '../../shared/eclipse/catalog';
import type { BlueprintShipType } from '../../shared/eclipse/blueprints';
import ShipSilhouette from '../second-dawn-game/ShipSilhouette';

afterEach(cleanup);
const classes: readonly BlueprintShipType[] = ['interceptor', 'cruiser', 'dreadnought', 'starbase'];

it('gives every faction family and ship class a distinct hull silhouette', () => {
  const hulls: string[] = [];
  for (const faction of BASE_FACTIONS.filter(faction => faction.species === 'alien')) {
    for (const type of classes) {
      const { container, unmount } = render(<ShipSilhouette type={type} faction={faction.id} />);
      expect(container.querySelector('svg')).toHaveAttribute('data-ship-family', faction.id);
      hulls.push(container.querySelector('.dg-ship-hull')!.getAttribute('d')!);
      unmount();
    }
  }
  expect(hulls).toHaveLength(24);
  expect(new Set(hulls).size).toBe(24);
});

it('shares each physical color family with its paired Terran faction', () => {
  const terrans = BASE_FACTIONS.filter(faction => faction.species === 'terran');
  expect(terrans).toHaveLength(6);
  for (const terran of terrans) {
    const alien = BASE_FACTIONS.find(faction => faction.color === terran.color && faction.species === 'alien')!;
    const { container, rerender, unmount } = render(<ShipSilhouette type="cruiser" faction={terran.id} />);
    const hull = container.querySelector('.dg-ship-hull')!.getAttribute('d');
    expect(container.querySelector('svg')).toHaveAttribute('data-ship-family', alien.id);
    rerender(<ShipSilhouette type="cruiser" faction={alien.id} />);
    expect(container.querySelector('.dg-ship-hull')).toHaveAttribute('d', hull);
    unmount();
  }
});

it('keeps accessible class identity and a usable generic silhouette without faction data', () => {
  const { container } = render(<ShipSilhouette type="dreadnought" />);
  expect(screen.getByRole('img', { name: 'Dreadnought blueprint silhouette' })).toBeInTheDocument();
  expect(container.querySelector('.dg-ship-hull')?.getAttribute('d')).toBeTruthy();
});
