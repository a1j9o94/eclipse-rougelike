import { describe, expect, it } from 'vitest';
import {
  connectionBetween,
  movableShipCount,
  validateMovementPath,
  validateRetreat,
  type MovementSector,
  type MovementShip,
} from '../../shared/eclipse/geometry';
import {
  dieHits,
  resolveDamageAllocation,
  initiativeGroups,
  type AttackDie,
  type CombatTarget,
} from '../../shared/eclipse/combat';
const sector = (
  id: string,
  q: number,
  wormholes: MovementSector['wormholes'] = [0, 3],
): MovementSector => ({
  id,
  q,
  r: 0,
  rotation: 0,
  wormholes,
  warpPortal: false,
  controller: 'p',
});
const ship = (
  id: string,
  sectorId: string,
  owner: string | null = 'p',
): MovementShip => ({ id, sectorId, owner, kind: 'interceptor', movement: 3 });
const abilities = {
  wormholeGenerator: false,
  cloakingDevice: false,
  descendantsOfDraco: false,
};
const board = [sector('a', 0), sector('b', 1), sector('c', 2)];
describe('Second Dawn movement rules', () => {
  it('matches facing edges after rotation and requires at least one edge with the generator', () => {
    const a = sector('a', 0, [5]);
    const b = sector('b', 1, [3]);
    expect(connectionBetween(a, b)).toBe('none');
    expect(connectionBetween({ ...a, rotation: 1 }, b)).toBe('wormhole');
    expect(connectionBetween(a, b, true)).toBe('generator');
    expect(
      connectionBetween(sector('a', 0, []), sector('b', 1, []), true),
    ).toBe('none');
  });
  it('joins two distinct warp portals regardless of distance, but never a sector to itself', () => {
    const a = { ...sector('a', 0), warpPortal: true };
    const b = { ...sector('b', 6), warpPortal: true };
    expect(connectionBetween(a, b)).toBe('warp');
    expect(connectionBetween(a, a)).toBe('none');
    expect(connectionBetween(a, { ...b, warpPortal: false })).toBe('none');
  });
  it('recomputes pinning including allied opponents; cloaking requires two enemies per ship', () => {
    const fleet = [ship('p1', 'a'), ship('p2', 'a'), ship('e', 'a', 'ally')];
    expect(movableShipCount('p', 'a', fleet, abilities)).toBe(1);
    expect(
      movableShipCount('p', 'a', fleet, { ...abilities, cloakingDevice: true }),
    ).toBe(2);
    expect(
      movableShipCount(
        'p',
        'a',
        [...fleet, { ...ship('g', 'a', null), kind: 'gcds' }],
        { ...abilities, cloakingDevice: true },
      ),
    ).toBe(0);
  });
  it('Draco coexistence applies to Ancients, not Guardians or GCDS', () => {
    const fleet: MovementShip[] = [
      ship('p', 'a'),
      { ...ship('ancient', 'a', null), kind: 'ancient' },
    ];
    expect(movableShipCount('p', 'a', fleet, abilities)).toBe(0);
    expect(
      movableShipCount('p', 'a', fleet, {
        ...abilities,
        descendantsOfDraco: true,
      }),
    ).toBe(1);
    expect(
      movableShipCount(
        'p',
        'a',
        [fleet[0], { ...fleet[1], kind: 'guardian' }],
        { ...abilities, descendantsOfDraco: true },
      ),
    ).toBe(0);
  });
  it('allows entering a pinning sector but forbids continuing without covering ships', () => {
    const fleet = [ship('p', 'a'), ship('enemy', 'b', 'e')];
    const request = {
      player: 'p',
      shipId: 'p',
      path: ['b'],
      sectors: board,
      ships: fleet,
      abilities,
    };
    expect(validateMovementPath(request)).toEqual({ ok: true });
    expect(
      validateMovementPath({ ...request, path: ['b', 'c'] }),
    ).toMatchObject({ ok: false, code: 'pinned', sectorId: 'b' });
    expect(
      validateMovementPath({
        ...request,
        path: ['b', 'c'],
        ships: [...fleet, ship('cover', 'b')],
      }),
    ).toEqual({ ok: true });
    expect(fleet[0].sectorId).toBe('a');
  });
  it('rejects unexplored, disconnected, over-range, immobile, and foreign moves', () => {
    const request = {
      player: 'p',
      shipId: 'p',
      path: ['b'],
      sectors: board,
      ships: [ship('p', 'a')],
      abilities,
    };
    expect(
      validateMovementPath({ ...request, path: ['missing'] }),
    ).toMatchObject({ code: 'unexplored' });
    expect(validateMovementPath({ ...request, path: ['c'] })).toMatchObject({
      code: 'disconnected',
    });
    expect(
      validateMovementPath({ ...request, path: ['b', 'c', 'b', 'a'] }),
    ).toMatchObject({ code: 'range' });
    expect(validateMovementPath({ ...request, player: 'e' })).toMatchObject({
      code: 'ownership',
    });
    expect(
      validateMovementPath({
        ...request,
        ships: [{ ...ship('p', 'a'), movement: 0 }],
      }),
    ).toMatchObject({ code: 'immobile' });
  });
  it('retreat requires a controlled connected sector without opponents, independent of pinning', () => {
    const request = {
      player: 'p',
      from: board[0],
      to: board[1],
      ships: [ship('enemy', 'a', 'e')],
      abilities,
    };
    expect(validateRetreat(request)).toEqual({ ok: true });
    expect(
      validateRetreat({ ...request, to: { ...board[1], controller: null } }),
    ).toMatchObject({ code: 'not-controlled' });
    expect(
      validateRetreat({ ...request, ships: [ship('enemy', 'b', 'e')] }),
    ).toMatchObject({ code: 'occupied' });
  });
});
describe('Second Dawn combat primitives', () => {
  it('natural blank always misses and natural burst always hits; other dice use target shields', () => {
    expect(dieHits(1, 100, 0)).toBe(false);
    expect(dieHits(6, 0, 100)).toBe(true);
    expect(dieHits(5, 2, 1)).toBe(true);
    expect(dieHits(5, 2, 2)).toBe(false);
  });
  const dice: AttackDie[] = [{ id: 'd1', face: 6, damage: 2, computer: 0 }];
  const targets: CombatTarget[] = [
    { id: 't1', hull: 1, damage: 0, shield: 0 },
    { id: 't2', hull: 2, damage: 0, shield: 0 },
  ];
  it('assigns each die wholly to one target without damage overflow; hull must be exceeded', () => {
    expect(
      resolveDamageAllocation(dice, targets, [{ dieId: 'd1', targetId: 't1' }]),
    ).toEqual({
      ok: true,
      targets: [
        { ...targets[0], damage: 2, destroyed: true },
        { ...targets[1], destroyed: false },
      ],
    });
    expect(
      resolveDamageAllocation(dice, targets, [{ dieId: 'd1', targetId: 't2' }]),
    ).toMatchObject({
      ok: true,
      targets: [{ damage: 0 }, { damage: 2, destroyed: false }],
    });
    expect(targets[0].damage).toBe(0);
  });
  it('rejects split/duplicate allocations, missing dice and nonexistent targets atomically', () => {
    expect(
      resolveDamageAllocation(dice, targets, [
        { dieId: 'd1', targetId: 't1' },
        { dieId: 'd1', targetId: 't2' },
      ]),
    ).toMatchObject({ ok: false, code: 'duplicate-die' });
    expect(resolveDamageAllocation(dice, targets, [])).toMatchObject({
      code: 'unassigned-die',
    });
    expect(
      resolveDamageAllocation(dice, targets, [
        { dieId: 'd1', targetId: 'absent' },
      ]),
    ).toMatchObject({ code: 'invalid-target' });
  });
  it('evaluates shield against each assigned die and adds existing damage', () => {
    expect(
      resolveDamageAllocation(
        [{ ...dice[0], face: 5, computer: 1 }],
        [{ ...targets[0], shield: 1, damage: 1 }],
        [{ dieId: 'd1', targetId: 't1' }],
      ),
    ).toMatchObject({ ok: true, targets: [{ damage: 1, destroyed: false }] });
    expect(
      resolveDamageAllocation(
        dice,
        [{ ...targets[1], damage: 1 }],
        [{ dieId: 'd1', targetId: 't2' }],
      ),
    ).toMatchObject({ ok: true, targets: [{ damage: 3, destroyed: true }] });
  });
  it('orders high initiative first, defender wins ties; own tied types remain a player choice', () => {
    expect(
      initiativeGroups(
        [
          { id: 'a', owner: 'attacker', initiative: 3 },
          { id: 'b', owner: 'defender', initiative: 3 },
          { id: 'c', owner: 'defender', initiative: 3 },
          { id: 'd', owner: 'attacker', initiative: 4 },
        ],
        'defender',
      ),
    ).toEqual([['d'], ['b', 'c'], ['a']]);
  });
});
