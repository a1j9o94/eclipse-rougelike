import { describe, expect, it } from 'vitest';
import { processGameCommand } from '../../shared/eclipse/engine';
import { recoverHistoryCheckpoint } from '../../shared/eclipse/historyRecovery';
import { legalCommands } from '../../shared/eclipse/legal';
import { commitCommand, getPlayerView } from '../../shared/eclipse/protocol';
import { createGame } from '../../shared/eclipse/setup';
import type { JournalEntry } from '../../shared/eclipse/types';

describe('historical Guild remote exploration recovery', () => {
  it('reconstructs a saved draw and discard with the legacy round marker intact', () => {
    const initial = createGame({
      seed: 22,
      warpPortals: true,
      randomizeStartingPlayer: false,
      factionProfile: 'scifi-v1',
      seats: [
        { id: 'guild', faction: 'spacing-guild', controller: 'human' },
        { id: 'rival', faction: 'hydran', controller: 'human' },
      ],
    });
    const remote = legalCommands(getPlayerView(initial, 'guild')!)
      .find(candidate => candidate.command.type === 'explore' && candidate.command.remote);
    expect(remote).toBeDefined();
    if (!remote) throw new Error('The initial Guild position must offer remote exploration.');
    const draw = commitCommand({ state: initial, journal: [] }, 'guild', {
      commandId: 'historical-guild-draw', expectedRevision: 0, command: remote.command,
    }, initial, processGameCommand);
    expect(draw.ok).toBe(true);
    if (!draw.ok) throw new Error(draw.error.message);
    const drawn = draw.aggregate.state;
    expect(drawn.seats[0].scifi?.remoteExploreRound).toBe(1);
    const decision = drawn.pendingDecision;
    expect(decision?.kind).toBe('exploration');
    if (decision?.kind !== 'exploration') throw new Error('The committed draw must await placement.');
    const discard = commitCommand({ state: drawn, journal: [] }, 'guild', {
      commandId: 'historical-guild-discard', expectedRevision: 1,
      command: { type: 'resolve', decisionId: decision.id, choice: { kind: 'exploration', tileId: null, rotation: 0 } },
    }, drawn, processGameCommand);
    expect(discard.ok).toBe(true);
    if (!discard.ok) throw new Error(discard.error.message);
    const anchor = structuredClone(discard.aggregate.state);
    // Historical snapshots persist this field even though it no longer limits exploration.
    expect(anchor.seats[0].scifi?.remoteExploreRound).toBe(1);
    const entries: JournalEntry[] = [draw.aggregate.journal[0], discard.aggregate.journal[0]];
    const saved = structuredClone({ anchor, entries });
    expect(recoverHistoryCheckpoint({ anchor, entries, targetRevision: 1 }))
      .toEqual({ ok: true, checkpoint: initial });
    expect(recoverHistoryCheckpoint({ anchor, entries, targetRevision: 2 }))
      .toEqual({ ok: true, checkpoint: drawn });
    expect({ anchor, entries }).toEqual(saved);
  });
});
