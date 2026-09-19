import { describe, expect, it } from 'vitest';
import {
  DISCOVERIES as ALL_DISCOVERIES,
  createDiscoverySupply,
  getDiscovery,
} from '../../shared/eclipse/discoveries';

const DISCOVERIES = ALL_DISCOVERIES.filter(item => !item.expansion);

describe('publisher-verified base discovery supply', () => {
  it('conserves exactly 36 tiles across 24 distinct effects', () => {
    expect(DISCOVERIES).toHaveLength(24);
    const supply = createDiscoverySupply();
    expect(supply).toHaveLength(36);
    expect(new Set(supply).size).toBe(24);
    expect(supply.filter((id) => id === 'ancient-tech')).toHaveLength(3);
    expect(supply.filter((id) => id === 'ancient-cruiser')).toHaveLength(3);
    expect(supply.filter((id) => id === 'ancient-orbital')).toHaveLength(2);
    expect(supply.filter((id) => id === 'ancient-monolith')).toHaveLength(1);
  });
  it('preserves exact resource bonuses and quantities', () => {
    expect(getDiscovery('materials').effect).toEqual({
      kind: 'resources',
      resources: { materials: 6, science: 0, money: 0 },
    });
    expect(getDiscovery('science').copies).toBe(3);
    expect(getDiscovery('money').effect).toEqual({
      kind: 'resources',
      resources: { materials: 0, science: 0, money: 8 },
    });
    expect(getDiscovery('mixed-resources').copies).toBe(2);
    expect(getDiscovery('mixed-resources').effect).toEqual({
      kind: 'resources',
      resources: { materials: 2, science: 2, money: 3 },
    });
    expect(getDiscovery('ancient-orbital').effect).toEqual({
      kind: 'place-structure',
      structure: 'orbital',
      bonusMaterials: 2,
    });
  });
  it('keeps the separate Muon Source outside the blueprint grid', () => {
    const parts = DISCOVERIES.filter(
      (tile) => tile.effect.kind === 'ancient-ship-part',
    );
    expect(parts).toHaveLength(15);
    expect(
      parts.filter(
        (tile) =>
          tile.effect.kind === 'ancient-ship-part' &&
          tile.effect.placement === 'grid',
      ),
    ).toHaveLength(14);
    expect(getDiscovery('muon-source').effect).toEqual({
      kind: 'ancient-ship-part',
      part: 'muon-source',
      placement: 'outside-grid',
      mayStore: true,
      removedDisposition: 'removed-from-game',
    });
  });
  it('restricts Ancient Tech to the lowest printed-cost unowned regular market technology', () => {
    expect(getDiscovery('ancient-tech').effect).toEqual({
      kind: 'free-technology',
      selection: 'lowest-printed-cost-unowned-regular-market-tech',
      ties: 'player-choice',
    });
  });
  it('preserves the two-VP alternative and base-box Ancient Warp Portal', () => {
    expect(DISCOVERIES.every((tile) => tile.vpAlternative === 2)).toBe(true);
    expect(getDiscovery('ancient-warp-portal').effect).toEqual({
      kind: 'place-warp-portal',
      controlledSectorVp: 2,
    });
    expect(createDiscoverySupply()).not.toBe(createDiscoverySupply());
  });
});

it('excludes the optional Ancient Warp Portal from the discovery supply when disabled', () => {
  const supply = createDiscoverySupply(false);
  expect(supply).toHaveLength(35);
  expect(supply).not.toContain('ancient-warp-portal');
});
