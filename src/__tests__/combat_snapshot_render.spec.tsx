import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShipFrameSlots } from '../components/ui';

const snapshotShip = {
  frame: { id: 'interceptor', name: 'Interceptor', tiles: 6, tonnage: 1, baseHull: 1 },
  parts: [],
  weapons: [],
  riftDice: 1,
  stats: { init: 1, hullCap: 1, powerUse: 0, powerProd: 0, valid: true, aim: 1, shieldTier: 0, regen: 0 },
  hull: 1,
  alive: true,
};

describe('Combat snapshot fallback rendering', () => {
  it('renders token slots even when parts are empty', () => {
    render(<ShipFrameSlots ship={snapshotShip as any} side='E' />);
    const rows = screen.getAllByTestId('frame-slot-row');
    expect(rows.length).toBeGreaterThan(0);
  });
});

