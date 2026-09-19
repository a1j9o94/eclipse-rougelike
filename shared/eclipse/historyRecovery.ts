import { profileVersions } from './catalog';
import { processGameCommand } from './engine';
import { commitCommand } from './protocol';
import { createGame } from './setup';
import type { GameState, JournalEntry } from './types';

export interface HistoryRecoveryInput {
  /** A trusted server snapshot, never a player view or client-supplied state. */
  anchor: GameState;
  /** Complete original command sequence from revision zero to the anchor. */
  entries: readonly Pick<JournalEntry, 'actor' | 'request'>[];
  /** Restore immediately before this accepted command; one means initial setup. */
  targetRevision: number;
}
export type HistoryRecoveryFailure =
  | 'invalid-target'
  | 'invalid-random-state'
  | 'incomplete-history'
  | 'unsupported-version'
  | 'anchor-mismatch';
export type HistoryRecoveryResult =
  | { ok: true; checkpoint: GameState }
  | { ok: false; reason: HistoryRecoveryFailure };

/** JSON snapshot equality ignores object-key order, and nothing else. */
function canonicalSnapshot(state: GameState): string {
  return JSON.stringify(state, (_key, value: object | string | number | boolean | null) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))
      : value,
  );
}

/**
 * Recover only when current rules reproduce the entire trusted anchor exactly.
 * The persisted Mulberry32 counter permits recovering its initial uint32 seed.
 * This is a verification tool, not a best-effort migration: omitted historical
 * fields, changed rules, resignations, missing commands and rollback branches
 * are never guessed away. Storage callers must supply one original timeline.
 * Memory holds two states, rather than every intermediate checkpoint. Runtime
 * is at most two complete replays; callers should run large histories in jobs.
 */
export function recoverHistoryCheckpoint(input: HistoryRecoveryInput): HistoryRecoveryResult {
  const { anchor, entries, targetRevision } = input;
  if (!Number.isSafeInteger(targetRevision) || targetRevision < 1 || targetRevision > anchor.revision)
    return { ok: false, reason: 'invalid-target' };
  const pin = profileVersions(anchor.factionProfile ?? 'base', anchor.engine?.riftCannons, !!anchor.minorSpecies);
  if (anchor.rulesVersion !== pin.rulesVersion || anchor.catalogVersion !== pin.catalogVersion)
    return { ok: false, reason: 'unsupported-version' };
  const random = anchor.random;
  if (random.algorithm !== 'mulberry32-v1' || !Number.isInteger(random.value) ||
      random.value < 0 || random.value > 0xffffffff || !Number.isSafeInteger(random.draws) || random.draws < 0)
    return { ok: false, reason: 'invalid-random-state' };
  const ids = new Set<string>();
  if (entries.length !== anchor.revision || entries.some((entry, index) => {
    const duplicate = ids.has(entry.request.commandId);
    ids.add(entry.request.commandId);
    return duplicate || entry.request.expectedRevision !== index;
  })) return { ok: false, reason: 'incomplete-history' };
  if (anchor.engine?.warpPortals === undefined) return { ok: false, reason: 'anchor-mismatch' };
  // Only the low 32 bits matter; imul avoids precision loss for large counters.
  const seed = (random.value - Math.imul(random.draws >>> 0, 0x6d2b79f5)) >>> 0;
  const expected = canonicalSnapshot(anchor);
  for (const randomizeStartingPlayer of [true, false]) {
    try {
      let state = createGame({
        seed, factionProfile: anchor.factionProfile ?? 'base',
        warpPortals: anchor.engine.warpPortals, riftCannons: anchor.engine.riftCannons, minorSpecies: !!anchor.minorSpecies, randomizeStartingPlayer,
        seats: anchor.seats.map(({ id, faction, controller, pieceColor }) => ({ id, faction, controller, pieceColor })),
      });
      let checkpoint: GameState | null = null;
      let failed = false;
      for (const entry of entries) {
        if (state.revision + 1 === targetRevision) checkpoint = structuredClone(state);
        const result = commitCommand({ state, journal: [] }, entry.actor, entry.request, pin, processGameCommand);
        if (!result.ok) { failed = true; break; }
        state = result.aggregate.state;
      }
      if (!failed && checkpoint && canonicalSnapshot(state) === expected) return { ok: true, checkpoint };
    } catch {
      // Historical catalogs/commands may no longer be valid. Never return a
      // partial checkpoint unless the complete trusted anchor was reproduced.
    }
  }
  return { ok: false, reason: 'anchor-mismatch' };
}
