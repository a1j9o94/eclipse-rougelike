import { describe, expect, it } from 'vitest';
import { createDiscoverySupply, createLessRandomDiscoverySupply, getDiscovery } from '../../shared/eclipse/discoveries';
import { TECHNOLOGIES } from '../../shared/eclipse/technologies';
import { getShipPart } from '../../shared/eclipse/parts';

describe('May 2026 less-random component catalog', () => {
  it('has the five extra discovery tiles and revised missiles without leaking into Standard', () => {
    const supply = createLessRandomDiscoverySupply();
    expect(supply).toHaveLength(40);
    expect(supply.filter(id => id === 'money-choice')).toHaveLength(2);
    for (const id of ['accelerated-evolution','artifact-codex','ancient-might','less-random-ion-missile','less-random-antimatter-missile','less-random-soliton-missile']) expect(supply).toContain(id);
    expect(supply).not.toContain('rift-conductor');
    expect(supply).not.toContain('ancient-warp-portal');
    expect(createDiscoverySupply()).toHaveLength(36);
    expect(createDiscoverySupply()).not.toContain('artifact-codex');
  });
  it('retains Standard missiles while giving the variant printed energy costs', () => {
    expect(getShipPart('ion-missile').energyConsumption).toBe(0);
    expect(getShipPart('less-random-ion-missile').energyConsumption).toBe(1);
    expect(getShipPart('less-random-antimatter-missile').energyConsumption).toBe(2);
    expect(getShipPart('less-random-soliton-missile').energyConsumption).toBe(1);
    expect(getShipPart('less-random-soliton-missile').initiative).toBe(0);
    expect(getShipPart('less-random-ion-missile').weapons[0].dice).toBe(3);
  });
  it('adds thirteen tech tiles, including regular Flux Missile, making 124 plus two developments', () => {
    const additions = TECHNOLOGIES.filter(t => t.expansion === 'less-random');
    expect(additions.reduce((sum,t) => sum + (t.copies ?? 0), 0)).toBe(13);
    expect(additions.find(t => t.id === 'regular-flux-missile')).toMatchObject({track:'military',baseCost:11,minimumCost:8,copies:3,effect:{kind:'ship-part',part:'flux-missile'}});
    expect(additions.find(t => t.id === 'advanced-colony-ships')).toMatchObject({track:'grid',baseCost:9,minimumCost:7,copies:4});
    expect(getDiscovery('ancient-might').effect).toEqual({kind:'end-game-bonus',bonus:'reputation'});
  });
});
