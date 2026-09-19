import { describe, expect, it } from 'vitest';
import { getTechnology, researchCost } from '../../shared/eclipse/technologies';
import { getShipPart } from '../../shared/eclipse/parts';
import { createDiscoverySupply, getDiscovery } from '../../shared/eclipse/discoveries';
import { createTechnologyBag, drawTechnologies } from '../../shared/eclipse/supplies';
import { randomSeed } from '../../shared/eclipse/random';
import { createGame } from '../../shared/eclipse/setup';
import { profileVersions } from '../../shared/eclipse/catalog';

describe('publisher Rift Cannon module catalog and setup', () => {
  it('prices the singleton rare technology at 9 science with a 7 minimum', () => {
    expect(getTechnology('rift-cannon')).toMatchObject({ track: 'rare', copies: 1, baseCost: 9, minimumCost: 7, effect: { kind: 'ship-part', part: 'rift-cannon' } });
    expect(researchCost('rift-cannon', 'nano', [])).toMatchObject({ ok: true, scienceCost: 9 });
    expect(researchCost('rift-cannon', 'nano', [{ technology: 'nanorobots', track: 'nano' }, { technology: 'fusion-drive', track: 'nano' }])).toMatchObject({ ok: true, scienceCost: 7 });
  });
  it('defines researched and unique discovery weapons with their printed energy/hull', () => {
    expect(getShipPart('rift-cannon')).toMatchObject({ energyConsumption: 2, hull: 0, access: { kind: 'technology', technology: 'rift-cannon' }, weapons: [{ kind: 'cannon', color: 'magenta', dice: 1 }] });
    expect(getShipPart('rift-conductor')).toMatchObject({ energyConsumption: 1, hull: 1, access: { kind: 'ancient' }, weapons: [{ kind: 'cannon', color: 'magenta', dice: 1 }] });
    expect(getDiscovery('rift-conductor')).toMatchObject({ copies: 1, vpAlternative: 2, effect: { kind: 'ancient-ship-part', part: 'rift-conductor', mayStore: true, placement: 'grid' } });
  });
  it('adds exactly one research and discovery tile only when opted in', () => {
    const base = createTechnologyBag(randomSeed(81));
    const expanded = createTechnologyBag(randomSeed(81), true, true);
    expect(base.tiles).toHaveLength(114);
    expect(base.tiles.some(t => t.technology === 'rift-cannon')).toBe(false);
    expect(expanded.tiles).toHaveLength(115);
    expect(expanded.tiles.filter(t => t.technology === 'rift-cannon')).toHaveLength(1);
    expect(expanded).toEqual(createTechnologyBag(randomSeed(81), true, true));
    expect(createDiscoverySupply()).not.toContain('rift-conductor');
    expect(createDiscoverySupply(true, true)).toHaveLength(37);
    expect(createDiscoverySupply(true, true).filter(t => t === 'rift-conductor')).toHaveLength(1);
    expect(createTechnologyBag(randomSeed(81), false, true).tiles).toHaveLength(114);
    expect(createDiscoverySupply(false, true)).toHaveLength(36);
  });
  it('does not charge Rift Cannon against a regular technology draw quota', () => {
    expect(drawTechnologies([{ id: 'rift', technology: 'rift-cannon' }, { id: 'regular', technology: 'starbase' }], 1)).toMatchObject({ regularDrawn: 1, drawn: [{ id: 'rift' }, { id: 'regular' }], remaining: [] });
  });
  it.each(['base', 'expanded-v1'] as const)('pins %s new games independently of old snapshots', factionProfile => {
    const config = { seed: 73, seats: [{ id: 'human', faction: 'eridani' as const, controller: 'human' as const }, { id: 'ai', faction: 'hydran' as const, controller: 'ai' as const }], warpPortals: true, factionProfile };
    const base = createGame(config);
    const rift = createGame({ ...config, riftCannons: true });
    expect(base).toMatchObject(profileVersions(factionProfile));
    expect(rift).toMatchObject(profileVersions(factionProfile, true));
    expect(rift.rulesVersion).not.toBe(base.rulesVersion);
    expect(rift.engine?.riftCannons).toBe(true);
    expect([...rift.technologyMarket, ...rift.supplies.technology].filter(t => t === 'rift-cannon')).toHaveLength(1);
    expect(rift.supplies.discovery).toContain('rift-conductor');
    expect(base.supplies.discovery).not.toContain('rift-conductor');
    expect(base.engine?.riftCannons).toBeUndefined();
  });
});
