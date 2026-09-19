import { describe, expect, it } from 'vitest';
import { recoverHistoryCheckpoint } from '../../shared/eclipse/historyRecovery';
import { createGame, type GameSetup } from '../../shared/eclipse/setup';
import { commitCommand, getPlayerView } from '../../shared/eclipse/protocol';
import { processGameCommand } from '../../shared/eclipse/engine';
import { legalCommands } from '../../shared/eclipse/legal';
import type { GameState, JournalEntry } from '../../shared/eclipse/types';

function record(config: GameSetup, count = 8) {
  let state = createGame(config);
  const checkpoints: GameState[] = [];
  const entries: JournalEntry[] = [];
  for (let i = 0; i < count; i++) {
    const actor = state.pendingDecision?.owner ?? state.activeSeatId!;
    const choices = legalCommands(getPlayerView(state, actor)!);
    const command = (choices.find(choice => choice.command.type === 'explore') ??
      choices.find(choice => choice.command.type === 'end-action') ?? choices[0]).command;
    checkpoints.push(structuredClone(state));
    const result = commitCommand({ state, journal: [] }, actor, {
      commandId: `recover-${i}`, expectedRevision: state.revision, command,
    }, state, processGameCommand);
    if (!result.ok) throw new Error(result.error.message);
    state = result.aggregate.state;
    entries.push(result.aggregate.journal[0]);
  }
  return { anchor: state, entries, checkpoints };
}
const base: GameSetup = { seed: 0xffffffff, warpPortals: true, seats: [
  { id: 'one', faction: 'eridani', controller: 'human' },
  { id: 'two', faction: 'hydran', controller: 'ai' },
] };

describe('verified historical checkpoint reconstruction', () => {
  it.each([true, false])('restores exact base checkpoints with randomized starter %s', randomizeStartingPlayer => {
    const game = record({ ...base, randomizeStartingPlayer });
    const before = structuredClone(game);
    for (const targetRevision of [1, 3, game.entries.length]) {
      expect(recoverHistoryCheckpoint({ ...game, targetRevision })).toEqual({
        ok: true, checkpoint: game.checkpoints[targetRevision - 1],
      });
    }
    expect(game).toEqual(before);
  });
  it('restores expanded factions, private initial discovery and custom colors', () => {
    const game = record({ seed: 0, warpPortals: false, randomizeStartingPlayer: true, factionProfile: 'expanded-v1', seats: [
      { id: 'one', faction: 'magellan', controller: 'human', pieceColor: 'red' },
      { id: 'two', faction: 'ragnarok', controller: 'ai', pieceColor: 'blue' },
    ] });
    expect(recoverHistoryCheckpoint({ ...game, targetRevision: 1 })).toEqual({ ok: true, checkpoint: game.checkpoints[0] });
  });
  it('rejects missing or reordered journal rows', () => {
    const game = record(base);
    expect(recoverHistoryCheckpoint({ ...game, entries: game.entries.slice(1), targetRevision: 1 })).toEqual({ ok: false, reason: 'incomplete-history' });
    const entries = [...game.entries];
    [entries[0], entries[1]] = [entries[1], entries[0]];
    expect(recoverHistoryCheckpoint({ ...game, entries, targetRevision: 1 })).toEqual({ ok: false, reason: 'incomplete-history' });
  });
  it('rejects changed rules pins, rather than running a different rules version', () => {
    const game = record(base);
    game.anchor.rulesVersion = 'unavailable-old-rules';
    expect(recoverHistoryCheckpoint({ ...game, targetRevision: 1 })).toEqual({ ok: false, reason: 'unsupported-version' });
  });
  it('requires full anchor equality, including hidden state and bookkeeping', () => {
    const game = record(base);
    game.anchor.privateSeats[0].reputation.push(4);
    expect(recoverHistoryCheckpoint({ ...game, targetRevision: 1 })).toEqual({ ok: false, reason: 'anchor-mismatch' });
    game.anchor.privateSeats[0].reputation.pop();
    game.anchor.actionTurnSerial = (game.anchor.actionTurnSerial ?? 0) + 1;
    expect(recoverHistoryCheckpoint({ ...game, targetRevision: 1 })).toEqual({ ok: false, reason: 'anchor-mismatch' });
  });
  it('rejects invalid random state, illegal commands and invalid targets', () => {
    const game = record(base);
    expect(recoverHistoryCheckpoint({ ...game, targetRevision: 0 })).toEqual({ ok: false, reason: 'invalid-target' });
    game.anchor.random.draws = -1;
    expect(recoverHistoryCheckpoint({ ...game, targetRevision: 1 })).toEqual({ ok: false, reason: 'invalid-random-state' });
    game.anchor.random = game.checkpoints.at(-1)!.random;
    game.entries[0].actor = 'missing-seat';
    expect(recoverHistoryCheckpoint({ ...game, targetRevision: 1 }).ok).toBe(false);
  });
});
