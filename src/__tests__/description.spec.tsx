import { describe, it, expect } from 'vitest';
import { RARE_PARTS, ALL_PARTS, partDescription } from '../config/parts';
import { render, screen } from '@testing-library/react';
import { ItemCard } from '../components/ui';

// React import not required

describe('part descriptions', () => {
  it('every part has a description', () => {
    ALL_PARTS.forEach(p => expect(p.desc, p.id).toBeDefined());
  });

  it('explains rift cannon behavior', () => {
    const rift = RARE_PARTS.find(p => p.id === 'rift_cannon')!;
    const desc = partDescription(rift);
    expect(desc).toMatch(/1-3 damage/);
    expect(desc).toMatch(/damage to you/i);
    expect(desc).toMatch(/aim and computers don't help/i);
  });

  it('renders description in ItemCard', () => {
    const spike = RARE_PARTS.find(p => p.id === 'spike_launcher')!;
    render(<ItemCard item={spike} canAfford={true} ghostDelta={null} onBuy={() => {}} />);
    expect(screen.getByText(/only a 6 hits/i)).toBeInTheDocument();
  });
});
