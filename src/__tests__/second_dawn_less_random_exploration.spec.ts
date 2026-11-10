import { describe, expect, it } from 'vitest';
import { SETUP_BY_PLAYER_COUNT } from '../../shared/eclipse/catalog';
import { tradeResources } from '../../shared/eclipse/economy';
import { processGameCommand } from '../../shared/eclipse/engine';
import { legalCommands } from '../../shared/eclipse/legal';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { createGame } from '../../shared/eclipse/setup';
import type { GameState, PendingDecision } from '../../shared/eclipse/types';
import { sampleAiWorld } from '../../shared/eclipse/aiWorld';

const lr = 'less-random-v1' as const;

function game(faction: 'hydran' | 'draco' | 'planta' | 'midas' = 'hydran'): GameState {
  return createGame({ seed: 71, warpPortals: false, rulesMode: lr, factionProfile: faction === 'midas' ? 'expanded-v1' : undefined, seats: [
    { id: 'a', faction, controller: 'human', ...(faction === 'midas' ? { pieceColor: 'yellow' as const } : {}) },
    { id: 'b', faction: 'orion', controller: 'human' },
  ] });
}

function explore(state: GameState): ReturnType<typeof processGameCommand> {
  const command = legalCommands(getPlayerView(state, 'a')!).find(candidate => candidate.command.type === 'explore')?.command;
  if (!command || command.type !== 'explore') throw new Error('Expected a legal exploration.');
  return processGameCommand(state, 'a', command);
}

function queueOuter(state: GameState, position: { q: number; r: number }): PendingDecision {
  const tileId = state.supplies.outer.shift()!;
  const decision: PendingDecision = {
    id: `outer-${position.q}-${position.r}`,
    owner: 'a',
    kind: 'exploration',
    position,
    ring: 'outer',
    drawnTileIds: [tileId],
    placements: [{ tileId, rotation: 0 }],
  };
  state.pendingDecision = decision;
  return decision;
}

function placeOuter(state: GameState, position: { q: number; r: number }) {
  const decision = queueOuter(state, position);
  return processGameCommand(state, 'a', { type: 'resolve', decisionId: decision.id, choice: { kind: 'exploration', tileId: decision.drawnTileIds[0], rotation: 0 } });
}

describe('Less Random exploration', () => {
  it('draws two sectors normally and three for Descendants of Draco', () => {
    const normal = explore(game());
    expect(normal.ok).toBe(true);
    if (normal.ok) expect(normal.state.pendingDecision).toMatchObject({ kind: 'exploration', drawnTileIds: expect.any(Array) });
    if (normal.ok && normal.state.pendingDecision?.kind === 'exploration') expect(normal.state.pendingDecision.drawnTileIds).toHaveLength(2);

    const draco = explore(game('draco'));
    expect(draco.ok).toBe(true);
    if (draco.ok && draco.state.pendingDecision?.kind === 'exploration') expect(draco.state.pendingDecision.drawnTileIds).toHaveLength(3);
  });

  it('uses the Exploration Joker once, discards its originals, and replays deterministically', () => {
    const first = explore(game());
    const second = explore(game());
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok || first.state.pendingDecision?.kind !== 'exploration' || second.state.pendingDecision?.kind !== 'exploration') return;
    const originals = [...first.state.pendingDecision.drawnTileIds];
    const redraw = { type: 'resolve' as const, decisionId: first.state.pendingDecision.id, choice: { kind: 'exploration' as const, tileId: null, rotation: 0, redraw: true } };
    const a = processGameCommand(first.state, 'a', redraw);
    const b = processGameCommand(second.state, 'a', { ...redraw, decisionId: second.state.pendingDecision.id });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok || a.state.pendingDecision?.kind !== 'exploration') return;
    expect(a.state.pendingDecision.drawnTileIds.some(tile => originals.includes(tile))).toBe(false);
    expect(a.state.lessRandom!.explorationJokers.a).toBe(false);
    expect(a.state.engine!.discardedSectors[a.state.pendingDecision.ring!]).toEqual(expect.arrayContaining(originals));
    expect(a.state).toEqual(b.state);
    const before = structuredClone(a.state);
    const repeat = processGameCommand(a.state, 'a', { ...redraw, decisionId: a.state.pendingDecision.id });
    expect(repeat.ok).toBe(false);
    expect(a.state).toEqual(before);
  });

  it.each(['planta', 'midas'] as const)('allows %s two first-round outer placements, then rejects a third unchanged', faction => {
    const state = game(faction);
    state.pendingDecision = null; state.engine!.decisions = [];
    for (const [q, r] of [[3, 0], [3, -1]]) {
      const result = placeOuter(state, { q, r });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      Object.assign(state, result.state);
    }
    const decision = queueOuter(state, { q: 2, r: -3 });
    const before = structuredClone(state);
    const blocked = processGameCommand(state, 'a', { type: 'resolve', decisionId: decision.id, choice: { kind: 'exploration', tileId: decision.drawnTileIds[0], rotation: 0 } });
    expect(blocked.ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('rejects an outer placement after the printed table cap even if a direct command bypasses legal options', () => {
    const state = game();
    state.pendingDecision = null; state.engine!.decisions = [];
    const cap = SETUP_BY_PLAYER_COUNT[2].outerSectors;
    for (let index = 0; index < cap; index++) state.sectors.push({ id: `outer-cap-${index}`, tileId: state.supplies.outer[index], position: { q: 20 + index, r: 0 }, rotation: 0, owner: null, population: [], orbital: false, monolith: false, discovery: false });
    const decision = queueOuter(state, { q: 3, r: 0 });
    const before = structuredClone(state);
    const blocked = processGameCommand(state, 'a', { type: 'resolve', decisionId: decision.id, choice: { kind: 'exploration', tileId: decision.drawnTileIds[0], rotation: 0 } });
    expect(blocked.ok).toBe(false);
    expect(state).toEqual(before);
  });
});

describe('Less Random trade rates and banned research', () => {
  it('uses odd 3:2 trades with the permitted 2:1 fallback and faction amendments', () => {
    const resources = { money: 10, science: 10, materials: 10 };
    expect(tradeResources(resources, 'terran-directorate', 'materials', 'money', 1, lr)).toMatchObject({ ok: true, resources: { materials: 8, money: 11 } });
    expect(tradeResources(resources, 'terran-directorate', 'materials', 'money', 3, lr)).toMatchObject({ ok: true, resources: { materials: 5, money: 13 } });
    expect(tradeResources(resources, 'eridani', 'money', 'science', 3, lr)).toMatchObject({ ok: true, resources: { money: 5, science: 13 } });
    expect(tradeResources(resources, 'eridani', 'science', 'money', 3, lr)).toMatchObject({ ok: true, resources: { science: 4, money: 13 } });
    expect(tradeResources(resources, 'mechanema', 'materials', 'money', 3, lr)).toMatchObject({ ok: true, resources: { materials: 4, money: 13 } });
  });

  it('excludes each banned rare technology from the market, bag, and starting tracks', () => {
    const state = game();
    for (const id of ['warp-portal', 'flux-missile', 'neutron-absorber']) {
      expect(state.technologyMarket).not.toContain(id);
      expect(state.supplies.technology).not.toContain(id);
      for (const seat of state.seats) expect(Object.values(seat.technologies).flat()).not.toContain(id);
    }
  });

  it.each([false, true])('keeps printed rare technology and adjusts variant stock only (variant=%s)', technologyVariant => {
    const create = (exiles: boolean) => createGame({
      seed: 71,
      warpPortals: false,
      factionProfile: 'expanded-v2',
      ruleOptions: { openTechnology: true, technologyVariant },
      seats: [
        { id: 'a', faction: exiles ? 'exiles' : 'mechanema', controller: 'human' },
        { id: 'b', faction: 'orion', controller: 'human' },
      ],
    });
    const state = create(true);
    expect(state.seats[0].technologies.nano).toContain('cloaking-device');
    const unclaimed = create(false).technologyMarket;
    expect(unclaimed).toContain('cloaking-device');
    expect(state.technologyMarket.includes('cloaking-device')).toBe(!technologyVariant);
    expect(state.technologyMarket).toHaveLength(unclaimed.length - Number(technologyVariant));
  });

  it('keeps printed rare technologies out of the variant bag and AI sampled inventories', () => {
    const state = createGame({
      seed: 71,
      warpPortals: false,
      factionProfile: 'expanded-v2',
      ruleOptions: { technologyVariant: true },
      seats: [
        { id: 'a', faction: 'exiles', controller: 'human' },
        { id: 'b', faction: 'orion', controller: 'human' },
      ],
    });
    expect([...state.technologyMarket, ...state.supplies.technology]).not.toContain('cloaking-device');
    const view = getPlayerView(state, 'b')!;
    for (let seed = 0; seed < 10; seed++) {
      const inventory = sampleAiWorld(view, seed).supplies.technology;
      expect(inventory).toHaveLength(state.supplies.technology.length);
      expect(inventory).not.toContain('cloaking-device');
    }

    // Older closed-market Exiles saves can still hold their physical copy.
    state.supplies.technology.push('cloaking-device');
    const legacy = sampleAiWorld(getPlayerView(state, 'b')!, 0).supplies.technology;
    expect(legacy).toHaveLength(state.supplies.technology.length);
    expect(legacy).toContain('cloaking-device');
  });
});
