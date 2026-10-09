import { describe, expect, it } from 'vitest';
import { getFaction, listFactionsForProfile, profileVersions, type FactionId } from '../../shared/eclipse/catalog';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView, getSpectatorView } from '../../shared/eclipse/protocol';

const scifi: FactionId[] = ['exfor', 'bobiverse', 'trisolarans', 'portiids', 'spacing-guild', 'formics', 'belters'];
const colors = ['red', 'blue', 'green', 'yellow', 'white', 'black'] as const;
function setup(factions: FactionId[]) {
  return createGame({ seed: 9042, warpPortals: true, factionProfile: 'scifi-v1', seats: factions.map((faction, i) => ({ id: `p${i}`, faction, pieceColor: colors[i], controller: 'human' })) });
}

describe('optional science-fiction faction collection', () => {
  it('pins a new collection without changing any historical roster', () => {
    expect(listFactionsForProfile('base')).toHaveLength(12);
    expect(listFactionsForProfile('expanded-v1')).toHaveLength(16);
    expect(listFactionsForProfile('expanded-v2')).toHaveLength(18);
    expect(listFactionsForProfile('scifi-v1')).toHaveLength(25);
    expect(scifi.every(id => listFactionsForProfile('scifi-v1').some(f => f.id === id))).toBe(true);
    expect(listFactionsForProfile('expanded-v2').some(f => scifi.includes(f.id))).toBe(false);
    expect(profileVersions('scifi-v1')).not.toEqual(profileVersions('expanded-v2'));
  });

  it('rejects variant inventories and rejects new factions in historical collections', () => {
    const seats = [{id: 'p0', faction: 'bobiverse' as const, controller: 'human' as const}, {id: 'p1', faction: 'orion' as const, controller: 'human' as const}];
    expect(() => createGame({seed: 1, warpPortals: false, factionProfile: 'expanded-v2', seats})).toThrow();
    expect(() => createGame({seed: 1, warpPortals: false, factionProfile: 'scifi-v1', rulesMode: 'less-random-v1', seats})).toThrow(/Standard/i);
    expect(() => createGame({seed: 1, warpPortals: false, factionProfile: 'scifi-v1', ruleOptions: {openTechnology: true}, seats})).toThrow(/Standard/i);
  });

  it('initializes all seven starting fleets and distinguishes reused home sectors', () => {
    for (const faction of scifi) {
      const state = setup([faction, 'terran-directorate']);
      expect(new Set(state.sectors.map(s => s.id)).size).toBe(state.sectors.length);
      expect(state.ships.filter(s => s.owner === 'p0').map(s => s.type)).toEqual([faction === 'formics' ? 'cruiser' : 'interceptor']);
      expect(state.seats[0].faction).toBe(faction);
    }
    expect(getFaction('bobiverse').componentSupply).toMatchObject({interceptor:9, cruiser:5, dreadnought:3});
  });

  it('keeps ExFor draft identities private and starts Skippy with the generator', () => {
    const state = setup(['exfor', 'orion']);
    expect(state.seats[0].technologies.nano).toContain('wormhole-generator');
    expect(state.pendingDecision?.kind).toBe('discovery-draft');
    const own = getPlayerView(state, 'p0')!;
    expect(own.pendingDecision?.kind === 'discovery-draft' ? own.pendingDecision.tileIds : []).toHaveLength(3);
    expect(getPlayerView(state, 'p1')!.pendingDecision).toBeNull();
    expect(JSON.stringify(getSpectatorView(state))).not.toContain('tileIds');
  });

  it('gives the Guild one home portal and two permanent marker reserves', () => {
    const state = setup(['spacing-guild', 'orion']);
    expect(state.sectors.filter(s => s.guildPortalOwner === 'p0')).toHaveLength(1);
    expect(state.seats[0].scifi?.guildPortalMarkers).toBe(2);
    expect(state.seats[0].technologies.nano).not.toContain('warp-portal');
  });
});
