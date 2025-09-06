import { describe, it, expect, beforeEach } from 'vitest';
import { ECONOMY } from '../../shared/economy';
import { setEconomyModifiers } from '../game/economy';
import { getFrame, makeShip } from '../game';
import type { Part } from '../../shared/parts';
import type { Ship } from '../../shared/types';
import type { FrameId } from '../game';
import type { EconMods } from '../game/economy';

// We will import the WithMods variants once implemented
import {
  canBuildInterceptor as canBuildSP,
  upgradeShipAt as upgradeSPLive,
  expandDock as expandSPLive,
} from '../game/hangar';


describe('Multiplayer Economy Isolation — Hangar', () => {
  beforeEach(() => {
    setEconomyModifiers({ credits: 1, materials: 1 });
  });

  it('Industrialists see 0.75x costs; Scientists see 1.0x for build/upgrade/dock (parameterized)', async () => {
    // Arrange
    const industrialist: EconMods = { credits: 0.75, materials: 0.75 };
    const scientist: EconMods = { credits: 1, materials: 1 };

    const resources = { credits: 999, materials: 999 };
    const capacity = { cap: 12 };
    const tonnageUsed = 0;

    // Build costs — base
    const baseBuild = ECONOMY.buildInterceptor;
    const expectedBuildInd = {
      c: Math.max(1, Math.floor(baseBuild.credits * industrialist.credits)),
      m: Math.max(1, Math.floor(baseBuild.materials * industrialist.materials)),
    };
    const expectedBuildSci = {
      c: baseBuild.credits,
      m: baseBuild.materials,
    };

    // Upgrade setup — build an interceptor eligible for upgrade
    const frameId: FrameId = 'interceptor';
    const interceptor = makeShip(getFrame(frameId), []) as unknown as Ship;
    const fleet: Ship[] = [interceptor];
    const blueprints: Record<FrameId, Part[]> = { interceptor: [], cruiser: [], dread: [] };
    const baseUp = ECONOMY.upgradeCosts.interceptorToCruiser;
    const expectedUpInd = {
      c: Math.max(1, Math.floor(baseUp.credits * industrialist.credits)),
      m: Math.max(1, Math.floor(baseUp.materials * industrialist.materials)),
    };
    const expectedUpSci = { c: baseUp.credits, m: baseUp.materials };

    // Dock costs — base
    const baseDock = ECONOMY.dockUpgrade;
    const expectedDockInd = {
      c: Math.max(1, Math.floor(baseDock.credits * industrialist.credits)),
      m: Math.max(1, Math.floor(baseDock.materials * industrialist.materials)),
    };
    const expectedDockSci = { c: baseDock.credits, m: baseDock.materials };

    // Act — parameterized WithMods functions
    // Note: Import lazily to avoid TS errors before implementation
    const m = await import('../game/hangar');
    const canBuildWithMods = m.canBuildInterceptorWithMods as (r:{credits:number;materials:number}, c:{cap:number}, t:number, econ:EconMods)=>{ ok:boolean; cost:{c:number;m:number} };
    const upgradeWithMods = m.upgradeShipAtWithMods as (idx:number, fleet:Ship[], bp:Record<FrameId,Part[]>, r:{credits:number;materials:number}, research:{Military:number}, c:{cap:number}, t:number, econ:EconMods)=>{ idx:number; upgraded:Ship; blueprints:Record<FrameId,Part[]>; delta:{credits:number;materials:number} }|null;
    const expandWithMods = m.expandDockWithMods as (r:{credits:number;materials:number}, c:{cap:number}, econ:EconMods)=>{ nextCap:number; delta:{credits:number;materials:number} }|null;

    // Assert — Build costs
    const chkInd = canBuildWithMods(resources, capacity, tonnageUsed, industrialist);
    expect(chkInd.cost.c).toBe(expectedBuildInd.c);
    expect(chkInd.cost.m).toBe(expectedBuildInd.m);

    const chkSci = canBuildWithMods(resources, capacity, tonnageUsed, scientist);
    expect(chkSci.cost.c).toBe(expectedBuildSci.c);
    expect(chkSci.cost.m).toBe(expectedBuildSci.m);

    // Assert — Upgrade costs (performing upgrade should apply deltas)
    const upInd = upgradeWithMods(0, fleet, blueprints, resources, { Military: 2 }, capacity, tonnageUsed, industrialist);
    expect(upInd && upInd.delta.credits).toBe(-expectedUpInd.c);
    expect(upInd && upInd.delta.materials).toBe(-expectedUpInd.m);

    const upSci = upgradeWithMods(0, fleet, blueprints, resources, { Military: 2 }, capacity, tonnageUsed, scientist);
    expect(upSci && upSci.delta.credits).toBe(-expectedUpSci.c);
    expect(upSci && upSci.delta.materials).toBe(-expectedUpSci.m);

    // Assert — Dock costs
    const dockInd = expandWithMods(resources, { cap: 6 }, industrialist);
    expect(dockInd && dockInd.delta.credits).toBe(-expectedDockInd.c);
    expect(dockInd && dockInd.delta.materials).toBe(-expectedDockInd.m);

    const dockSci = expandWithMods(resources, { cap: 6 }, scientist);
    expect(dockSci && dockSci.delta.credits).toBe(-expectedDockSci.c);
    expect(dockSci && dockSci.delta.materials).toBe(-expectedDockSci.m);
  });

  it('Single-player legacy functions remain global-state based', () => {
    // SP behavior should still use global modifiers via getEconomyModifiers()
    setEconomyModifiers({ credits: 1, materials: 1 });
    const res = { credits: 999, materials: 999 };
    const cap = { cap: 12 };
    const ton = 0;

    // Baseline (scientist-like)
    const chkBase = canBuildSP(res, cap, ton);
    expect(chkBase.cost.c).toBe(ECONOMY.buildInterceptor.credits);
    expect(chkBase.cost.m).toBe(ECONOMY.buildInterceptor.materials);

    // Switch to industrialist globally and verify SP function reflects it
    setEconomyModifiers({ credits: 0.75, materials: 0.75 });
    const chkDisc = canBuildSP(res, cap, ton);
    expect(chkDisc.cost.c).toBe(Math.max(1, Math.floor(ECONOMY.buildInterceptor.credits * 0.75)));
    expect(chkDisc.cost.m).toBe(Math.max(1, Math.floor(ECONOMY.buildInterceptor.materials * 0.75)));

    // Also quickly exercise upgrade/dock to ensure no regressions in SP
    const frameId: FrameId = 'interceptor';
    const interceptor = makeShip(getFrame(frameId), []) as unknown as Ship;
    const fleet: Ship[] = [interceptor];
    const blueprints: Record<FrameId, Part[]> = { interceptor: [], cruiser: [], dread: [] };
    const up = upgradeSPLive(0, fleet, blueprints, res, { Military: 2 } as { Military:number }, cap, ton);
    expect(up && typeof up.delta.credits).toBe('number');
    const dock = expandSPLive(res, { cap: 6 });
    expect(dock && typeof dock.delta.credits).toBe('number');
  });
});
