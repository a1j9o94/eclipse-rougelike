import './hostStartingSeed';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { api, internal } from '../../convex/_generated/api';
import { legalCommands } from '../../shared/eclipse/legal';
import type { GameState } from '../../shared/eclipse/types';

const modules = import.meta.glob('../../convex/**/*.{ts,js}');
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); vi.useFakeTimers(); vi.setSystemTime(1_000); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
async function game(multiplayer = false) {
  const t = convexTest(schema, modules);
  const host = await t.action(api.eclipseGuests.createGuestSession, {});
  const guest = await t.action(api.eclipseGuests.createGuestSession, {});
  const room = await t.mutation(api.eclipseRooms.createRoom, { ...host, faction: 'terran-directorate', settings: { humanSeatCount: multiplayer ? 2 : 1, aiCount: 1, timerMs: 30_000, warpPortals: true } });
  if (multiplayer) {
    await t.mutation(api.eclipseRooms.joinRoom, { ...guest, roomToken: room.roomToken, faction: 'hydran' });
    await t.mutation(api.eclipseRooms.setRoomReady, { ...guest, roomToken: room.roomToken, ready: true });
  }
  await t.mutation(api.eclipseRooms.setRoomReady, { ...host, roomToken: room.roomToken, ready: true });
  const { matchId } = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: room.roomToken });
  const before = await t.run(async ctx => (await ctx.db.get(matchId))!.snapshotJson);
  const accepted = await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'first', expectedRevision: 0, command: { type: 'pass' } });
  expect(accepted.ok).toBe(true);
  return { t, host, guest, matchId, before, roomToken: room.roomToken };
}

describe('Consensual history rollback', () => {
  it('restores an interrupted exploration choice and its hidden decks exactly', async () => {
    const { t, host, matchId } = await game();
    await t.mutation(api.eclipseRollback.requestRollback, { ...host, matchId, targetRevision: 1, expectedRevision: 1 });
    const view = (await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))!;
    const explore = legalCommands(view).find(candidate => candidate.command.type === 'explore')!.command;
    expect((await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'draw', expectedRevision: view.revision, command: explore })).ok).toBe(true);
    const drawn = await t.run(ctx => ctx.db.get(matchId));
    const pendingView = (await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))!;
    expect(pendingView.pendingDecision?.kind).toBe('exploration');
    const resolve = legalCommands(pendingView).find(candidate => candidate.command.type === 'resolve')!.command;
    const accepted = await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'place', expectedRevision: pendingView.revision, command: resolve });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) throw new Error('Placement failed');
    await t.mutation(api.eclipseRollback.requestRollback, { ...host, matchId, targetRevision: accepted.receipt.revision, expectedRevision: accepted.receipt.revision });
    const restored = await t.run(ctx => ctx.db.get(matchId));
    expect(JSON.parse(restored!.snapshotJson)).toEqual({ ...JSON.parse(drawn!.snapshotJson), revision: restored!.revision });
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))!.pendingDecision).toEqual(pendingView.pendingDecision);
    const history = await t.query(api.eclipseMatches.getMatchHistory, { ...host, matchId });
    expect(history!.entries.map(entry => entry.revision)).toEqual([restored!.revision, pendingView.revision, 3]);
    expect(JSON.stringify(history)).not.toContain('preSnapshotJson');
  });

  it('requires both other humans, ignores duplicate approvals, and checkpoints actual AI commits', async () => {
    const t = convexTest(schema, modules);
    const identities = await Promise.all([0, 1, 2].map(() => t.action(api.eclipseGuests.createGuestSession, {})));
    const [host, second, third] = identities;
    const room = await t.mutation(api.eclipseRooms.createRoom, { ...host, faction: 'terran-directorate', settings: { humanSeatCount: 3, aiCount: 1, timerMs: 30_000, warpPortals: true } });
    await t.mutation(api.eclipseRooms.joinRoom, { ...second, roomToken: room.roomToken, faction: 'hydran' });
    await t.mutation(api.eclipseRooms.joinRoom, { ...third, roomToken: room.roomToken, faction: 'planta' });
    for (const identity of identities) await t.mutation(api.eclipseRooms.setRoomReady, { ...identity, roomToken: room.roomToken, ready: true });
    const { matchId } = await t.mutation(api.eclipseRooms.startRoom, { ...host, roomToken: room.roomToken });
    expect((await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'pass', expectedRevision: 0, command: { type: 'pass' } })).ok).toBe(true);
    const requested = await t.mutation(api.eclipseRollback.requestRollback, { ...host, matchId, expectedRevision: 1, targetRevision: 1 });
    const vote = { ...second, matchId, rollbackId: requested.pending!.id, approve: true };
    const firstVote = await t.mutation(api.eclipseRollback.respondRollback, vote);
    expect(firstVote.pending?.approvedSeatIds).toEqual(['seat-2']);
    expect((await t.mutation(api.eclipseRollback.respondRollback, vote)).pending?.approvedSeatIds).toEqual(['seat-2']);
    expect((await t.mutation(api.eclipseRollback.respondRollback, { ...third, matchId, rollbackId: requested.pending!.id, approve: true })).lastResolution?.status).toBe('applied');

    const solo = await game();
    await solo.t.mutation(internal.eclipseMatches.runAi, { matchId: solo.matchId, expectedRevision: 1 });
    const job = await solo.t.run(ctx => ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', solo.matchId)).unique());
    const beforeAi = await solo.t.run(ctx => ctx.db.get(solo.matchId));
    const work = await solo.t.query(internal.eclipseMatches.getAiWork, { matchId: solo.matchId, expectedRevision: 1, leaseToken: job!.leaseToken! });
    await solo.t.mutation(internal.eclipseMatches.commitAiWork, { matchId: solo.matchId, expectedRevision: 1, leaseToken: job!.leaseToken!, command: legalCommands(work!.view)[0].command, elapsedMs: 1 });
    const entry = await solo.t.run(ctx => ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', solo.matchId).eq('revision', 2)).unique());
    expect(entry?.preSnapshotJson).toBe(beforeAi!.snapshotJson);
    await solo.t.mutation(api.eclipseRollback.requestRollback, { ...solo.host, matchId: solo.matchId, expectedRevision: 2, targetRevision: 2 });
    const restored = await solo.t.run(ctx => ctx.db.get(solo.matchId));
    expect(JSON.parse(restored!.snapshotJson)).toEqual({ ...JSON.parse(beforeAi!.snapshotJson), revision: restored!.revision });
    expect((await solo.t.query(internal.eclipseMatches.getAiWork, { matchId: solo.matchId, expectedRevision: 1, leaseToken: job!.leaseToken! }))).toBeNull();
  });

  it('can reopen scoring but cannot revisit discarded history or cross resignation boundaries', async () => {
    const solo = await game();
    await solo.t.run(async ctx => {
      const row = (await ctx.db.get(solo.matchId))!;
      const state = JSON.parse(row.snapshotJson) as GameState;
      state.phase = 'finished';
      await ctx.db.patch(row._id, { snapshotJson: JSON.stringify(state), phase: 'finished' });
      const room = await ctx.db.query('eclipseRoomsV1').withIndex('by_match', q => q.eq('matchId', row._id)).unique();
      await ctx.db.patch(room!._id, { status: 'finished' });
    });
    const restored = await solo.t.mutation(api.eclipseRollback.requestRollback, { ...solo.host, matchId: solo.matchId, expectedRevision: 1, targetRevision: 1 });
    expect((await solo.t.query(api.eclipseMatches.getMatchView, { ...solo.host, matchId: solo.matchId }))!.phase).toBe('action');
    expect((await solo.t.query(api.eclipseRooms.getRoom, { ...solo.host, roomToken: solo.roomToken }))!.status).toBe('playing');
    await expect(solo.t.mutation(api.eclipseRollback.requestRollback, { ...solo.host, matchId: solo.matchId, expectedRevision: restored.revision, targetRevision: 1 })).rejects.toThrow('discarded');

    const multi = await game(true);
    const resigned = await multi.t.mutation(api.eclipseMatches.resignMatch, { ...multi.guest, matchId: multi.matchId, commandId: 'resign', expectedRevision: 1 });
    expect(resigned.ok).toBe(true);
    await expect(multi.t.mutation(api.eclipseRollback.requestRollback, { ...multi.host, matchId: multi.matchId, expectedRevision: 2, targetRevision: 1 })).rejects.toThrow('resignation');
    const history = await multi.t.query(api.eclipseMatches.getMatchHistory, { ...multi.host, matchId: multi.matchId });
    expect(history!.entries.map(entry => entry.revision)).toEqual([2, 1]);
    expect(history!.entries[1].rollbackUnavailableReason).toMatch(/resignation/);
  });

  it('checkpoints timeout commands and invalidates an in-flight AI lease while voting', async () => {
    const { t, host, guest, matchId, roomToken } = await game(true);
    const timer = await t.run(ctx => ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique());
    await t.run(ctx => ctx.db.patch(timer!._id, { deadlineAt: 0 }));
    await t.mutation(internal.eclipseRooms.runRoomTimeout, { roomToken, token: timer!.token });
    await t.mutation(internal.eclipseMatches.runAi, { matchId, expectedRevision: 1 });
    const job = await t.run(ctx => ctx.db.query('eclipseAiJobsV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique());
    const work = (await t.query(internal.eclipseMatches.getAiWork, { matchId, expectedRevision: 1, leaseToken: job!.leaseToken! }))!;
    const command = legalCommands(work.view)[0].command;
    const before = (await t.run(ctx => ctx.db.get(matchId)))!.snapshotJson;
    await t.mutation(internal.eclipseMatches.commitAiWork, { matchId, expectedRevision: 1, leaseToken: job!.leaseToken!, command, elapsedMs: 1 });
    const committed = await t.run(ctx => ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', matchId).eq('revision', 2)).unique());
    expect(committed!.preSnapshotJson).toBe(before);
    const requested = await t.mutation(api.eclipseRollback.requestRollback, { ...host, matchId, expectedRevision: 2, targetRevision: 2 });
    await t.mutation(internal.eclipseMatches.commitAiWork, { matchId, expectedRevision: 1, leaseToken: job!.leaseToken!, command, elapsedMs: 1 });
    expect((await t.query(api.eclipseMatches.getMatchView, { ...host, matchId }))!.revision).toBe(requested.revision);
    await expect(t.mutation(api.eclipseRooms.retryRoomTimer, { ...host, roomToken })).rejects.toThrow('paused');
    expect((await t.mutation(api.eclipseRollback.respondRollback, { ...guest, matchId, rollbackId: requested.pending!.id, approve: true })).lastResolution?.status).toBe('applied');
  });

  it('transfers room hosting when its host resigns so the remaining player can request undo', async () => {
    const { t, host, guest, matchId, roomToken } = await game(true);
    expect((await t.mutation(api.eclipseMatches.resignMatch, { ...host, matchId, commandId: 'host-resign', expectedRevision: 1 })).ok).toBe(true);
    const lobby = (await t.query(api.eclipseRooms.getRoom, { ...guest, roomToken }))!;
    expect(lobby.viewerIsHost).toBe(true);
    expect((await t.query(api.eclipseRollback.getRollbackStatus, { ...guest, matchId }))!.isHost).toBe(true);
    expect((await t.query(api.eclipseRollback.getRollbackStatus, { ...host, matchId }))!.isHost).toBe(false);
    const accepted = await t.mutation(api.eclipseMatches.submitCommand, { ...guest, matchId, commandId: 'guest-pass', expectedRevision: 2, command: { type: 'pass' } });
    expect(accepted.ok).toBe(true);
    await expect(t.mutation(api.eclipseRollback.requestRollback, { ...host, matchId, expectedRevision: 3, targetRevision: 3 })).rejects.toThrow('host');
    const undone = await t.mutation(api.eclipseRollback.requestRollback, { ...guest, matchId, expectedRevision: 3, targetRevision: 3 });
    expect(undone.lastResolution?.status).toBe('applied');
  });

  it('restores a solo checkpoint, keeps revisions monotonic and removes undone actions', async () => {
    const { t, host, matchId, before } = await game();
    const result = await t.mutation(api.eclipseRollback.requestRollback, { ...host, matchId, targetRevision: 1, expectedRevision: 1 });
    expect(result.pending).toBeNull();
    expect(result.lastResolution?.status).toBe('applied');
    const match = await t.run(ctx => ctx.db.get(matchId));
    const restored = JSON.parse(match!.snapshotJson) as GameState;
    expect(restored).toEqual({ ...JSON.parse(before), revision: match!.revision });
    expect(match!.revision).toBeGreaterThan(1);
    const history = await t.query(api.eclipseMatches.getMatchHistory, { ...host, matchId });
    expect(history?.entries.find(entry => entry.revision === 1)).toBeUndefined();
    const duplicate = await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'first', expectedRevision: 0, command: { type: 'pass' } });
    expect(duplicate).toMatchObject({ ok: true, duplicate: true, receipt: { revision: 1 } });
    const stale = await t.mutation(api.eclipseMatches.submitCommand, { ...host, matchId, commandId: 'stale', expectedRevision: 1, command: { type: 'pass' } });
    expect(stale).toMatchObject({ ok: false, error: { code: 'STALE_REVISION' } });
  });

  it('requires the host and unanimous other-human approval, pausing commands and old AI work', async () => {
    const { t, host, guest, matchId } = await game(true);
    await expect(t.mutation(api.eclipseRollback.requestRollback, { ...guest, matchId, targetRevision: 1, expectedRevision: 1 })).rejects.toThrow('host');
    const requested = await t.mutation(api.eclipseRollback.requestRollback, { ...host, matchId, targetRevision: 1, expectedRevision: 1 });
    expect(requested.pending).toMatchObject({ requiredSeatIds: ['seat-2'], approvedSeatIds: [], targetRevision: 1 });
    const pausedRevision = requested.revision;
    const paused = await t.mutation(api.eclipseMatches.submitCommand, { ...guest, matchId, commandId: 'during-vote', expectedRevision: pausedRevision, command: { type: 'pass' } });
    expect(paused).toMatchObject({ ok: false });
    await t.mutation(internal.eclipseMatches.runAi, { matchId, expectedRevision: 1 });
    expect((await t.query(api.eclipseMatches.getMatchView, { ...guest, matchId }))?.revision).toBe(pausedRevision);
    const accepted = await t.mutation(api.eclipseRollback.respondRollback, { ...guest, matchId, rollbackId: requested.pending!.id, approve: true });
    expect(accepted.pending).toBeNull();
    expect(accepted.lastResolution?.status).toBe('applied');
    expect(accepted.revision).toBeGreaterThan(pausedRevision);
  });

  it('rejects stale requests and outsider votes without revealing private snapshots', async () => {
    const { t, host, matchId } = await game(true);
    await expect(t.mutation(api.eclipseRollback.requestRollback, { ...host, matchId, targetRevision: 1, expectedRevision: 0 })).rejects.toThrow('changed');
    const request = await t.mutation(api.eclipseRollback.requestRollback, { ...host, matchId, targetRevision: 1, expectedRevision: 1 });
    const outsider = await t.action(api.eclipseGuests.createGuestSession, {});
    expect(await t.query(api.eclipseRollback.getRollbackStatus, { ...outsider, matchId })).toBeNull();
    await expect(t.mutation(api.eclipseRollback.respondRollback, { ...outsider, matchId, rollbackId: request.pending!.id, approve: true })).rejects.toThrow('seat');
    const projection = JSON.stringify(request);
    for (const secret of ['snapshotJson', 'preSnapshotJson', 'rng', 'decks', 'guestId', host.credential]) expect(projection).not.toContain(secret);
    const history = JSON.stringify(await t.query(api.eclipseMatches.getMatchHistory, { ...host, matchId }));
    expect(history).not.toContain('preSnapshotJson');
  });

  it('resumes after refusal without rewinding and preserves the paused timer allowance', async () => {
    const { t, host, guest, matchId, roomToken } = await game(true);
    const timer = await t.run(ctx => ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique());
    vi.setSystemTime(6_000);
    const requested = await t.mutation(api.eclipseRollback.requestRollback, { ...host, matchId, targetRevision: 1, expectedRevision: 1 });
    vi.setSystemTime(106_000);
    await t.mutation(internal.eclipseRooms.runRoomTimeout, { roomToken, token: timer!.token });
    const result = await t.mutation(api.eclipseRollback.respondRollback, { ...guest, matchId, rollbackId: requested.pending!.id, approve: false });
    expect(result.lastResolution?.status).toBe('rejected');
    const view = await t.query(api.eclipseMatches.getMatchView, { ...host, matchId });
    expect(view?.seats.find(seat => seat.id === 'seat-1')?.passed).toBe(true);
    const resumed = await t.run(ctx => ctx.db.query('eclipseRoomTimersV1').withIndex('by_match', q => q.eq('matchId', matchId)).unique());
    expect(resumed!.token).not.toBe(timer!.token);
    expect(resumed!.deadlineAt).toBe(timer!.deadlineAt + 100_000);
    const stale = await t.mutation(api.eclipseMatches.submitCommand, { ...guest, matchId, commandId: 'old-tab', expectedRevision: 1, command: { type: 'pass' } });
    expect(stale).toMatchObject({ ok: false, error: { code: 'STALE_REVISION' } });
  });

  it('makes retries idempotent and only lets the requesting host cancel', async () => {
    const { t, host, guest, matchId } = await game(true);
    const args = { ...host, matchId, targetRevision: 1, expectedRevision: 1 };
    const requested = await t.mutation(api.eclipseRollback.requestRollback, args);
    expect((await t.mutation(api.eclipseRollback.requestRollback, args)).pending?.id).toBe(requested.pending?.id);
    await expect(t.mutation(api.eclipseRollback.cancelRollback, { ...guest, matchId, rollbackId: requested.pending!.id })).rejects.toThrow('host');
    const cancelled = await t.mutation(api.eclipseRollback.cancelRollback, { ...host, matchId, rollbackId: requested.pending!.id });
    expect(cancelled.lastResolution?.status).toBe('cancelled');
    expect((await t.mutation(api.eclipseRollback.cancelRollback, { ...host, matchId, rollbackId: requested.pending!.id })).lastResolution?.status).toBe('cancelled');
  });

  it('honestly disables old history rows that have no private checkpoint', async () => {
    const { t, host, matchId } = await game();
    await t.run(async ctx => {
      const row = await ctx.db.query('eclipseJournalV1').withIndex('by_match_revision', q => q.eq('matchId', matchId).eq('revision', 1)).unique();
      await ctx.db.patch(row!._id, { preSnapshotJson: undefined });
    });
    const history = await t.query(api.eclipseMatches.getMatchHistory, { ...host, matchId });
    expect(history?.entries[0]).toMatchObject({ rollbackAvailable: false });
    expect(history?.entries[0].rollbackUnavailableReason).toMatch(/checkpoint/);
    await expect(t.mutation(api.eclipseRollback.requestRollback, { ...host, matchId, targetRevision: 1, expectedRevision: 1 })).rejects.toThrow('checkpoint');
  });
});
it('reaches the original setup across multiple pages without a recent-action cutoff',async()=>{
 const {t,host,matchId,before}=await game();
 for(let revision=1;revision<125;revision++)expect((await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:`history-${revision}`,expectedRevision:revision,command:{type:'set-auto-pass',enabled:revision%2===0}})).ok).toBe(true);
 const newest=await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId});expect(newest!.entries).toHaveLength(40);expect(newest!.entries[0].revision).toBe(125);
 const beginning=await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId,fromStart:true});expect(beginning!.entries).toHaveLength(40);expect(beginning!.entries.at(-1)).toMatchObject({revision:1,rollbackAvailable:true});expect(JSON.stringify(beginning)).not.toContain('preSnapshotJson');
 let cursor=newest!.nextBeforeRevision;const all=[...newest!.entries];while(cursor!==null){const next=(await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId,beforeRevision:cursor}))!;all.push(...next.entries);cursor=next.nextBeforeRevision;}
 expect(all.map(entry=>entry.revision)).toEqual(Array.from({length:125},(_,i)=>125-i));
 await t.mutation(api.eclipseRollback.requestRollback,{...host,matchId,targetRevision:1,expectedRevision:125});const row=(await t.run(ctx=>ctx.db.get(matchId)))!;expect(JSON.parse(row.snapshotJson)).toEqual({...JSON.parse(before),revision:row.revision});
});

it('permanently removes the undone future from active history while keeping duplicate receipts safe',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{}),{matchId}=await t.mutation(api.eclipseMatches.createMatch,{...host,aiCount:1});
 for(let revision=0;revision<125;revision++)expect((await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:`timeline-${revision}`,expectedRevision:revision,command:{type:'set-auto-pass',enabled:revision%2===0}})).ok).toBe(true);
 const restored=await t.mutation(api.eclipseRollback.requestRollback,{...host,matchId,targetRevision:60,expectedRevision:125});
 expect(restored.revision).toBe(127);
 const newest=(await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId,limit:10}))!;
 expect(newest.entries.map(entry=>entry.revision)).toEqual([127,59,58,57,56,55,54,53,52,51]);
 const all=[...newest.entries];let cursor=newest.nextBeforeRevision;
 while(cursor!==null){const next=(await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId,beforeRevision:cursor,limit:10}))!;all.push(...next.entries);cursor=next.nextBeforeRevision;}
 expect(all.map(entry=>entry.revision)).toEqual([127,...Array.from({length:59},(_,i)=>59-i)]);
 const beginning=(await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId,fromStart:true,limit:10}))!;
 expect(beginning.entries.map(entry=>entry.revision)).toEqual([10,9,8,7,6,5,4,3,2,1]);
 expect((await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId,beforeRevision:120,limit:5}))!.entries.map(entry=>entry.revision)).toEqual([59,58,57,56,55]);
 await expect(t.mutation(api.eclipseRollback.requestRollback,{...host,matchId,targetRevision:60,expectedRevision:127})).rejects.toThrow(/discarded/);
 const duplicate=await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:'timeline-59',expectedRevision:59,command:{type:'set-auto-pass',enabled:false}});
 expect(duplicate).toMatchObject({ok:true,duplicate:true,receipt:{revision:60}});
 expect((await t.query(api.eclipseMatches.getMatchView,{...host,matchId}))!.revision).toBe(127);
 for(let revision=127;revision<137;revision++)expect((await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:`new-timeline-${revision}`,expectedRevision:revision,command:{type:'set-auto-pass',enabled:revision%2===0}})).ok).toBe(true);
 expect((await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId,limit:10}))!.entries.map(entry=>entry.revision)).toEqual([137,136,135,134,133,132,131,130,129,128]);
 await t.mutation(api.eclipseRollback.requestRollback,{...host,matchId,targetRevision:10,expectedRevision:137});
 expect((await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId}))!.entries.map(entry=>entry.revision)).toEqual([139,9,8,7,6,5,4,3,2,1]);
 await expect(t.mutation(api.eclipseRollback.requestRollback,{...host,matchId,targetRevision:128,expectedRevision:139})).rejects.toThrow(/discarded/);
});

it('pages sparse retained control markers without reintroducing commands from repeated undos',async()=>{
 const t=convexTest(schema,modules),host=await t.action(api.eclipseGuests.createGuestSession,{}),{matchId}=await t.mutation(api.eclipseMatches.createMatch,{...host,aiCount:1});
 for(let turn=0;turn<12;turn++){
  const revision=turn*3;
  expect((await t.mutation(api.eclipseMatches.submitCommand,{...host,matchId,commandId:`discarded-${turn}`,expectedRevision:revision,command:{type:'set-auto-pass',enabled:true}})).ok).toBe(true);
  await t.mutation(api.eclipseRollback.requestRollback,{...host,matchId,targetRevision:revision+1,expectedRevision:revision+1});
 }
 const latest=(await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId,limit:5}))!;
 expect(latest.entries.map(entry=>entry.revision)).toEqual([36,33,30,27,24]);
 const next=(await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId,beforeRevision:latest.nextBeforeRevision!,limit:5}))!;
 expect(next.entries.map(entry=>entry.revision)).toEqual([21,18,15,12,9]);
 const last=(await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId,beforeRevision:next.nextBeforeRevision!,limit:5}))!;
 expect(last.entries.map(entry=>entry.revision)).toEqual([6,3]);expect(last.nextBeforeRevision).toBeNull();
 const beginning=(await t.query(api.eclipseMatches.getMatchHistory,{...host,matchId,fromStart:true,limit:5}))!;
 expect(beginning.entries.map(entry=>entry.revision)).toEqual([15,12,9,6,3]);
});
