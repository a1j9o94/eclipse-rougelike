import { describe, expect, it } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { processGameCommand } from '../../shared/eclipse/engine';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { legalCommands } from '../../shared/eclipse/legal';
import { remoteExplorationSources } from '../../shared/eclipse/scifiActions';
import { adjacentPosition, rotatedEdge, type HexEdge } from '../../shared/eclipse/geometry';
import { sectorDefinition } from '../../shared/eclipse/sectors';

function fixture() {
  const state = createGame({ seed: 22, factionProfile: 'scifi-v1', warpPortals: true,
    randomizeStartingPlayer: false,
    seats: [{ id: 'guild', faction: 'spacing-guild', controller: 'human' },
      { id: 'rival', faction: 'hydran', controller: 'human' }] });
  state.sectors = [
    { ...state.sectors[0], id: 'closed-east', tileId: '315', position: { q: 2, r: 0 }, rotation: 0, owner: 'rival', guildPortalOwner: undefined },
    { ...state.sectors[0], id: 'closed-southeast', tileId: '272', position: { q: 3, r: -1 }, rotation: 0, owner: null, guildPortalOwner: undefined },
  ];
  state.ships = [];
  state.supplies.outer = ['301'];
  state.engine!.discardedSectors.outer = [];
  return state;
}
const blocked = { q: 3, r: 0 };
const offersBlocked = (state: ReturnType<typeof fixture>) => legalCommands(getPlayerView(state, 'guild')!)
  .some(({ command }) => command.type === 'explore' && command.position.q === blocked.q && command.position.r === blocked.r);

describe('Guild remote exploration frontiers', () => {
  it('hides a target surrounded by closed source edges and rejects it without spending or drawing', () => {
    const state = fixture(), saved = structuredClone(state);
    expect(remoteExplorationSources(state, state.seats[0], blocked)).toEqual([]);
    expect(offersBlocked(state)).toBe(false);
    expect(processGameCommand(state, 'guild', { type: 'explore', position: blocked, remote: true }).ok).toBe(false);
    expect(state).toEqual(saved);
  });
  it('allows the same target when one neutral source rotates an opening toward it', () => {
    const state = fixture(); state.sectors[1].rotation = 1;
    expect(remoteExplorationSources(state, state.seats[0], blocked).map(s => s.id)).toEqual(['closed-southeast']);
    expect(offersBlocked(state)).toBe(true);
    const result = processGameCommand(state, 'guild', { type: 'explore', position: blocked, remote: true });
    expect(result.ok).toBe(true);
    if (!result.ok || result.state.pendingDecision?.kind !== 'exploration') throw new Error('Expected a remote draw.');
    expect(result.state.pendingDecision.placements.length).toBeGreaterThan(0);
  });
  it('uses the Guild Wormhole Generator exception and still requires a connected tile rotation', () => {
    const state = fixture(); state.seats[0].technologies.grid.push('wormhole-generator');
    expect(offersBlocked(state)).toBe(true);
    const result = processGameCommand(state, 'guild', { type: 'explore', position: blocked, remote: true });
    expect(result.ok).toBe(true);
    if (!result.ok || result.state.pendingDecision?.kind !== 'exploration') throw new Error('Expected a generator draw.');
    expect(result.state.pendingDecision.placements.length).toBeGreaterThan(0);
    expect(result.state.pendingDecision.placements.length).toBeLessThan(6);
  });
  it('respects all rotated openings from foreign sources on later Explore actions', () => {
    const state = fixture(); state.sectors = [{ ...state.sectors[0], position: { q: 4, r: 0 } }];
    state.seats[0].scifi!.remoteExploreRound = state.round;
    for (const rotation of [0, 1, 2, 3, 4, 5] as HexEdge[]) {
      state.sectors[0].rotation = rotation;
      for (const edge of [0, 1, 2, 3, 4, 5] as HexEdge[]) {
        const position = adjacentPosition(state.sectors[0].position, edge);
        const opening = sectorDefinition(315)!.wormholes.some(w => rotatedEdge(w, rotation) === edge);
        expect(remoteExplorationSources(state, state.seats[0], position).length).toBe(opening ? 1 : 0);
      }
    }
  });
});
