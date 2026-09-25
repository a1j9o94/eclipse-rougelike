import {getFaction} from '../shared/eclipse/catalog';
import {projectHistoryEntry, type PublicHistoryEntry, type PublicHistoryPage} from '../shared/eclipse/history';
import type {GameState, JournalEntry} from '../shared/eclipse/types';
import type {QueryCtx} from './_generated/server';
import type {Doc, Id} from './_generated/dataModel';
import {retainedHistoryRanges, supersededRevision} from './eclipseRollback';

interface HistoryOptions {beforeRevision?:number; fromStart?:boolean; limit?:number; spectator?:boolean}
/** Shared bounded public-history read. Callers enforce access before resolving the match. */
export async function readPublicMatchHistory(ctx: Pick<QueryCtx,'db'>, matchId: Id<'eclipseMatchesV1'>, {beforeRevision,fromStart,limit,spectator=false}: HistoryOptions): Promise<PublicHistoryPage | null> {
    if (beforeRevision !== undefined && (!Number.isSafeInteger(beforeRevision) || beforeRevision < 1)) throw new Error('Invalid history cursor.');
    if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)) throw new Error('History page size must be between 1 and 100.');
    const match = await ctx.db.get(matchId);
    if (!match) return null;
    const count = limit ?? 40;
    const historyState = JSON.parse(match.snapshotJson) as GameState;
    if (historyState.revision !== match.revision || historyState.rulesVersion !== match.rulesVersion || historyState.catalogVersion !== match.catalogVersion) throw new Error('Match snapshot metadata mismatch.');
    const seats = historyState.seats;
    const rollbacks = await ctx.db.query('eclipseRollbacksV1').withIndex('by_match_created', q => q.eq('matchId', matchId)).collect();
    const lifecycle = await ctx.db.query('eclipseMatchLifecycleV1').withIndex('by_match_revision', q => beforeRevision === undefined ? q.eq('matchId', matchId) : q.eq('matchId', matchId).lt('revision', beforeRevision)).order(fromStart?'asc':'desc').take(count + 1);
    const latestLifecycle = await ctx.db.query('eclipseMatchLifecycleV1').withIndex('by_match_revision', q => q.eq('matchId', matchId)).order('desc').first();
    const projected: PublicHistoryEntry[] = [];
    const actorName = (seatId: string): string => { const seat = seats.find(candidate => candidate.id === seatId); return seat ? getFaction(seat.faction).name : 'Player'; };
    for (const row of lifecycle) projected.push({ revision: row.revision, actorSeatId: row.actor, actorName: actorName(row.actor), round: null, summary: row.outcome === 'abandoned' ? 'Ended the game' : 'Resigned · AI took over', details: [], rollbackAvailable: false, rollbackUnavailableReason: 'A player resignation cannot be undone.' });
    for (const row of rollbacks) {
      const common = { actorSeatId: row.requestedBySeatId, actorName: actorName(row.requestedBySeatId), round: null, rollbackAvailable: false, rollbackUnavailableReason: 'Choose a game action to undo.' };
      if (row.status !== 'applied') projected.push({ ...common, revision: row.expectedRevision + 1, summary: row.status === 'rejected' ? 'Undo declined' : row.status === 'cancelled' ? 'Undo cancelled' : 'Requested undo', details: [`Before action ${row.targetRevision}: ${row.targetSummary}`] });
      if (row.appliedRevision !== undefined) projected.push({ ...common, revision: row.appliedRevision, summary: 'Restored an earlier position', details: [`Returned to before action ${row.targetRevision}: ${row.targetSummary}`, 'The actions after that point were removed.'] });
    }
    const order = fromStart ? 'asc' : 'desc';
    const compare = (a: PublicHistoryEntry, b: PublicHistoryEntry): number => fromStart ? a.revision - b.revision : b.revision - a.revision;
    const controls = projected.filter(entry => (beforeRevision === undefined || entry.revision < beforeRevision) && supersededRevision(entry.revision, rollbacks) === undefined).sort(compare);
    // A page full of control markers also bounds how far command reads need to go.
    const controlCutoff = controls[count]?.revision;
    const ranges = retainedHistoryRanges(rollbacks, Math.min(match.revision, beforeRevision === undefined ? match.revision : beforeRevision - 1));
    const orderedRanges = fromStart ? ranges : ranges.reverse();
    const rows: Doc<'eclipseJournalV1'>[] = [];
    for (const range of orderedRanges) {
      const first = !fromStart && controlCutoff !== undefined ? Math.max(range.first, controlCutoff) : range.first;
      const last = fromStart && controlCutoff !== undefined ? Math.min(range.last, controlCutoff) : range.last;
      if (first > last) continue;
      let cursor: number | undefined;
      while (rows.length < count + 1) {
        const lower = order === 'asc' && cursor !== undefined ? cursor + 1 : first;
        const upper = order === 'desc' && cursor !== undefined ? cursor - 1 : last;
        if (lower > upper) break;
        const requested = count + 1 - rows.length;
        const batch = await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId',matchId).gte('revision',lower).lte('revision',upper)).order(order).take(requested);
        rows.push(...batch.filter(row => row.supersededAtRevision === undefined));
        if (batch.length < requested) break;
        cursor = batch.at(-1)!.revision;
      }
      if (rows.length >= count + 1) break;
    }
    const commands: PublicHistoryEntry[] = rows.map(row => {
      const reason = !row.preSnapshotJson ? 'This older action has no saved checkpoint.' : latestLifecycle && row.revision <= latestLifecycle.revision ? 'Undo cannot cross a player resignation.' : match.lifecycle === 'abandoned' ? 'This game has ended by resignation.' : undefined;
      return { ...projectHistoryEntry({ actor:row.actor, receipt:row.receipt, request:JSON.parse(row.requestJson) as JournalEntry['request'], events:JSON.parse(row.eventsJson) as JournalEntry['events'] },seats,row.round,historyState), rollbackAvailable: !reason, rollbackRecoverable:!row.preSnapshotJson&&(!latestLifecycle||row.revision>latestLifecycle.revision)&&match.lifecycle!=='abandoned', ...(reason ? { rollbackUnavailableReason: reason } : {}) };
    });
    const candidates = [...commands, ...controls].sort(compare);
    const entries = candidates.slice(0, count).sort((a,b)=>b.revision-a.revision);
    const publicEntries = spectator ? entries.map(entry => ({revision:entry.revision, actorSeatId:entry.actorSeatId, actorName:entry.actorName, round:entry.round, summary:entry.summary, details:entry.details, ...(entry.presentation ? {presentation:entry.presentation} : {}), ...(entry.combatVolley ? {combatVolley:entry.combatVolley} : {}), ...(entry.combatVolleys ? {combatVolleys:entry.combatVolleys} : {})})) : entries;
    return { entries:publicEntries, nextBeforeRevision: !fromStart && candidates.length > count ? entries[entries.length - 1].revision : null };
}
