import { v } from 'convex/values';
import { action, internalMutation, internalQuery, type QueryCtx } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { resolveGuest } from './eclipseIdentity';
import { supersededRevision } from './eclipseRollback';
import { recoverHistoryCheckpoint } from '../shared/eclipse/historyRecovery';
import type { GameState, JournalEntry } from '../shared/eclipse/types';

export type CheckpointRecoveryResult = { ok: true } | { ok: false; reason: string };
interface RecoveryIdentity { credential: string; matchId: Id<'eclipseMatchesV1'>; targetRevision: number }
interface RecoveryAccess { match: Doc<'eclipseMatchesV1'>; target: Doc<'eclipseJournalV1'> }
interface RecoveryProof {
  targetId: Id<'eclipseJournalV1'>;
  targetActor: string;
  targetRequestJson: string;
  anchorSnapshotJson: string;
  anchorJournalId: Id<'eclipseJournalV1'> | null;
  anchorRevision: number;
}
type RecoveryPreparation =
  | { kind: 'failure'; reason: string }
  | { kind: 'complete' }
  | { kind: 'next'; afterRevision: number }
  | { kind: 'ready'; proof: RecoveryProof };
interface RequestPage {
  entries: { actor: string; requestJson: string; revision: number }[];
  afterRevision: number | null;
}
const identityArgs = { credential: v.string(), matchId: v.id('eclipseMatchesV1'), targetRevision: v.number() };
const proofValidator = v.object({
  targetId: v.id('eclipseJournalV1'), targetActor: v.string(), targetRequestJson: v.string(),
  anchorSnapshotJson: v.string(), anchorJournalId: v.union(v.id('eclipseJournalV1'), v.null()), anchorRevision: v.number(),
});
const failed = (reason: string): CheckpointRecoveryResult => ({ ok: false, reason });

async function recoveryAccess(ctx: Pick<QueryCtx, 'db'>, args: RecoveryIdentity): Promise<RecoveryAccess | string> {
  const guest = await resolveGuest(ctx, args.credential);
  if (!guest) return 'Sign in as the room host to recover an older action.';
  const ownership = await ctx.db.query('eclipseOwnershipV1').withIndex('by_match_guest', q => q.eq('matchId', args.matchId).eq('guestId', guest._id)).unique();
  const match = await ctx.db.get(args.matchId);
  if (!ownership || !match || ownership.resignedAt !== undefined) return 'Only the active room host can recover an older action.';
  const room = match.roomToken ? await ctx.db.query('eclipseRoomsV1').withIndex('by_match', q => q.eq('matchId', match._id)).unique() : null;
  if (match.roomToken && (!room || room.hostGuestId !== guest._id)) return 'Only the active room host can recover an older action.';
  if (match.lifecycle === 'abandoned') return 'This game has ended by resignation.';
  if (match.rollbackPendingId) return 'Resolve the current undo request first.';
  if (!Number.isSafeInteger(args.targetRevision) || args.targetRevision < 1 || args.targetRevision > match.revision) return 'Choose an accepted action in history.';
  const target = await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', match._id).eq('revision', args.targetRevision)).unique();
  if (!target) return 'This action is not available in the saved history.';
  const rollbacks = await ctx.db.query('eclipseRollbacksV1').withIndex('by_match_created', q => q.eq('matchId', match._id)).collect();
  if (target.supersededAtRevision !== undefined || supersededRevision(target.revision, rollbacks) !== undefined)
    return 'This action was removed by an undo and is no longer part of this game.';
  const lifecycle = await ctx.db.query('eclipseMatchLifecycleV1').withIndex('by_match_revision', q => q.eq('matchId', match._id).gte('revision', args.targetRevision)).first();
  if (lifecycle) return 'Undo cannot cross a player resignation.';
  return { match, target };
}

/** Internal only: paginate even the anchor search so old histories never require a full-table read. */
export const prepareRecovery = internalQuery({
  args: { ...identityArgs, afterRevision: v.number() },
  handler: async (ctx, args): Promise<RecoveryPreparation> => {
    const access = await recoveryAccess(ctx, args);
    if (typeof access === 'string') return { kind: 'failure', reason: access };
    const { match, target } = access;
    if (target.preSnapshotJson) return { kind: 'complete' };
    const after = Math.max(args.targetRevision - 1, args.afterRevision);
    const rows = await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', match._id).gt('revision', after)).order('asc').take(40);
    const anchor = rows.find(row => row.preSnapshotJson !== undefined);
    if (!anchor && rows.length === 40) return { kind: 'next', afterRevision: rows[rows.length - 1].revision };
    const anchorSnapshotJson = anchor?.preSnapshotJson ?? match.snapshotJson;
    const state = JSON.parse(anchorSnapshotJson) as GameState;
    if (state.rulesVersion !== match.rulesVersion || state.catalogVersion !== match.catalogVersion || state.revision < args.targetRevision)
      return { kind: 'failure', reason: 'The saved position cannot verify this older action.' };
    return { kind: 'ready', proof: {
      targetId: target._id, targetActor: target.actor, targetRequestJson: target.requestJson,
      anchorSnapshotJson, anchorJournalId: anchor?._id ?? null, anchorRevision: state.revision,
    } };
  },
});

/** No private snapshots leave this internal endpoint; pages hold only recorded commands. */
export const readRecoveryRequests = internalQuery({
  args: { matchId: v.id('eclipseMatchesV1'), afterRevision: v.number(), throughRevision: v.number() },
  handler: async (ctx, args): Promise<RequestPage> => {
    const rows = await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', args.matchId).gt('revision', args.afterRevision).lte('revision', args.throughRevision)).order('asc').take(40);
    return {
      entries: rows.map(({ actor, requestJson, revision }) => ({ actor, requestJson, revision })),
      afterRevision: rows.length === 40 && rows[rows.length - 1].revision < args.throughRevision ? rows[rows.length - 1].revision : null,
    };
  },
});

/** Called only after the action proved exact replay. It never changes the current game or revision. */
export const storeRecoveredCheckpoint = internalMutation({
  args: { ...identityArgs, proof: proofValidator, checkpointJson: v.string() },
  handler: async (ctx, args): Promise<CheckpointRecoveryResult> => {
    const access = await recoveryAccess(ctx, args);
    if (typeof access === 'string') return failed(access);
    const { match, target } = access;
    const { proof } = args;
    if (target._id !== proof.targetId || target.actor !== proof.targetActor || target.requestJson !== proof.targetRequestJson)
      return failed('The saved action changed during verification. Try again.');
    if (target.preSnapshotJson) return { ok: true };
    const anchor = JSON.parse(proof.anchorSnapshotJson) as GameState;
    const checkpoint = JSON.parse(args.checkpointJson) as GameState;
    if (anchor.revision !== proof.anchorRevision || anchor.rulesVersion !== match.rulesVersion || anchor.catalogVersion !== match.catalogVersion ||
        checkpoint.rulesVersion !== match.rulesVersion || checkpoint.catalogVersion !== match.catalogVersion ||
        checkpoint.revision !== args.targetRevision - 1)
      return failed('The saved position no longer matches this game.');
    if (proof.anchorJournalId) {
      const source = await ctx.db.get(proof.anchorJournalId);
      if (source?.matchId !== match._id || source.preSnapshotJson !== proof.anchorSnapshotJson)
        return failed('The verification position changed. Try again.');
    } else if (match.snapshotJson !== proof.anchorSnapshotJson) {
      // Gameplay may continue during proof: the next accepted command preserves
      // the exact former current snapshot as an immutable journal checkpoint.
      const source = await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', match._id).eq('revision', proof.anchorRevision + 1)).unique();
      if (source?.preSnapshotJson !== proof.anchorSnapshotJson)
        return failed('The verification position changed. Try again.');
    }
    await ctx.db.patch(target._id, { preSnapshotJson: args.checkpointJson });
    return { ok: true };
  },
});

/** Public response contains only status; private replay inputs/results remain on the server. */
export const recoverCheckpoint = action({
  args: identityArgs,
  handler: async (ctx, args): Promise<CheckpointRecoveryResult> => {
    try {
      let prepared: RecoveryPreparation;
      let afterRevision = args.targetRevision - 1;
      do {
        prepared = await ctx.runQuery(internal.eclipseHistoryRecovery.prepareRecovery, { ...args, afterRevision });
        if (prepared.kind === 'next') afterRevision = prepared.afterRevision;
      } while (prepared.kind === 'next');
      if (prepared.kind === 'failure') return failed(prepared.reason);
      if (prepared.kind === 'complete') return { ok: true };
      const { proof } = prepared;
      const entries: Pick<JournalEntry, 'actor' | 'request'>[] = [];
      afterRevision = 0;
      let page: RequestPage;
      do {
        page = await ctx.runQuery(internal.eclipseHistoryRecovery.readRecoveryRequests, { matchId: args.matchId, afterRevision, throughRevision: proof.anchorRevision });
        for (const row of page.entries) {
          const request = JSON.parse(row.requestJson) as JournalEntry['request'];
          if (row.revision !== request.expectedRevision + 1) return failed('The saved history is incomplete and cannot verify this older action.');
          entries.push({ actor: row.actor, request });
        }
        if (page.afterRevision !== null) afterRevision = page.afterRevision;
      } while (page.afterRevision !== null);
      const result = recoverHistoryCheckpoint({ anchor: JSON.parse(proof.anchorSnapshotJson) as GameState, entries, targetRevision: args.targetRevision });
      if (!result.ok) return failed(result.reason === 'unsupported-version'
        ? 'This older game needs a rules version that is no longer available for exact replay.'
        : result.reason === 'incomplete-history'
          ? 'The saved history is incomplete and cannot verify this older action.'
          : 'This older position could not be reproduced exactly. Your current game is unchanged.');
      return await ctx.runMutation(internal.eclipseHistoryRecovery.storeRecoveredCheckpoint, { ...args, proof, checkpointJson: JSON.stringify(result.checkpoint) });
    } catch {
      return failed('This older position could not be verified. Your current game is unchanged.');
    }
  },
});
