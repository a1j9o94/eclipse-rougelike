import { expect, it } from 'vitest';
import { TECHNOLOGIES, getTechnology } from '../../shared/eclipse/technologies';
import { SHIP_PARTS } from '../../shared/eclipse/parts';
import { describeTechnology, describeShipPart } from '../second-dawn-game/itemDescriptions';
it('explains every base technology and part without a fallback', () => {
  for (const tech of TECHNOLOGIES) expect(describeTechnology(tech).length).toBeGreaterThan(30);
  for (const part of SHIP_PARTS) expect(describeShipPart(part.id).length).toBeGreaterThan(10);
});
it('distinguishes unlocks, install costs and actual weapon effects', () => {
  expect(describeTechnology(getTechnology('plasma-cannon'))).toMatch(/Upgrade.*2 damage.*2 energy/);
  expect(describeShipPart('plasma-missile')).toMatch(/2 dice.*once.*2 damage.*1 energy/);
  expect(describeShipPart('hull')).toContain('1 additional damage');
  expect(describeShipPart('transition-drive')).toContain('3 sectors');
  expect(describeTechnology(getTechnology('warp-portal'))).toContain('1 VP');
});
