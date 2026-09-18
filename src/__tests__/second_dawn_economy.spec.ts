import { describe, expect, it } from 'vitest';
import {
  calculateScore,
  rankScores,
  researchTrackVp,
  type ScoringInput,
} from '../../shared/eclipse/scoring';
import {
  projectUpkeep,
  projectAbandonment,
  tradeResources,
  researchCost,
  artifactKeyReward,
  type EconomyPosition,
} from '../../shared/eclipse/economy';
const scoreInput: ScoringInput = {
  playerId: 'p',
  faction: 'terran-directorate',
  reputation: [4, 2],
  ambassadors: 2,
  sectors: [{ id: 'a', printedVp: 2, monoliths: 1, portalVp: 0 }],
  discoveriesKeptForVp: 1,
  traitor: false,
  researchTracks: [4, 5, 7],
  ancientsOnBoard: 3,
  resources: { materials: 4, science: 3, money: 2 },
};
describe('Second Dawn final scoring', () => {
  it('uses the printed nonlinear research thresholds', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(researchTrackVp)).toEqual([
      0, 0, 0, 0, 1, 2, 3, 5,
    ]);
    expect(() => researchTrackVp(8)).toThrow();
  });
  it('reports every official scoring component separately', () => {
    expect(calculateScore(scoreInput)).toEqual({
      playerId: 'p',
      reputation: 6,
      ambassadors: 2,
      sectors: 2,
      monoliths: 3,
      portals: 0,
      discoveries: 2,
      traitor: 0,
      research: 8,
      species: 0,
      total: 23,
      resourceTotal: 9,
    });
    expect(calculateScore({ ...scoreInput, traitor: true }).total).toBe(21);
  });
  it('scores Planta per controlled sector and Draco per Ancient anywhere on board', () => {
    expect(calculateScore({ ...scoreInput, faction: 'planta' }).species).toBe(
      1,
    );
    expect(calculateScore({ ...scoreInput, faction: 'draco' }).species).toBe(3);
    expect(calculateScore({ ...scoreInput, faction: 'orion' }).species).toBe(0);
  });
  it('scores installed optional portal tiles separately from printed sector values', () => {
    expect(
      calculateScore({
        ...scoreInput,
        sectors: [{ id: 'a', printedVp: 2, monoliths: 0, portalVp: 2 }],
      }).portals,
    ).toBe(2);
  });
  it('breaks VP ties by total stored resources, preserving unresolved exact ties', () => {
    const a = calculateScore(scoreInput);
    const b = { ...a, playerId: 'b', resourceTotal: 10 };
    const c = { ...b, playerId: 'c' };
    expect(rankScores([a, b, c])).toEqual([
      { place: 1, players: ['b', 'c'], score: 23, resources: 10 },
      { place: 3, players: ['p'], score: 23, resources: 9 },
    ]);
  });
});
describe('Second Dawn economy projections', () => {
  it('shows money shortfall without spending later materials/science production', () => {
    expect(
      projectUpkeep({
        resources: { money: 0, materials: 0, science: 0 },
        income: { money: 4, materials: 6, science: 3 },
        upkeepCost: 5,
      }),
    ).toEqual({
      balance: -1,
      shortfall: 1,
      solvent: false,
      resourcesAfterPayment: null,
    });
    expect(
      projectUpkeep({
        resources: { money: 1, materials: 2, science: 3 },
        income: { money: 4, materials: 6, science: 3 },
        upkeepCost: 5,
      }).resourcesAfterPayment,
    ).toEqual({ money: 0, materials: 8, science: 6 });
  });
  it('recomputes both income and upkeep after returning population and influence', () => {
    // Explicit small fixture tracks; these are not asserted as the complete official track catalog.
    const position: EconomyPosition = {
      resources: { money: 0, materials: 0, science: 0 },
      populationAway: { money: 3, materials: 1, science: 0 },
      influenceAway: 3,
    };
    const tracks = { income: [0, 2, 3, 4], upkeep: [0, 1, 3, 5] };
    expect(
      projectAbandonment(position, tracks, {
        discsReturned: 1,
        populationReturned: { money: 0, materials: 0, science: 0 },
      }),
    ).toMatchObject({ ok: true, projection: { balance: 1 } });
    expect(
      projectAbandonment(position, tracks, {
        discsReturned: 1,
        populationReturned: { money: 2, materials: 0, science: 0 },
      }),
    ).toMatchObject({ ok: true, projection: { balance: -1, shortfall: 1 } });
    expect(position.influenceAway).toBe(3);
  });
  it('rejects impossible population returns and missing track values', () => {
    const position: EconomyPosition = {
      resources: { money: 0, materials: 0, science: 0 },
      populationAway: { money: 1, materials: 0, science: 0 },
      influenceAway: 1,
    };
    expect(
      projectAbandonment(
        position,
        { income: [0, 2], upkeep: [0, 1] },
        {
          discsReturned: 1,
          populationReturned: { money: 3, materials: 0, science: 0 },
        },
      ),
    ).toMatchObject({ ok: false, code: 'invalid-return' });
    expect(
      projectAbandonment(
        position,
        { income: [0], upkeep: [0, 1] },
        {
          discsReturned: 0,
          populationReturned: { money: 0, materials: 0, science: 0 },
        },
      ),
    ).toMatchObject({ ok: false, code: 'missing-track-value' });
  });
  it('trades at the verified faction ratio, requiring one resource type per exchange', () => {
    const resources = { money: 0, materials: 7, science: 2 };
    expect(
      tradeResources(resources, 'terran-directorate', 'materials', 'money', 3),
    ).toEqual({ ok: true, resources: { money: 3, materials: 1, science: 2 } });
    expect(
      tradeResources(resources, 'orion', 'materials', 'money', 2),
    ).toMatchObject({ ok: false, code: 'insufficient-resources' });
    expect(
      tradeResources(resources, 'draco', 'materials', 'materials', 1),
    ).toMatchObject({ ok: false, code: 'same-resource' });
    expect(resources.materials).toBe(7);
  });
  it('never discounts below a technology minimum; Artifact Key grants five per artifact in one chosen type', () => {
    expect(researchCost(16, 8, 12)).toBe(8);
    expect(researchCost(16, 8, 3)).toBe(13);
    expect(artifactKeyReward(['money', 'science', 'money'])).toEqual({
      money: 10,
      science: 5,
      materials: 0,
    });
  });
});

describe('economy numeric boundaries', () => {
  it('refuses nonfinite, fractional and negative upkeep factors or resource storage', () => {
    const input = {
      resources: { money: 1, materials: 2, science: 3 },
      income: { money: 4, materials: 5, science: 6 },
      upkeepCost: 5,
    };
    for (const invalid of [
      -1,
      NaN,
      Infinity,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() => projectUpkeep({ ...input, upkeepCost: invalid })).toThrow(
        RangeError,
      );
      expect(() =>
        projectUpkeep({
          ...input,
          resources: { ...input.resources, science: invalid },
        }),
      ).toThrow(RangeError);
      expect(() =>
        projectUpkeep({
          ...input,
          income: { ...input.income, money: invalid },
        }),
      ).toThrow(RangeError);
    }
  });
  it('rejects arithmetic overflow instead of returning imprecise post-upkeep storage', () => {
    expect(() =>
      projectUpkeep({
        resources: { money: Number.MAX_SAFE_INTEGER, materials: 0, science: 0 },
        income: { money: 1, materials: 0, science: 0 },
        upkeepCost: 0,
      }),
    ).toThrow(RangeError);
    expect(() =>
      projectUpkeep({
        resources: { money: 0, materials: Number.MAX_SAFE_INTEGER, science: 0 },
        income: { money: 0, materials: 1, science: 0 },
        upkeepCost: 0,
      }),
    ).toThrow(RangeError);
  });
  it('rejects invalid research prices/discounts and inconsistent printed minimums', () => {
    for (const invalid of [
      -1,
      NaN,
      Infinity,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() => researchCost(invalid, 2, 1)).toThrow(RangeError);
      expect(() => researchCost(8, invalid, 1)).toThrow(RangeError);
      expect(() => researchCost(8, 2, invalid)).toThrow(RangeError);
    }
    expect(() => researchCost(2, 8, 0)).toThrow(RangeError);
  });
  it('rejects unsafe trade amounts, products, resulting stocks and invalid input storage', () => {
    const resources = { money: 0, materials: 7, science: 2 };
    expect(
      tradeResources(
        resources,
        'draco',
        'materials',
        'money',
        Number.MAX_SAFE_INTEGER,
      ),
    ).toMatchObject({ ok: false, code: 'invalid-quantity' });
    expect(
      tradeResources(
        resources,
        'draco',
        'materials',
        'money',
        Number.MAX_SAFE_INTEGER + 1,
      ),
    ).toMatchObject({ ok: false, code: 'invalid-quantity' });
    expect(
      tradeResources(
        { ...resources, money: Number.MAX_SAFE_INTEGER },
        'draco',
        'materials',
        'money',
        1,
      ),
    ).toMatchObject({ ok: false, code: 'invalid-quantity' });
    expect(
      tradeResources(
        { ...resources, science: NaN },
        'draco',
        'materials',
        'money',
        1,
      ),
    ).toMatchObject({ ok: false, code: 'invalid-resources' });
  });
  it('rejects malformed abandonment input before computing array indices or projections', () => {
    const position: EconomyPosition = {
      resources: { money: 0, materials: 0, science: 0 },
      populationAway: { money: 1, materials: 0, science: 0 },
      influenceAway: 1,
    };
    const returns = {
      discsReturned: 1,
      populationReturned: { money: 1, materials: 0, science: 0 },
    };
    expect(
      projectAbandonment(
        { ...position, resources: { ...position.resources, money: -1 } },
        { income: [0, 2], upkeep: [0, 1] },
        returns,
      ),
    ).toMatchObject({ ok: false, code: 'invalid-position' });
    expect(
      projectAbandonment(
        { ...position, influenceAway: NaN },
        { income: [0, 2], upkeep: [0, 1] },
        returns,
      ),
    ).toMatchObject({ ok: false, code: 'invalid-position' });
    expect(
      projectAbandonment(
        position,
        { income: [Number.MAX_SAFE_INTEGER + 1, 2], upkeep: [0, 1] },
        returns,
      ),
    ).toMatchObject({ ok: false, code: 'missing-track-value' });
  });
});
