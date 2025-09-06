import { describe, it, expect } from 'vitest';
import { getFrame } from '../game/ship';
import { makeShip } from '../game/ship';
import { PARTS } from '../../shared/parts';

describe('Build starting fleet from blueprint hints', () => {
  it('raiders/timekeepers/collective produce ships with non-empty parts', () => {
    const bpRaid = { interceptor: [PARTS.sources[1], PARTS.drives[1], PARTS.weapons[1], PARTS.computers[0]] };
    const rShip = makeShip(getFrame('interceptor'), bpRaid.interceptor);
    expect(rShip.weapons.length).toBeGreaterThan(0);

    const bpTK = { interceptor: [PARTS.sources[0], PARTS.drives[1], PARTS.rare.find(p=>p.id==='disruptor')!, PARTS.computers[0]] };
    const tShip = makeShip(getFrame('interceptor'), bpTK.interceptor);
    expect(tShip.weapons.some(w => w.initLoss)).toBeTruthy();

    const bpCol = { interceptor: [PARTS.sources[0], PARTS.drives[0], PARTS.weapons[0], PARTS.rare.find(p=>p.id==='auto_repair')!] };
    const cShip = makeShip(getFrame('interceptor'), bpCol.interceptor);
    expect(cShip.stats.regen).toBeGreaterThanOrEqual(0);
  });
});
