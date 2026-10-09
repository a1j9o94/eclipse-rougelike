import { describe, expect, it, vi } from 'vitest';
import { chooseAiCommand, evaluateAiCommand } from '../../shared/eclipse/ai';
import { chooseLegacyAiCommand, evaluateLegacyAiCommand } from '../../shared/eclipse/aiLegacy';
import { chooseStrategicAiCommand } from '../../shared/eclipse/aiSearch';
import * as legacySimulation from '../../shared/eclipse/aiLegacySimulation';
import type { FactionId } from '../../shared/eclipse/catalog';
import { processGameCommand } from '../../shared/eclipse/engine';
import { legalCommands } from '../../shared/eclipse/legal';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { createGame } from '../../shared/eclipse/setup';
import type { GameCommand, GameState, PendingDecision } from '../../shared/eclipse/types';

function game(faction: FactionId = 'bobiverse'): GameState {
  const state = createGame({ seed: 47, factionProfile: 'scifi-v1', warpPortals: true,
    seats: [{ id: 'a', faction, controller: 'ai', pieceColor: 'white' }, { id: 'b', faction: 'hydran', controller: 'ai', pieceColor: 'blue' }],
  });
  state.phase = 'action'; state.activeSeatId = 'a'; state.pendingDecision = null;
  state.engine!.decisions = []; state.engine!.action = null;
  return state;
}
const policies = [
  { name: 'strategic', choose: chooseAiCommand, evaluate: evaluateAiCommand },
  { name: 'legacy', choose: chooseLegacyAiCommand, evaluate: evaluateLegacyAiCommand },
];

describe.each(policies)('$name sci-fi decision support', ({ choose, evaluate }) => {
  const decisions: { faction: FactionId; decision: PendingDecision; choices: GameCommand[] }[] = [
    { faction: 'exfor', decision: { id: 'draft', owner: 'a', kind: 'discovery-draft', tileIds: ['materials', 'science', 'money'], keepCount: 2 },
      choices: [{ type: 'resolve', decisionId: 'draft', choice: { kind: 'discovery-draft', tileIds: ['materials', 'science'] } }] },
    { faction: 'trisolarans', decision: { id: 'reservation', owner: 'a', kind: 'technology-reservation', tileIds: ['improved-hull', 'fusion-drive'] },
      choices: [{ type: 'resolve', decisionId: 'reservation', choice: { kind: 'technology-reservation', tileId: 'fusion-drive' } },
        { type: 'resolve', decisionId: 'reservation', choice: { kind: 'technology-reservation', tileId: null } }] },
    { faction: 'portiids', decision: { id: 'learning', owner: 'a', kind: 'reverse-engineering', battleId: 'battle', projects: [{ kind: 'technology', id: 'cloaking-device' }, { kind: 'ancient-part', id: 'shard-hull' }] },
      choices: [{ type: 'resolve', decisionId: 'learning', choice: { kind: 'reverse-engineering', project: { kind: 'ancient-part', id: 'shard-hull' } } },
        { type: 'resolve', decisionId: 'learning', choice: { kind: 'reverse-engineering', project: null } }] },
  ];
  it.each(decisions)('scores and resolves $faction decisions through the authoritative processor', ({ faction, decision, choices }) => {
    const state = game(faction); state.pendingDecision = decision;
    state.technologyMarket = ['improved-hull', 'fusion-drive'];
    const view = getPlayerView(state, 'a');
    for (const command of choices) expect(Number.isFinite(evaluate(view, command)), JSON.stringify(command)).toBe(true);
    const before = structuredClone(state);
    const choice = choose(view, 29);
    expect(choice).not.toBeNull();
    expect(choice?.command.type).toBe('resolve');
    expect(Number.isFinite(choice?.evaluation)).toBe(true);
    expect(processGameCommand(state, 'a', choice!.command)).toMatchObject({ ok: true });
    expect(state).toEqual(before);
  });

  it('makes factory loading finite and removes the loaded ship from candidates', () => {
    const state = game(); const view = getPlayerView(state, 'a');
    const factory = legalCommands(view).find(c => c.command.type === 'load-factory')!;
    expect(factory).toBeDefined();
    expect(evaluate(view, factory.command)).toBeGreaterThan(evaluate(view, { type: 'pass' }));
    const loaded = processGameCommand(state, 'a', factory.command);
    expect(loaded.ok).toBe(true); if (!loaded.ok) return;
    expect(legalCommands(getPlayerView(loaded.state, 'a')).some(c => c.command.type === 'load-factory')).toBe(false);
  });

  it('scores all new optional commands and copies a recorded project legally', () => {
    const state = game('portiids');
    state.seats[0].scifi = { reverseEngineeringProject: { kind: 'ancient-part', id: 'shard-hull' } };
    state.seats[0].resources.science = 8;
    const view = getPlayerView(state, 'a');
    const copy = legalCommands(view).find(c => c.command.type === 'reverse-engineer')!;
    expect(copy).toBeDefined(); expect(Number.isFinite(evaluate(view, copy.command))).toBe(true);
    expect(processGameCommand(state, 'a', copy.command)).toMatchObject({ ok: true });
  });

  it('consumes finite Guild offers and does not value cancel/repost cycles', () => {
    const state = game('spacing-guild');
    state.seats[0].resources = { money: 20, science: 0, materials: 12 };
    const view = getPlayerView(state, 'a');
    const post: GameCommand = { type: 'guild-offer', give: 'materials', receive: 'science', amount: 3 };
    expect(Number.isFinite(evaluate(view, post))).toBe(true);
    const posted = processGameCommand(state, 'a', post);
    expect(posted.ok).toBe(true); if (!posted.ok) return;
    const offer = posted.state.guildOffers![0];
    const guildView = getPlayerView(posted.state, 'a');
    expect(evaluate(guildView, { type: 'cancel-guild-offer', offerId: offer.id })).toBeLessThan(evaluate(guildView, { type: 'pass' }));
    posted.state.activeSeatId = 'b'; posted.state.seats[1].resources = { money: 20, science: 12, materials: 0 };
    const customerView = getPlayerView(posted.state, 'b');
    const fill: GameCommand = { type: 'accept-guild-offer', offerId: offer.id, amount: 3 };
    expect(evaluate(customerView, fill)).toBeGreaterThan(evaluate(customerView, { type: 'pass' }));
    const accepted = processGameCommand(posted.state, 'b', fill);
    expect(accepted.ok).toBe(true); if (!accepted.ok) return;
    expect(accepted.state.guildOffers).toEqual([]);
    expect(legalCommands(getPlayerView(accepted.state, 'b')).some(c => c.command.type === 'accept-guild-offer')).toBe(false);
    expect(accepted.state.seats[0].resources).toEqual({ money: 20, science: 3, materials: 9 });
    expect(accepted.state.seats[1].resources).toEqual({ money: 20, science: 9, materials: 3 });
    accepted.state.guildOffers = [{ id: 'reverse', owner: 'a', give: 'science', receive: 'materials', remaining: 3 }];
    expect(evaluate(getPlayerView(accepted.state, 'b'), { type: 'accept-guild-offer', offerId: 'reverse', amount: 3 })).toBeLessThan(0);
  });
});

describe('complete sci-fi Normal AI smoke matches', () => {
  const rosters: { seed: number; factions: FactionId[] }[] = [
    { seed: 47, factions: ['exfor', 'bobiverse', 'trisolarans', 'portiids', 'spacing-guild', 'formics'] },
    { seed: 109, factions: ['exfor', 'bobiverse', 'trisolarans', 'belters', 'spacing-guild', 'formics'] },
  ];
  it.each(rosters)('finishes two rounds with seed $seed without rejected commands or resource cycles', ({ seed, factions }) => {
    const colors = ['red', 'white', 'blue', 'green', 'yellow', 'black'] as const;
    let state = createGame({ seed, factionProfile: 'scifi-v1', warpPortals: true,
      ruleOptions: { roundLimit: 2 },
      seats: factions.map((faction, index) => ({ id: `p${index}`, faction, controller: 'ai', pieceColor: colors[index] })),
    });
    const visited = new Set<string>();
    let commands = 0;
    while (state.phase !== 'finished' && commands < 600) {
      const actor = state.pendingDecision?.owner ?? state.activeSeatId;
      expect(actor, `seed ${seed}, step ${commands}: missing actor`).not.toBeNull();
      const signature = JSON.stringify([state.round, state.phase, actor, state.pendingDecision,
        state.seats, state.sectors, state.ships, state.engine?.action, state.guildOffers, state.technologyReservations]);
      expect(visited.has(signature), `seed ${seed}, step ${commands}: repeated game position`).toBe(false);
      visited.add(signature);
      const view = getPlayerView(state, actor!);
      const choice = chooseStrategicAiCommand(view, seed + commands, { difficulty: 'normal' });
      expect(choice, `seed ${seed}, step ${commands}: no AI command`).not.toBeNull();
      expect(Number.isFinite(choice?.evaluation), JSON.stringify(choice?.command)).toBe(true);
      const result = processGameCommand(state, actor!, choice!.command);
      expect(result, `seed ${seed}, step ${commands}: ${JSON.stringify(choice!.command)}`).toMatchObject({ ok: true });
      if (!result.ok) return;
      state = result.state; commands++;
    }
    expect(state.phase, `seed ${seed}: command bound ${commands}`).toBe('finished');
    expect(commands).toBeLessThan(600);
    expect(state.engine!.scores).toHaveLength(6);
  }, 60000);
});

it('includes every Formic convoy escort in Legacy combat simulations', () => {
  const state = game('formics');
  const leader = state.ships.find(ship => ship.owner === 'a')!;
  const source = state.sectors.find(sector => sector.id === leader.sectorId)!;
  const target = state.sectors.find(sector => sector.owner === 'b')!;
  source.guildPortalOwner = 'a'; target.guildPortalOwner = 'b';
  state.ships.push({ ...leader, id: 'escort-one', type: 'interceptor' },
    { ...leader, id: 'escort-two', type: 'interceptor' });
  const view = getPlayerView(state, 'a');
  const convoy = legalCommands(view).find(candidate => candidate.command.type === 'move' &&
    candidate.command.moves[0].path.at(-1) === target.id && candidate.command.moves[0].escorts?.length === 2);
  expect(convoy).toBeDefined();
  const estimate = vi.spyOn(legacySimulation, 'estimatePublicBattle');
  try {
    chooseLegacyAiCommand(view, 31);
    expect(estimate.mock.calls.some(([, attackers]) =>
      attackers.includes(leader.id) && attackers.includes('escort-one') && attackers.includes('escort-two'))).toBe(true);
  } finally { estimate.mockRestore(); }
});
