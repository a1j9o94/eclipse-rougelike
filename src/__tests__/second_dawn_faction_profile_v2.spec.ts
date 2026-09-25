import { describe, expect, it } from 'vitest';
import { listFactionsForProfile, profileVersions } from '../../shared/eclipse/catalog';
import { isMultiplayerSettings } from '../../shared/eclipse/multiplayer';

const originalExpanded = [
  'eridani', 'hydran', 'planta', 'draco', 'mechanema', 'orion',
  'terran-directorate', 'terran-federation', 'terran-union',
  'terran-republic', 'terran-conglomerate', 'terran-alliance',
  'rho-indi', 'magellan', 'midas', 'ragnarok',
];

describe('versioned expanded faction collections', () => {
  it('keeps saved expanded-v1 matches on their original roster', () => {
    expect(listFactionsForProfile('expanded-v1').map(faction => faction.id)).toEqual(originalExpanded);
    expect(listFactionsForProfile('expanded-v1').map(faction => faction.id)).not.toContain('exiles');
    expect(listFactionsForProfile('expanded-v1').map(faction => faction.id)).not.toContain('lyra');
  });

  it('gives the new collection a separate save version and room setting', () => {
    expect(profileVersions('expanded-v2')).toEqual({
      rulesVersion: 'second-dawn-expanded-v2-2026-09-25',
      catalogVersion: 'second-dawn-catalog-expanded-v2',
    });
    expect(isMultiplayerSettings({ humanSeatCount: 2, aiCount: 0, timerMs: 30_000, warpPortals: true, factionProfile: 'expanded-v2' })).toBe(true);
  });
});
