import { describe, expect, it } from 'vitest';
import {
  incomeForPopulationAway,
  upkeepForEmptyInfluenceSlots,
  BASE_ECONOMY_TRACKS,
} from '../../shared/eclipse/tracks';
import {
  projectAbandonment,
  projectUpkeep,
} from '../../shared/eclipse/economy';

describe('publisher-verified economy tracks', () => {
  it('retains base production when every population cube remains on its track', () => {
    expect(incomeForPopulationAway(0)).toBe(2);
    expect(incomeForPopulationAway(1)).toBe(3);
    expect(incomeForPopulationAway(11)).toBe(28);
  });
  it('permits a returned cube to cover the two-income space (p14)', () => { expect(incomeForPopulationAway(-1)).toBe(0); });
  it('matches the complete printed income sequence, including the nonlinear steps', () => {
    expect(
      Array.from({ length: 12 }, (_, count) => incomeForPopulationAway(count)),
    ).toEqual([2, 3, 4, 6, 8, 10, 12, 15, 18, 21, 24, 28]);
  });
  it('distinguishes empty-space counts from the printed influence-slot index', () => {
    expect(upkeepForEmptyInfluenceSlots(0)).toBe(0);
    expect(upkeepForEmptyInfluenceSlots(1)).toBe(0);
    expect(upkeepForEmptyInfluenceSlots(2)).toBe(0);
    expect(upkeepForEmptyInfluenceSlots(3)).toBe(1);
    expect(upkeepForEmptyInfluenceSlots(13)).toBe(30);
  });
  it('matches the official upkeep example and recomputes population loss on abandonment', () => {
    const position = {
      resources: { money: 0, science: 0, materials: 0 },
      populationAway: { money: 2, materials: 3, science: 1 },
      influenceAway: 6,
    };
    expect(
      projectUpkeep({
        resources: position.resources,
        income: {
          money: incomeForPopulationAway(2),
          materials: incomeForPopulationAway(3),
          science: incomeForPopulationAway(1),
        },
        upkeepCost: upkeepForEmptyInfluenceSlots(6),
      }),
    ).toMatchObject({ balance: -1, shortfall: 1 });
    expect(
      projectAbandonment(position, BASE_ECONOMY_TRACKS, {
        discsReturned: 1,
        populationReturned: { money: 0, science: 0, materials: 0 },
      }),
    ).toMatchObject({
      ok: true,
      projection: {
        balance: 1,
        resourcesAfterPayment: { money: 1, materials: 6, science: 3 },
      },
    });
    expect(
      projectAbandonment(position, BASE_ECONOMY_TRACKS, {
        discsReturned: 1,
        populationReturned: { money: 2, science: 0, materials: 0 },
      }),
    ).toMatchObject({ ok: true, projection: { balance: -1, shortfall: 1 } });
  });
  it('rejects track positions outside physical capacity instead of extrapolating', () => {
    for (const count of [-2, 0.5, NaN, Infinity, 12])
      expect(() => incomeForPopulationAway(count)).toThrow(RangeError);
    for (const count of [-1, 0.5, NaN, Infinity, 14])
      expect(() => upkeepForEmptyInfluenceSlots(count)).toThrow(RangeError);
  });
  it('does not permit catalog mutation through the shared projection input', () => {
    expect(Object.isFrozen(BASE_ECONOMY_TRACKS)).toBe(true);
    expect(Object.isFrozen(BASE_ECONOMY_TRACKS.income)).toBe(true);
    expect(Object.isFrozen(BASE_ECONOMY_TRACKS.upkeep)).toBe(true);
  });
});
