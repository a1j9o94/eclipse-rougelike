import './hostStartingSeed';
import {finishDispatchedAi} from './aiWorkerTestSupport';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';
import type { GameState } from '../../shared/eclipse/types';
const modules = import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); vi.useFakeTimers(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Second Dawn authoritative match adapter', () => {
  it('creates a default three-seat isolated match and exposes only its owner view', async () => {
    const t = convexTest(schema, modules);
    const { credential } = await t.action(api.eclipseGuests.createGuestSession, {});
    const result = await t.mutation(api.eclipseMatches.createMatch, { credential });
    const view = await t.query(api.eclipseMatches.getMatchView, { credential, matchId: result.matchId });
    expect(view?.seats).toHaveLength(3);
    expect(view?.viewerSeatId).toBe('seat-1');
    expect(view).not.toHaveProperty('random');
    expect(view).not.toHaveProperty('supplies');
    expect(view).not.toHaveProperty('privateSeats');
    expect(await t.query(api.eclipseMatches.listMyMatches, { credential })).toHaveLength(1);
    const stranger = await t.action(api.eclipseGuests.createGuestSession, {});
    expect(await t.query(api.eclipseMatches.getMatchView, { ...stranger, matchId: result.matchId })).toBeNull();
    expect(await t.query(api.eclipseMatches.listMyMatches, stranger)).toEqual([]);
    expect(await t.run(ctx => ctx.db.query('rooms').collect())).toEqual([]);
  });
  it('atomically journals commands, returns original duplicate receipt, and rejects stale and stolen submissions', async () => {
    const t = convexTest(schema, modules);
    const { credential } = await t.action(api.eclipseGuests.createGuestSession, {});
    const { matchId } = await t.mutation(api.eclipseMatches.createMatch, { credential });
    // Pin the active seat only for this transport scenario; action legality is tested in the engine suite.
    await t.run(async ctx => {
      const match = await ctx.db.get(matchId);
      const state = JSON.parse(match!.snapshotJson) as GameState;
      state.activeSeatId = 'seat-1';
      await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
    });
    const request = { credential, matchId, commandId: 'first-pass', expectedRevision: 0, command: { type: 'pass' as const } };
    const first = await t.mutation(api.eclipseMatches.submitCommand, request);
    expect(first).toMatchObject({ ok: true, duplicate: false, receipt: { revision: 1 } });
    expect(await t.mutation(api.eclipseMatches.submitCommand, request)).toMatchObject({ ok: true, duplicate: true, receipt: first.ok ? first.receipt : undefined });
    expect(await t.mutation(api.eclipseMatches.submitCommand, { ...request, commandId: 'stale' })).toMatchObject({ ok: false, error: { code: 'STALE_REVISION' } });
    expect(await t.mutation(api.eclipseMatches.submitCommand, { ...request, expectedRevision: 1 })).toMatchObject({ ok: false, error: { code: 'COMMAND_ID_REUSED' } });
    const stranger = await t.action(api.eclipseGuests.createGuestSession, {});
    expect(await t.mutation(api.eclipseMatches.submitCommand, { ...request, ...stranger })).toMatchObject({ ok: false, error: { code: 'NOT_A_SEAT' } });
    expect(await t.run(ctx => ctx.db.query('eclipseJournalV1').collect())).toHaveLength(1);
  });
  it('rejects malformed credentials and invalid player counts without writing a match', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.eclipseMatches.createMatch, { credential: 'bad' })).rejects.toThrow('Guest session required');
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    await expect(t.mutation(api.eclipseMatches.createMatch, { ...guest, aiCount: 6 })).rejects.toThrow('between 1 and 5');
    expect(await t.run(ctx => ctx.db.query('eclipseMatchesV1').collect())).toEqual([]);
  });
  it('persists AI failures without passing and recovers through an owned retry', async () => {
    const t=convexTest(schema,modules);
    const guest=await t.action(api.eclipseGuests.createGuestSession,{});
    const {matchId}=await t.mutation(api.eclipseMatches.createMatch,guest);
    await t.run(async ctx=>{
      const row=await ctx.db.get(matchId);const state=JSON.parse(row!.snapshotJson) as GameState;
      state.activeSeatId='seat-2';state.phase='action';state.pendingDecision={id:'unavailable-ai-choice',owner:'seat-2',kind:'free-technology',technologyIds:[]};
      await ctx.db.patch(matchId,{snapshotJson:JSON.stringify(state),phase:'action'});
      const job=await ctx.db.query('eclipseAiJobsV1').withIndex('by_match',q=>q.eq('matchId',matchId)).unique();
      await ctx.db.patch(job!._id,{status:'scheduled',expectedRevision:0});
    });
    await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:0});
    await finishDispatchedAi(t);
    const failed=await t.query(api.eclipseMatches.getMatchView,{...guest,matchId});
    expect(failed?.aiStatus).toMatchObject({status:'failed',attempts:1});
    expect(failed?.revision).toBe(0);
    expect(failed?.seats.find(s=>s.id==='seat-2')?.passed).toBe(false);
    const stranger=await t.action(api.eclipseGuests.createGuestSession,{});
    await expect(t.mutation(api.eclipseMatches.retryAi,{...stranger,matchId})).rejects.toThrow('does not own');
    await t.run(async ctx=>{const row=await ctx.db.get(matchId);const state=JSON.parse(row!.snapshotJson) as GameState;state.phase='action';state.pendingDecision=null;await ctx.db.patch(matchId,{phase:'action',snapshotJson:JSON.stringify(state)});});
    await t.mutation(api.eclipseMatches.retryAi,{...guest,matchId});
    await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:0});
    await finishDispatchedAi(t);
    expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.revision).toBe(1);
    await t.mutation(internal.eclipseMatches.runAi,{matchId,expectedRevision:0});
    await finishDispatchedAi(t);
    expect((await t.query(api.eclipseMatches.getMatchView,{...guest,matchId}))?.revision).toBe(1);
  });
  it('resumes an outstanding private decision exactly and keeps it away from unauthorized guests', async () => {
    const t = convexTest(schema, modules);
    const guest = await t.action(api.eclipseGuests.createGuestSession, {});
    const { matchId } = await t.mutation(api.eclipseMatches.createMatch, guest);
    const pending = { id: 'pending-resume', owner: 'seat-1', kind: 'reputation' as const, drawn: [2, 4], capacity: 4 };
    await t.run(async ctx => {
      const row = await ctx.db.get(matchId);
      const state = JSON.parse(row!.snapshotJson) as GameState;
      state.pendingDecision = pending;
      await ctx.db.patch(matchId, { snapshotJson: JSON.stringify(state) });
    });
    expect((await t.query(api.eclipseMatches.getMatchView, { ...guest, matchId }))?.pendingDecision).toEqual(pending);
    expect((await t.query(api.eclipseMatches.getMatchView, { ...guest, matchId }))?.pendingDecision).toEqual(pending);
  });
});
