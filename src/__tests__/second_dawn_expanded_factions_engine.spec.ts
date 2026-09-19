import { describe, expect, it } from 'vitest';
import {
  BASE_FACTIONS,
  EXPANDED_CATALOG_VERSION,
  EXPANDED_RULES_VERSION,
  getFaction,
  listFactions,
  profileVersions,
  reputationDrawMoney,
  tradeQuote,
  type CivilizationColor,
  type FactionId,
} from '../../shared/eclipse/catalog';
import { tradeResources } from '../../shared/eclipse/economy';
import { processGameCommand } from '../../shared/eclipse/engine';
import { legalCommands } from '../../shared/eclipse/legal';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { calculateScore } from '../../shared/eclipse/scoring';
import { createGame } from '../../shared/eclipse/setup';
import { researchTechnology } from '../../shared/eclipse/actions';
import { adjacentPosition } from '../../shared/eclipse/geometry';
import { chooseAiCommand } from '../../shared/eclipse/ai';
import { advanceCombat } from '../../shared/eclipse/battleEngine';

const expanded = () => createGame({
  seed: 20260919,
  factionProfile: 'expanded-v1',
  warpPortals: false,
  seats: [
    { id: 'rho', faction: 'rho-indi', controller: 'human', pieceColor: 'black' },
    { id: 'magellan', faction: 'magellan', controller: 'human', pieceColor: 'blue' },
    { id: 'midas', faction: 'midas', controller: 'human', pieceColor: 'yellow' },
    { id: 'ragnarok', faction: 'ragnarok', controller: 'human', pieceColor: 'red' },
  ],
});

describe('expanded-v1 faction engine', () => {
  it('pins the expanded profile while an omitted profile remains the legacy base roster', () => {
    expect(BASE_FACTIONS).toHaveLength(12);
    expect(listFactions()).toHaveLength(16);
    expect(listFactions('base')).toEqual(BASE_FACTIONS);
    expect(profileVersions('expanded-v1')).toEqual({
      rulesVersion: EXPANDED_RULES_VERSION,
      catalogVersion: EXPANDED_CATALOG_VERSION,
    });
    expect(() => createGame({
      seed: 1,
      warpPortals: false,
      seats: [
        { id: 'a', faction: 'midas', controller: 'human' },
        { id: 'b', faction: 'hydran', controller: 'human' },
      ],
    })).toThrow(/physical faction colors/);
    expect(() => createGame({
      seed: 1, factionProfile: 'expanded-v1', warpPortals: false,
      seats: [
        { id: 'a', faction: 'midas', controller: 'human', pieceColor: 'red' },
        { id: 'b', faction: 'midas', controller: 'human', pieceColor: 'blue' },
      ],
    })).toThrow(/physical faction colors/);
  });

  it('transcribes all four home setups, supplies and altered blueprints', () => {
    const state = expanded();
    expect(state).toMatchObject({
      factionProfile: 'expanded-v1',
      rulesVersion: EXPANDED_RULES_VERSION,
      catalogVersion: EXPANDED_CATALOG_VERSION,
    });
    expect(state.ships.filter(ship => ship.owner === 'rho').map(ship => ship.type)).toEqual([
      'interceptor', 'interceptor',
    ]);
    expect(state.ships.find(ship => ship.owner === 'ragnarok')?.type).toBe('cruiser');
    expect(state.privateSeats.find(seat => seat.seatId === 'magellan')?.storedDiscovery).toBeTruthy();
    expect(getPlayerView(state, 'magellan')!.private.storedDiscovery).toBeUndefined();
    expect(state.sectors.filter(sector => sector.owner).map(sector => Number(sector.tileId))).toEqual([
      236, 233, 277, 299,
    ]);
    expect(state.sectors.find(sector => sector.owner === 'midas')?.population).toEqual([
      { squareId: 'p1', resource: 'money' },
    ]);
    expect(state.sectors.find(sector => sector.owner === 'rho')?.population).toEqual([
      { squareId: 'p1', resource: 'money' }, { squareId: 'p3', resource: 'materials' },
    ]);
    expect(state.sectors.find(sector => sector.owner === 'magellan')?.population).toEqual([
      { squareId: 'p0', resource: 'materials' },
    ]);
    expect(getFaction('rho-indi').componentSupply?.dreadnought).toBe(0);
    expect(getFaction('rho-indi').blueprints.interceptor).toMatchObject({
      preprinted: ['ion-cannon', 'nuclear-source', 'nuclear-drive', null],
      permanent: { initiative: 3, shield: 1 },
    });
    expect(getFaction('ragnarok').blueprints).toMatchObject({
      interceptor: { preprinted: ['ion-cannon', 'nuclear-source', 'nuclear-drive', null, 'hull'], permanent: { initiative: 1 } },
      cruiser: { preprinted: ['electron-computer', 'ion-cannon', 'nuclear-source', 'nuclear-drive', null], permanent: { energyProduction: 1, initiative: 2 } },
    });
  });

  it('quotes and executes directional and amended trade without changing base rates', () => {
    expect(tradeQuote('rho-indi', 'money', 'science', 1)).toBeNull();
    expect(tradeQuote('rho-indi', 'money', 'science', 2)).toEqual({ input: 3, output: 2 });
    expect(tradeQuote('magellan', 'materials', 'money', 1)).toEqual({ input: 2, output: 1 });
    expect(tradeQuote('magellan', 'materials', 'money', 2)).toEqual({ input: 3, output: 2 });
    expect(tradeQuote('hydran', 'money', 'science', 2)).toEqual({ input: 6, output: 2 });
    expect(tradeResources({ money: 3, science: 0, materials: 0 }, 'rho-indi', 'money', 'science', 2)).toEqual({
      ok: true,
      resources: { money: 0, science: 2, materials: 0 },
    });
    expect(reputationDrawMoney('rho-indi', 1)).toBe(0);
    expect(reputationDrawMoney('rho-indi', 5)).toBe(4);
    expect(reputationDrawMoney('hydran', 5)).toBe(0);
  });

  it('keeps Magellan setup discovery private, converts colony ships, and triggers it once at a fourth tech', () => {
    const state = expanded();
    state.activeSeatId = 'magellan';
    const converted = processGameCommand(state, 'magellan', { type: 'convert-colony-ship', resource: 'science' });
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    expect(converted.state.seats.find(seat => seat.id === 'magellan')).toMatchObject({
      colonyShipsAvailable: 2,
      resources: { science: 3 },
    });
    const seat = converted.state.seats.find(candidate => candidate.id === 'magellan')!;
    seat.technologies.grid = ['fusion-source', 'gauss-shield', 'improved-hull'];
    converted.state.technologyMarket.push('positron-computer');
    researchTechnology(converted.state, seat, 'positron-computer', 'grid', true);
    expect(converted.state.privateSeats.find(candidate => candidate.seatId === 'magellan')?.storedDiscoveryResolved).toBe(true);
    expect(converted.state.engine?.decisions.filter(decision => decision.kind === 'discovery')).toHaveLength(1);
    converted.state.technologyMarket.push('advanced-economy');
    researchTechnology(converted.state, seat, 'advanced-economy', 'grid', true);
    expect(converted.state.engine?.decisions.filter(decision => decision.kind === 'discovery')).toHaveLength(1);

    const bankrupt = expanded();
    bankrupt.phase = 'upkeep';
    bankrupt.activeSeatId = 'magellan';
    const bankruptSeat = bankrupt.seats.find(candidate => candidate.id === 'magellan')!;
    bankruptSeat.resources.money = 0;
    bankruptSeat.influenceOnTrack = 0;
    bankrupt.pendingDecision = { id: 'debt', owner: 'magellan', kind: 'bankruptcy', shortfall: 20, abandonableSectorIds: [] };
    expect(legalCommands(getPlayerView(bankrupt, 'magellan')!).some(candidate => candidate.command.type === 'convert-colony-ship')).toBe(true);
    expect(processGameCommand(bankrupt, 'magellan', { type: 'convert-colony-ship', resource: 'science' }).ok).toBe(true);
  });

  it('scores Magellan used ancient parts and removes the Rho traitor penalty', () => {
    const common = {
      playerId: 'x', reputation: [], ambassadors: 0, sectors: [], discoveriesKeptForVp: 0,
      researchTracks: [0, 0, 0] as [number, number, number], ancientsOnBoard: 0,
      resources: { money: 0, science: 0, materials: 0 },
    };
    expect(calculateScore({ ...common, faction: 'magellan', traitor: false, ancientPartsUsed: 2 }).species).toBe(2);
    expect(calculateScore({ ...common, faction: 'rho-indi', traitor: true }).traitor).toBe(0);
    expect(calculateScore({ ...common, faction: 'hydran', traitor: true }).traitor).toBe(-2);
    const state = expanded();
    state.activeSeatId = 'magellan';
    state.pendingDecision = {
      id: 'magellan-part', owner: 'magellan', kind: 'discovery', tileId: 'ion-disruptor', options: ['use'],
      sectorId: state.sectors.find(sector => sector.owner === 'magellan')!.id,
    };
    const used = processGameCommand(state, 'magellan', {
      type: 'resolve', decisionId: 'magellan-part', choice: { kind: 'discovery', option: 'use' },
    });
    expect(used.ok).toBe(true);
    if (used.ok) {
      expect(used.state.seats.find(seat => seat.id === 'magellan')?.ancientPartsUsed).toBe(1);
      expect(used.state.pendingDecision?.kind).toBe('ancient-part');
    }
  });

  it('awards Rho money from the actual post-combat reputation draw', () => {
    const state = expanded();
    state.phase = 'combat';
    state.activeSeatId = null;
    const battleSector = state.sectors.find(sector => sector.owner === 'rho')!.id;
    state.ships = [
      { id: 'rho-fighter', owner: 'rho', type: 'interceptor', sectorId: battleSector, damage: 0, arrival: 1 },
      { id: 'magellan-fighter', owner: 'magellan', type: 'interceptor', sectorId: battleSector, damage: 0, arrival: 2 },
    ];
    state.engine!.battle = null;
    state.engine!.battleSectors = [];
    state.engine!.combatInitialized = false;
    advanceCombat(state, []);
    const battle = state.engine!.battle!;
    battle.kills = Array.from({ length: 4 }, () => ({ owner: 'rho', value: 3 }));
    state.ships = state.ships.filter(ship => ship.owner === 'rho');
    state.pendingDecision = null;
    const before = state.seats.find(seat => seat.id === 'rho')!.resources.money;
    advanceCombat(state, []);
    const drawn = state.privateSeats.find(seat => seat.seatId === 'rho')!.reputationSummary!.drawn.length;
    expect(drawn).toBeGreaterThan(1);
    expect(state.seats.find(seat => seat.id === 'rho')!.resources.money).toBe(before + drawn - 1);
  });

  it('keeps Midas open at zero until its once-per-action paid activation is bought or declined', () => {
    let state = expanded();
    state.activeSeatId = 'midas';
    const seat = state.seats.find(candidate => candidate.id === 'midas')!;
    seat.resources.materials = 20;
    seat.resources.money = 20;
    seat.influenceOnTrack = 7;
    const home = state.sectors.find(sector => sector.owner === 'midas')!.id;
    for (let i = 0; i < 2; i++) {
      const result = processGameCommand(state, 'midas', {
        type: 'build', builds: [{ sectorId: home, component: 'interceptor' }],
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      state = result.state;
    }
    expect(state.engine?.action).toMatchObject({ owner: 'midas', action: 'build', remaining: 0 });
    expect(legalCommands(getPlayerView(state, 'midas')!).map(candidate => candidate.command)).toContainEqual({
      type: 'buy-activation', action: 'build',
    });
    const bought = processGameCommand(state, 'midas', { type: 'buy-activation', action: 'build' });
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    expect(bought.state.seats.find(candidate => candidate.id === 'midas')?.resources.money).toBe(18);
    expect(bought.state.engine?.action).toMatchObject({ remaining: 1, paidBonusUsed: true });
  });

  it('tracks Ragnarok Build and Move budgets independently and permits either legal sequence', () => {
    let state = expanded();
    state.activeSeatId = 'ragnarok';
    state.seats.find(seat => seat.id === 'ragnarok')!.resources.materials = 20;
    state.seats.find(seat => seat.id === 'ragnarok')!.technologies.nano.push('wormhole-generator');
    const ragnarokHome = state.sectors.find(sector => sector.owner === 'ragnarok')!;
    state.sectors.find(sector => sector.tileId === '001')!.position = adjacentPosition(ragnarokHome.position, 0);
    const view = getPlayerView(state, 'ragnarok')!;
    const build = legalCommands(view).find(candidate => candidate.command.type === 'build')!.command;
    const built = processGameCommand(state, 'ragnarok', build);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    state = built.state;
    expect(state.engine?.action).toMatchObject({
      owner: 'ragnarok', action: 'build', remaining: 2, budgets: { build: 1, move: 1 },
    });
    const move = legalCommands(getPlayerView(state, 'ragnarok')!).find(candidate => candidate.command.type === 'move')?.command;
    expect(move).toBeTruthy();
    const moved = processGameCommand(state, 'ragnarok', move!);
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.state.engine?.action).toMatchObject({ remaining: 1, budgets: { build: 1, move: 0 } });
  });

  it('adds primary-action activation technologies to the matching Ragnarok budget only', () => {
    const state = expanded();
    state.activeSeatId = 'ragnarok';
    const seat = state.seats.find(candidate => candidate.id === 'ragnarok')!;
    seat.technologies.nano.push('improved-logistics', 'wormhole-generator');
    seat.resources.materials = 20;
    const ragnarokHome = state.sectors.find(sector => sector.owner === 'ragnarok')!;
    state.sectors.find(sector => sector.tileId === '001')!.position = adjacentPosition(ragnarokHome.position, 0);
    const move = legalCommands(getPlayerView(state, 'ragnarok')!).find(candidate => candidate.command.type === 'move')?.command;
    expect(move).toBeTruthy();
    const moved = processGameCommand(state, 'ragnarok', move!);
    expect(moved.ok).toBe(true);
    if (moved.ok)
      expect(moved.state.engine?.action).toMatchObject({ budgets: { move: 2, build: 1 }, remaining: 3 });
  });

  it('keeps a Ragnarok Build budget open when an exact free trade can fund it', () => {
    const state = expanded();
    state.activeSeatId = 'ragnarok';
    const seat = state.seats.find(candidate => candidate.id === 'ragnarok')!;
    seat.technologies.nano.push('wormhole-generator');
    seat.resources = { materials: 0, science: 0, money: 8 };
    const home = state.sectors.find(sector => sector.owner === 'ragnarok')!;
    state.sectors.find(sector => sector.tileId === '001')!.position = adjacentPosition(home.position, 0);
    const move = legalCommands(getPlayerView(state, 'ragnarok')!).find(candidate => candidate.command.type === 'move')!.command;
    const moved = processGameCommand(state, 'ragnarok', move);
    expect(moved.ok).toBe(true);
    if (moved.ok)
      expect(moved.state.engine?.action).toMatchObject({ budgets: { move: 1, build: 1 }, remaining: 2 });
  });

  it('replays persisted Midas, Ragnarok, and private Magellan continuations exactly', () => {
    let midas = expanded();
    midas.activeSeatId = 'midas';
    const midasSeat = midas.seats.find(seat => seat.id === 'midas')!;
    midasSeat.resources = { materials: 20, science: 3, money: 20 };
    const midasHome = midas.sectors.find(sector => sector.owner === 'midas')!.id;
    const build = { type: 'build' as const, builds: [{ sectorId: midasHome, component: 'interceptor' as const }] };
    const firstBuild = processGameCommand(midas, 'midas', build);
    expect(firstBuild.ok).toBe(true);
    if (!firstBuild.ok) return;
    midas = firstBuild.state;
    let midasReload = JSON.parse(JSON.stringify(midas)) as typeof midas;
    for (const command of [build, { type: 'buy-activation' as const, action: 'build' as const }]) {
      const live = processGameCommand(midas, 'midas', command);
      const replay = processGameCommand(midasReload, 'midas', command);
      expect(live).toEqual(replay);
      if (!live.ok || !replay.ok) return;
      midas = live.state;
      midasReload = JSON.parse(JSON.stringify(replay.state)) as typeof midas;
    }

    let ragnarok = expanded();
    ragnarok.activeSeatId = 'ragnarok';
    const ragnarokSeat = ragnarok.seats.find(seat => seat.id === 'ragnarok')!;
    ragnarokSeat.resources.materials = 20;
    ragnarokSeat.technologies.nano.push('wormhole-generator');
    const ragnarokHome = ragnarok.sectors.find(sector => sector.owner === 'ragnarok')!;
    ragnarok.sectors.find(sector => sector.tileId === '001')!.position = adjacentPosition(ragnarokHome.position, 0);
    const ragnarokBuild = legalCommands(getPlayerView(ragnarok, 'ragnarok')!).find(candidate => candidate.command.type === 'build')!.command;
    const opened = processGameCommand(ragnarok, 'ragnarok', ragnarokBuild);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    ragnarok = opened.state;
    const ragnarokReload = JSON.parse(JSON.stringify(ragnarok)) as typeof ragnarok;
    const move = legalCommands(getPlayerView(ragnarok, 'ragnarok')!).find(candidate => candidate.command.type === 'move')!.command;
    expect(processGameCommand(ragnarok, 'ragnarok', move)).toEqual(processGameCommand(ragnarokReload, 'ragnarok', move));

    const magellan = expanded();
    magellan.activeSeatId = 'magellan';
    const magellanSeat = magellan.seats.find(seat => seat.id === 'magellan')!;
    magellanSeat.resources.science = 20;
    magellanSeat.technologies.grid = ['fusion-source', 'gauss-shield', 'improved-hull'];
    magellan.technologyMarket.push('positron-computer');
    const magellanReload = JSON.parse(JSON.stringify(magellan)) as typeof magellan;
    const research = { type: 'research' as const, tileId: 'positron-computer', track: 'grid' as const };
    const liveResearch = processGameCommand(magellan, 'magellan', research);
    const replayResearch = processGameCommand(magellanReload, 'magellan', research);
    expect(liveResearch).toEqual(replayResearch);
    expect(liveResearch.ok && liveResearch.state.pendingDecision?.kind).toBe('discovery');
  });

  it.each([
    { factions: ['rho-indi', 'magellan'] },
    { factions: ['midas', 'ragnarok', 'rho-indi'] },
    { factions: ['rho-indi', 'magellan', 'midas', 'ragnarok'] },
    { factions: ['rho-indi', 'magellan', 'midas', 'ragnarok', 'hydran'] },
    { factions: ['rho-indi', 'magellan', 'midas', 'ragnarok', 'hydran', 'orion'] },
  ] as { factions: FactionId[] }[])('finishes a seeded eight-round match for $factions.length seats', ({ factions }) => {
    const colors: CivilizationColor[] = ['red', 'blue', 'green', 'yellow', 'white', 'black'];
    let state = createGame({
      seed: 9000 + factions.length,
      factionProfile: 'expanded-v1',
      warpPortals: false,
      seats: factions.map((faction, index) => ({
        id: `p${index}`, faction, controller: 'ai' as const, pieceColor: colors[index],
      })),
    });
    let commands = 0;
    while (state.phase !== 'finished' && commands < 6000) {
      const actor = state.pendingDecision?.owner ?? state.activeSeatId;
      if (!actor) throw Error(`Missing actor during ${state.phase}.`);
      const selected = chooseAiCommand(getPlayerView(state, actor), 91000 + commands);
      if (!selected) throw Error(`No AI command for ${actor} at step ${commands}.`);
      const result = processGameCommand(state, actor, selected.command);
      if (!result.ok) throw Error(`Illegal AI command ${JSON.stringify(selected.command)}: ${result.error.message}`);
      state = result.state;
      commands++;
    }
    expect(state.phase, `deadlock after ${commands} commands`).toBe('finished');
    expect(state.round).toBe(8);
    expect(state.engine?.scores).toHaveLength(factions.length);
  }, 30_000);
});
