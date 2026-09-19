import { describe, expect, it } from 'vitest';
import {
  TECHNOLOGIES as ALL_TECHNOLOGIES,
  getTechnology,
  researchCost,
  type ResearchEntry,
} from '../../shared/eclipse/technologies';

const TECHNOLOGIES = ALL_TECHNOLOGIES.filter(item => !item.expansion);

describe('Second Dawn technology catalog and research pricing', () => {
  it('contains all 24 regular and 15 singleton rare technologies with separately attributed regular supplies', () => {
    expect(TECHNOLOGIES).toHaveLength(39);
    for (const track of ['military', 'grid', 'nano']) {
      expect(TECHNOLOGIES.filter((tech) => tech.track === track)).toHaveLength(
        8,
      );
    }
    expect(TECHNOLOGIES.filter((tech) => tech.track === 'rare')).toHaveLength(
      15,
    );
    expect(
      TECHNOLOGIES.filter((tech) => tech.track === 'rare').every(
        (tech) => tech.copies === 1,
      ),
    ).toBe(true);
    expect(
      TECHNOLOGIES.filter((tech) => tech.track !== 'rare').every(
        (tech) => tech.inventoryVerification === 'community-inventory',
      ),
    ).toBe(true);
    expect(
      TECHNOLOGIES.reduce((sum, tech) => sum + (tech.copies ?? 0), 0),
    ).toBe(114);
    for (const track of ['military', 'grid', 'nano']) {
      expect(
        TECHNOLOGIES.filter((tech) => tech.track === track).map(
          (tech) => tech.copies,
        ),
      ).toEqual([5, 5, 5, 5, 4, 3, 3, 3]);
    }
    expect(
      TECHNOLOGIES.filter((tech) => tech.track === 'rare').every(
        (tech) => tech.inventoryVerification === 'publisher-rulebook',
      ),
    ).toBe(true);
  });
  it('preserves all printed base/minimum cost pairs', () => {
    for (const track of ['military', 'grid', 'nano']) {
      expect(
        TECHNOLOGIES.filter((tech) => tech.track === track).map((tech) => [
          tech.baseCost,
          tech.minimumCost,
        ]),
      ).toEqual([
        [2, 2],
        [4, 3],
        [6, 4],
        [8, 5],
        [10, 6],
        [12, 6],
        [14, 7],
        [16, 8],
      ]);
    }
    expect(
      TECHNOLOGIES.filter((tech) => tech.track === 'rare').map((tech) => [
        tech.baseCost,
        tech.minimumCost,
      ]),
    ).toEqual([
      [5, 5],
      [5, 5],
      [5, 5],
      [7, 6],
      [7, 6],
      [7, 6],
      [7, 6],
      [9, 7],
      [9, 7],
      [9, 7],
      [11, 8],
      [11, 8],
      [13, 9],
      [15, 10],
      [17, 11],
    ]);
  });
  it('matches the printed fusion-drive research example with a minimum-cost floor', () => {
    expect(
      researchCost('fusion-drive', 'nano', [
        { technology: 'monolith', track: 'nano' },
        { technology: 'orbital', track: 'nano' },
      ]),
    ).toEqual({ ok: true, scienceCost: 3, discount: 2 });
  });
  it('applies the nonlinear sixth and seventh slot discounts', () => {
    const research: ResearchEntry[] = [
      { technology: 'gauss-shield', track: 'grid' },
      { technology: 'fusion-source', track: 'grid' },
      { technology: 'improved-hull', track: 'grid' },
      { technology: 'positron-computer', track: 'grid' },
      { technology: 'advanced-economy', track: 'grid' },
    ];
    expect(researchCost('quantum-grid', 'grid', research)).toEqual({
      ok: true,
      scienceCost: 10,
      discount: 6,
    });
    research.push({ technology: 'tachyon-drive', track: 'grid' });
    expect(researchCost('quantum-grid', 'grid', research)).toEqual({
      ok: true,
      scienceCost: 8,
      discount: 8,
    });
  });
  it('prices rare research using its chosen track and counts earlier rare tiles', () => {
    expect(
      researchCost('zero-point-source', 'military', [
        { technology: 'neutron-bombs', track: 'military' },
        { technology: 'conifold-field', track: 'military' },
      ]),
    ).toEqual({ ok: true, scienceCost: 13, discount: 2 });
  });
  it('rejects regular technologies on another track and duplicate technologies on any track', () => {
    expect(researchCost('fusion-drive', 'military', [])).toEqual({
      ok: false,
      code: 'wrong-track',
    });
    expect(
      researchCost('conifold-field', 'grid', [
        { technology: 'conifold-field', track: 'military' },
      ]),
    ).toEqual({ ok: false, code: 'already-researched' });
  });
  it('rejects an eighth technology including rare technologies', () => {
    const research: ResearchEntry[] = [
      { technology: 'gauss-shield', track: 'grid' },
      { technology: 'fusion-source', track: 'grid' },
      { technology: 'improved-hull', track: 'grid' },
      { technology: 'positron-computer', track: 'grid' },
      { technology: 'advanced-economy', track: 'grid' },
      { technology: 'tachyon-drive', track: 'grid' },
      { technology: 'quantum-grid', track: 'grid' },
    ];
    expect(researchCost('metasynthesis', 'grid', research)).toEqual({
      ok: false,
      code: 'track-full',
    });
  });
  it('encodes exceptions as typed effects and gives each ship part its own prerequisite', () => {
    expect(getTechnology('neutron-absorber').effect).toEqual({
      kind: 'ignore-neutron-bombs',
    });
    expect(getTechnology('gluon-computer').effect).toEqual({
      kind: 'ship-part',
      part: 'gluon-computer',
    });
    expect(getTechnology('advanced-robotics').effect).toEqual({
      kind: 'gain-influence',
      amount: 1,
    });
    expect(getTechnology('quantum-grid').effect).toEqual({
      kind: 'gain-influence',
      amount: 2,
    });
    expect(getTechnology('pico-modulator').effect).toEqual({
      kind: 'extra-activation',
      action: 'upgrade',
      amount: 2,
    });
  });
});
