import { describe, expect, it } from 'vitest';
import { projectHistoryEntry } from '../../shared/eclipse/history';
import type { GameCommand, JournalEntry } from '../../shared/eclipse/types';

const context = {
  sectors: [{ id: 'public-a', tileId: '101' }, { id: 'public-b', tileId: '222' }],
  ships: [{ id: 'public-ship', type: 'interceptor' as const }],
};
function projected(command: GameCommand, withContext = true) {
  const entry: JournalEntry = {
    actor: 'seat-2', request: { commandId: 'private-command-key', expectedRevision: 8, command },
    receipt: { commandId: 'private-command-key', revision: 9, eventCount: 1 },
    events: [{ type: 'action', seatId: 'seat-2', visibility: 'public', message: 'Accepted action.' }],
  };
  return projectHistoryEntry(entry, [{ id: 'seat-2', faction: 'hydran' }], 2, withContext ? context : undefined);
}

describe('public AI action presentation metadata', () => {
  it('identifies accepted research including funded research without returning funding or command payloads', () => {
    const result = projected({ type: 'trade-and-act', trades: [{ from: 'money', to: 'science', amount: 1 }], action: { type: 'research', tileId: 'fusion-drive', track: 'grid' } });
    expect(result.presentation).toEqual({ kind: 'research', technologyId: 'fusion-drive' });
    expect(result.presentation).not.toHaveProperty('trades');
    expect(JSON.stringify(result)).not.toContain('private-command-key');
    expect(projected({ type: 'research', tileId: 'unrecognized-private-text', track: 'grid' }).presentation).toBeUndefined();
  });

  it('identifies changed public ship classes without forwarding blueprint part payloads', () => {
    const result = projected({ type: 'upgrade', blueprints: [{ shipType: 'interceptor', parts: ['ion-cannon', null, null, null], outsideParts: [] }, { shipType: 'cruiser', parts: [], outsideParts: [] }] });
    expect(result.presentation).toEqual({ kind: 'upgrade', shipTypes: ['interceptor', 'cruiser'] });
    expect(JSON.stringify(result.presentation)).not.toContain('parts');
  });

  it('groups built components and returns only sector references already on the public board', () => {
    const result = projected({ type: 'build', builds: [{ sectorId: 'public-a', component: 'interceptor' }, { sectorId: 'public-a', component: 'interceptor' }, { sectorId: 'public-b', component: 'orbital' }] });
    expect(result.presentation).toEqual({ kind: 'build', sectorIds: ['public-a', 'public-b'], components: [{ type: 'interceptor', count: 2 }, { type: 'orbital', count: 1 }] });
    expect(projected({ type: 'influence', removeSectorIds: ['unknown-sector'], addSectorIds: ['public-b', 'public-b'] }).presentation).toEqual({ kind: 'influence', sectorIds: ['public-b'] });
  });

  it('deduplicates repeated move activations and filters references absent from the public context', () => {
    const result = projected({ type: 'move', moves: [{ shipId: 'public-ship', path: ['public-a'] }, { shipId: 'public-ship', path: ['public-b'] }, { shipId: 'absent-ship', path: ['absent-sector'] }] });
    expect(result.presentation).toEqual({ kind: 'move', sectorIds: ['public-a', 'public-b'], shipIds: ['public-ship'] });
    expect(projected({ type: 'colonize', placements: [{ sectorId: 'public-b', squareId: 'population-square', resource: 'science' }] }).presentation).toEqual({ kind: 'colonize', sectorIds: ['public-b'] });
  });

  it('presents an explored sector only after accepted placement is present on the public board', () => {
    expect(projected({ type: 'resolve', decisionId: 'private-choice', choice: { kind: 'exploration', tileId: '222', rotation: 2 } }).presentation).toEqual({ kind: 'explore', sectorIds: ['public-b'] });
    for (const command of [
      { type: 'explore', position: { q: 5, r: 5 } },
      { type: 'resolve', decisionId: 'private-choice', choice: { kind: 'exploration', tileId: 'secret-draw', rotation: 2 } },
      { type: 'resolve', decisionId: 'private-choice', choice: { kind: 'exploration', tileId: '222', rotation: 2, drawAnother: true } },
      { type: 'resolve', decisionId: 'private-choice', choice: { kind: 'exploration', tileId: null, rotation: 0 } },
    ] satisfies GameCommand[]) expect(projected(command).presentation).toBeUndefined();
  });

  it('omits private choices and supports older journals without public context', () => {
    for (const command of [
      { type: 'resolve', decisionId: 'private-choice', choice: { kind: 'reputation', kept: [4, 3] } },
      { type: 'resolve', decisionId: 'private-choice', choice: { kind: 'discovery', option: 'keep' } },
      { type: 'resolve', decisionId: 'private-choice', choice: { kind: 'ancient-part', blueprint: null } },
      { type: 'discard-reputation', values: [4, 3] },
    ] satisfies GameCommand[]) {
      const result = projected(command);
      expect(result).not.toHaveProperty('presentation');
      expect(JSON.stringify(result)).not.toContain('private-choice');
      expect(result.summary).not.toMatch(/[34]/);
    }
    expect(projected({ type: 'research', tileId: 'fusion-drive', track: 'grid' }, false).presentation).toEqual({ kind: 'research', technologyId: 'fusion-drive' });
    expect(projected({ type: 'move', moves: [{ shipId: 'no-context-ship', path: ['no-context-sector'] }] }, false).presentation).toEqual({ kind: 'move', sectorIds: [], shipIds: [] });
  });
});
