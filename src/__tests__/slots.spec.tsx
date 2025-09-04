import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ItemCard } from '../components/ui';
import { PARTS } from '../config/parts';
import App from '../App';

async function toOutpost(faction: RegExp) {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: faction }));
  fireEvent.click(screen.getByRole('button', { name: /Easy/i }));
  fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }));
  await screen.findByText(/^Victory$/i, undefined, { timeout: 10000 });
  const ret = screen.getByRole('button', { name: /Return to Outpost/i });
  await waitFor(() => expect(ret).not.toBeDisabled());
  fireEvent.click(ret);
  await screen.findByText(/Outpost Inventory/i);
}

describe('slot displays', () => {
  it('shows slot usage in ItemCard', () => {
    const cluster = PARTS.weapons.find(p => p.id === 'plasma_cluster')!;
    render(<ItemCard item={cluster} canAfford={true} ghostDelta={null as any} onBuy={() => {}} />);
    expect(screen.getByText(/2 slots/i)).toBeInTheDocument();
  });

  it('shows slots in Class Blueprint header for Cruiser', async () => {
    await toOutpost(/Crimson Vanguard/i);
    const header = await screen.findByText(/Class Blueprint — Cruiser/i);
    expect(header.textContent).toMatch(/4\/8/);
  }, 20000);

  it('previews slot usage in ItemCard ghost delta', () => {
    const part = PARTS.weapons[0];
    const ghost = {
      targetName: 'Interceptor',
      use: 0,
      prod: 0,
      valid: true,
      slotsUsed: 5,
      slotCap: 6,
      slotOk: true,
      initBefore: 0,
      initAfter: 0,
      initDelta: 0,
      hullBefore: 0,
      hullAfter: 0,
      hullDelta: 0,
    };
    render(<ItemCard item={part} canAfford={true} ghostDelta={ghost as any} onBuy={() => {}} />);
    expect(screen.getByText('⬛ 5/6 ✔️')).toBeInTheDocument();
  });

  it('shows ❌ when slot limit exceeded in preview', () => {
    const part = PARTS.weapons[0];
    const ghost = {
      targetName: 'Interceptor',
      use: 0,
      prod: 0,
      valid: true,
      slotsUsed: 7,
      slotCap: 6,
      slotOk: false,
      initBefore: 0,
      initAfter: 0,
      initDelta: 0,
      hullBefore: 0,
      hullAfter: 0,
      hullDelta: 0,
    };
    render(<ItemCard item={part} canAfford={true} ghostDelta={ghost as any} onBuy={() => {}} />);
    expect(screen.getByText('⬛ 7/6 ❌')).toBeInTheDocument();
  });
});

