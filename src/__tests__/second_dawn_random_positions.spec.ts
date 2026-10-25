import {describe, expect, it} from 'vitest';
import {BASE_FACTIONS, STARTING_LAYOUTS, getFaction, type PlayerCount} from '../../shared/eclipse/catalog';
import {createGame, type GameSetup} from '../../shared/eclipse/setup';
import {nextLivingSeatId} from '../../shared/eclipse/turnOrder';

function config(count: number, seed: number): GameSetup {
  return {seed, warpPortals: true, randomizeStartingPlayer: true, randomizeStartingPositions: true,
    seats: BASE_FACTIONS.filter(f => f.species === 'alien').slice(0, count).map((f, i) => ({id: `seat-${i + 1}`, faction: f.id, controller: i ? 'ai' : 'human'}))};
}

describe('random physical starting positions', () => {
  it.each([2, 3, 4, 5, 6])('varies positions for %i players while preserving clockwise play and faction pieces', count => {
    const locations = new Set<string>();
    const neighbours = new Set<string>();
    for (let seed = 0; seed < 24; seed++) {
      const setup = config(count, seed);
      const before = structuredClone(setup);
      const state = createGame(setup);
      expect(createGame(setup)).toEqual(state);
      expect(setup).toEqual(before);
      const slots = STARTING_LAYOUTS[count as PlayerCount].filter(s => s.occupant === 'player');
      state.seats.forEach((seat, index) => {
        const home = state.sectors.find(s => s.owner === seat.id)!;
        expect(home.position).toEqual({q: slots[index].q, r: slots[index].r});
        expect(home.tileId).toBe(String(getFaction(seat.faction).homeSector).padStart(3, '0'));
        expect(state.ships.filter(s => s.owner === seat.id).every(s => s.sectorId === home.id)).toBe(true);
        expect(nextLivingSeatId(state, seat.id)).toBe(state.seats[(index + 1) % count].id);
        expect(seat.controller).toBe(seat.id === 'seat-1' ? 'human' : 'ai');
      });
      expect(state.sectors.filter(s => s.owner)).toHaveLength(count);
      expect(state.ships.filter(s => s.type === 'guardian')).toHaveLength(6 - count);
      const home = state.sectors.find(s => s.owner === 'seat-1')!;
      locations.add(JSON.stringify(home.position));
      const index = state.seats.findIndex(s => s.id === 'seat-1');
      neighbours.add(state.seats[(index + 1) % count].id);
    }
    expect(locations.size).toBeGreaterThan(1);
    if (count > 2) expect(neighbours.size).toBeGreaterThan(1);
  });

  it('preserves historical setup when random positions are omitted or disabled', () => {
    const setup = config(6, 42);
    delete setup.randomizeStartingPositions;
    const state = createGame(setup);
    expect(createGame({...setup, randomizeStartingPositions: false})).toEqual(state);
    expect(state.seats.map(s => s.id)).toEqual(setup.seats.map(s => s.id));
  });
});
