import { gameRules } from './gameRules';
import { upkeepDecisionForSeat, upkeepSeatUnfinished } from './upkeep';
import { discoveryAt } from './actions';
import { eligibleDiplomacyPartners } from './decisions';
import { factionHasCapability, getFaction, SETUP_BY_PLAYER_COUNT, type PlayerCount } from './catalog';
import { deriveBlueprintStats } from './blueprints';
import { isShipPartId } from './parts';
import { dieHits, riftDieOutcome, allocateRiftBackfire, type DieFace } from './combat';
import { randomInt } from './random';
import { calculateScore, type ScoreBreakdown } from './scoring';
import { getTechnology, type TechnologyId } from './technologies';
import { incomeForPopulationAway } from './tracks';
import { abandonSector, continuation, emit, enqueueCubeReturn, hasTech, player, presentNextDecision, queueDecision, requireRule, requireSectorDefinition, uniqueId, upkeepBalance } from './rulesState';
import type { DecisionChoice, GameEvent, GameState, PendingDecision, Resource, Seat, Sector, Ship } from './types';

const RESOURCES: readonly Resource[] = ['money', 'science', 'materials'];
function done(state: GameState, key: string): boolean { return continuation(state).aftermathDone?.includes(key) ?? false; }
function mark(state: GameState, key: string): void { const e = continuation(state); e.aftermathDone ??= []; e.aftermathDone.push(key); }
function living(state: GameState): Seat[] { return state.seats.filter(seat => !seat.eliminated); }
function orderedSectors(state: GameState): Sector[] { return [...state.sectors].sort((a, b) => Number(b.tileId) - Number(a.tileId)); }
function occupant(state: GameState, sector: Sector): Seat | undefined {
  return living(state).find(seat => state.ships.some(ship => ship.sectorId === sector.id && ship.owner === seat.id));
}
export function scoreSeat(state: GameState, seat: Seat): ScoreBreakdown {
  const hidden = state.privateSeats.find(privateSeat => privateSeat.seatId === seat.id);
  return calculateScore({ playerId: seat.id, faction: seat.faction, reputation: hidden?.reputation ?? [], ambassadors: seat.ambassadors.length,
    sectors: state.sectors.filter(sector => sector.owner === seat.id).map(sector => ({ id: sector.id, printedVp: requireSectorDefinition(Number(sector.tileId)).victoryPoints, monoliths: Number(sector.monolith), portalVp: sector.portalVp ?? 0, orbitalPopulated: sector.orbital && sector.population.some(cube => cube.squareId === 'orbital') })),
    discoveriesKeptForVp: hidden?.discoveriesKept.length ?? 0, traitor: seat.traitor,
    researchTracks: [seat.technologies.military.length, seat.technologies.grid.length, seat.technologies.nano.length],
    ancientsOnBoard: state.ships.filter(ship => ship.type === 'ancient').length,
    minorSpecies: seat.minorSpecies, ancientPartsUsed: seat.ancientPartsUsed,
    variantVp: (state.lessRandom?.explorationJokers[seat.id] ? 2 : 0) + (seat.developments?.some(development => development.id === 'quantum-labs' && development.technologyId) ? 1 : 0) + (seat.discoveryBonuses ?? []).reduce((sum, bonus) => sum + (bonus === 'artifacts' ? state.sectors.filter(sector => sector.owner === seat.id).reduce((count, sector) => count + requireSectorDefinition(Number(sector.tileId)).artifacts, 0) : Math.floor((state.lessRandom?.reputationBySeat[seat.id] ?? hidden?.reputation ?? []).reduce((total, value) => total + value, 0) / 3)), 0),
    resources: seat.resources });
}
function eliminate(state: GameState, seat: Seat, events: GameEvent[]): void {
  if (seat.eliminated) return;
  const e = continuation(state); e.scores ??= []; e.scores.push(scoreSeat(state, seat));
  seat.eliminated = true; seat.passed = true;
  state.ships = state.ships.filter(ship => ship.owner !== seat.id);
  for (const sector of state.sectors.filter(sector => sector.owner === seat.id)) { sector.owner = null; sector.population = []; }
  for (const other of living(state)) {
    if (other.ambassadors.includes(seat.id)) {
      other.ambassadors = other.ambassadors.filter(id => id !== seat.id);
      other.ambassadorResources = (other.ambassadorResources ?? []).filter(cube => cube.from !== seat.id);
      enqueueCubeReturn(state, other.id, [...RESOURCES]);
    }
  }
  seat.ambassadors = []; seat.ambassadorResources = []; seat.graveyard = { money: 0, science: 0, materials: 0 };
  emit(events, seat.id, 'Civilization eliminated; its score is preserved.', 'score');
}
function destroyPopulation(state: GameState, sector: Sector, squareIds: readonly string[]): void {
  const owner = sector.owner; requireRule(owner !== null, 'Population has no owner.');
  const definition = requireSectorDefinition(Number(sector.tileId));
  for (const id of squareIds) {
    const cube = sector.population.find(population => population.squareId === id);
    requireRule(!!cube, 'Choose an occupied population square.');
    const square = definition.population[Number(id.slice(1))];
    const choices: Resource[] = id === 'orbital' ? ['money', 'science'] : square?.resource === 'gray' ? [...RESOURCES] : [cube!.resource];
    enqueueCubeReturn(state, owner!, choices, 'graveyard');
  }
  sector.population = sector.population.filter(cube => !squareIds.includes(cube.squareId));
}
function bombardmentDamage(state: GameState, seat: Seat, ships: Ship[], events: GameEvent[]): number {
  let hits = 0, backfire = 0;
  const riftTargets: {id: string; hp: number; size: number}[] = [];
  const sizes: Record<Ship["type"], number> = {interceptor:1,ancient:1,starbase:2,cruiser:3,guardian:3,dreadnought:4,gcds:5};
  for (const ship of ships) {
    const blueprint = seat.blueprints.find(item => item.shipType === ship.type); requireRule(!!blueprint, 'Ship blueprint missing.');
    const parts = blueprint!.parts.map(id => { requireRule(id === null || isShipPartId(id), 'Unknown ship part.'); return id; });
    const outsideParts = (blueprint!.outsideParts ?? []).map(id => { requireRule(isShipPartId(id), 'Unknown outside ship part.'); return id; });
    const stats = deriveBlueprintStats(seat.faction, { shipType: blueprint!.shipType, parts, outsideParts });
    if (stats.weapons.some(w => w.color === 'magenta')) riftTargets.push({id:ship.id,hp:stats.hull+1-ship.damage,size:sizes[ship.type]});
    for (const weapon of stats.weapons.filter(weapon => weapon.kind === 'cannon')) for (let die = 0; die < weapon.dice; die++) {
      const roll = randomInt(state.random, 6); state.random = roll.state;
      const face = (roll.value + 1) as DieFace;
      if (weapon.color === 'magenta') {
        const outcome = riftDieOutcome(face); hits += outcome.damage; backfire += outcome.backfire;
        emit(events, seat.id, `Population attack: Rift die dealt ${outcome.damage} damage and ${outcome.backfire} backfire.`, 'combat');
        continue;
      }
      if (dieHits(face, stats.computer, 0)) hits += weapon.damage;
      emit(events, seat.id, `Population attack: ${weapon.color} die rolled ${face === 1 ? 'blank' : face === 6 ? 'burst' : face}.`, 'combat');
    }
  }
  for (const hit of allocateRiftBackfire(riftTargets, backfire)) {
    const ship = state.ships.find(s => s.id === hit.targetId)!;
    const destroyed = hit.damage >= riftTargets.find(t => t.id === ship.id)!.hp;
    ship.damage += hit.damage;
    if (destroyed) state.ships = state.ships.filter(s => s.id !== ship.id);
    emit(events, seat.id, `${ship.type} ${ship.id} ${destroyed ? 'destroyed by' : 'takes '+hit.damage+' damage from'} Rift backfire during population attack.`, 'combat');
  }
  return hits;
}
function aftermath(state: GameState, events: GameEvent[]): void {
  const e = continuation(state); e.aftermath ??= 'bombardment';
  if (e.aftermath === 'bombardment') {
    for (const sector of orderedSectors(state)) {
      const key = `bombardment:${sector.id}`; if (done(state, key)) continue; mark(state, key);
      const attacker = occupant(state, sector);
      if (!attacker || !sector.owner || sector.owner === attacker.id || !sector.population.length) continue;
      if (factionHasCapability(player(state, sector.owner).faction, 'destroyed-population-when-occupied')) {
        destroyPopulation(state, sector, sector.population.map(cube => cube.squareId));
        emit(events, attacker.id, `${getFaction(player(state, sector.owner).faction).name} population destroyed by occupying opponent ships.`, 'combat');
      } else {
        const hits = hasTech(attacker, 'neutron-bombs') && !hasTech(player(state, sector.owner), 'neutron-absorber') ? sector.population.length : bombardmentDamage(state, attacker, state.ships.filter(ship => ship.owner === attacker.id && ship.sectorId === sector.id), events);
        if (hits > 0) queueDecision(state, { id: uniqueId(state, 'bombardment'), owner: attacker.id, kind: 'bombardment', sectorId: sector.id, hits, squareIds: sector.population.map(cube => cube.squareId) });
      }
      if (presentNextDecision(state)) return;
    }
    e.aftermath = 'control';
  }
  if (e.aftermath === 'control') {
    for (const sector of orderedSectors(state)) {
      const key = `control:${sector.id}`; if (done(state, key)) continue; mark(state, key);
      const seat = occupant(state, sector); if (!seat) continue;
      if (sector.owner && sector.owner !== seat.id && sector.population.length === 0) { player(state, sector.owner).influenceOnTrack++; sector.owner = null; }
      if (sector.owner === null && seat.influenceOnTrack > 0) queueDecision(state, { id: uniqueId(state, 'control'), owner: seat.id, kind: 'control', sectorId: sector.id });
      if (presentNextDecision(state)) return;
    }
    e.aftermath = 'discovery';
  }
  if (e.aftermath === 'discovery') {
    for (const sector of orderedSectors(state)) {
      const key = `discovery:${sector.id}`; if (done(state, key)) continue; mark(state, key);
      if (!sector.discovery || state.ships.some(ship => ship.sectorId === sector.id && ['ancient', 'guardian', 'gcds'].includes(ship.type))) continue;
      const seat = occupant(state, sector) ?? (sector.owner ? player(state, sector.owner) : undefined);
      if (!seat) continue;
      if (gameRules(state).publicDiscoveries) {
        discoveryAt(state, seat, sector);
        if (presentNextDecision(state)) return;
        continue;
      }
      const tile = e.sectorDiscoveries.find(discovery => discovery.sectorId === sector.id);
      if (tile) {
        sector.discovery = false;
        e.sectorDiscoveries = e.sectorDiscoveries.filter(discovery => discovery.sectorId !== sector.id);
        queueDecision(state, { id: uniqueId(state, 'discovery'), owner: seat.id, kind: 'discovery', tileId: tile.discoveryId, sectorId: sector.id, options: ['keep', 'use'] });
      }
      if (presentNextDecision(state)) return;
    }
    e.aftermath = 'done';
  }
  for (const ship of state.ships) ship.damage = 0;
  for (const seat of living(state)) if (!state.ships.some(ship => ship.owner === seat.id) && !state.sectors.some(sector => sector.owner === seat.id)) eliminate(state, seat, events);
  if (presentNextDecision(state)) return;
  if (state.seats.length >= 4) {
    const finished = e.diplomacyDone ??= [];
    for (const seat of living(state)) {
      if (finished.includes(seat.id)) continue;
      const eligibleSeatIds = eligibleDiplomacyPartners(state, seat, true);
      if (!eligibleSeatIds.length) { finished.push(seat.id); continue; }
      queueDecision(state, {id: uniqueId(state, 'diplomacy-window'), kind: 'diplomacy-window', owner: seat.id, eligibleSeatIds, declinedSeatIds: (e.diplomacyDeclined ?? []).filter(pair => pair.proposer === seat.id).map(pair => pair.offeree), populationSources: (['money','science','materials'] as const).filter(resource => seat.populationTracks[resource] < 11)});
      presentNextDecision(state); return;
    }
  }
  state.phase = 'upkeep'; e.upkeepDone = []; state.activeSeatId = living(state)[0]?.id ?? null;
  emit(events, null, 'Upkeep: use remaining colony ships or trade, then confirm income and upkeep.', 'phase');
}
function finishGame(state: GameState, events: GameEvent[]): void {
  const e = continuation(state);
  e.scores = [...(e.scores ?? []).filter(score => player(state, score.playerId).eliminated), ...living(state).map(seat => scoreSeat(state, seat))];
  state.phase = 'finished'; state.activeSeatId = null;
  emit(events, null, `The ${state.round}th round is complete. Final scoring is ready.`, 'score');
}
function cleanup(state: GameState, events: GameEvent[]): void {
  if (state.round >= gameRules(state).roundLimit || living(state).length === 0) { finishGame(state, events); return; }
  const e = continuation(state);
  if (!done(state, 'cleanup')) {
    mark(state, 'cleanup');
    let regular = 0; const quota = SETUP_BY_PLAYER_COUNT[state.seats.length as PlayerCount].cleanupRegularTechs;
    while (regular < quota && state.supplies.technology.length) {
      const id = state.supplies.technology.shift()!; state.technologyMarket.push(id);
      if (getTechnology(id as TechnologyId).track !== 'rare') regular++;
    }
    for (const seat of living(state)) {
      for (const action of Object.keys(seat.actionDiscs) as (keyof Seat['actionDiscs'])[]) { seat.influenceOnTrack += seat.actionDiscs[action]; seat.actionDiscs[action] = 0; }
      for (const resource of RESOURCES) {
        const count = seat.graveyard?.[resource] ?? 0;
        if (seat.graveyard) seat.graveyard[resource] = 0;
        for (let cube = 0; cube < count; cube++) enqueueCubeReturn(state, seat.id, [resource]);
      }
      seat.colonyShipsAvailable = getFaction(seat.faction).colonyShips + (hasTech(seat, 'advanced-colony-ships') ? 1 : 0); seat.passed = false;
    }
  }
  if (presentNextDecision(state)) return;
  if (gameRules(state).passOrderTurnOrder) {
    const livingIds = new Set(living(state).map(seat => seat.id));
    state.turnOrder = [
      ...(state.passOrder ?? []).filter(id => livingIds.delete(id)),
      ...living(state).filter(seat => livingIds.has(seat.id)).map(seat => seat.id),
    ];
  }
  state.startSeatId = living(state).some(seat => seat.id === state.firstPasser) ? state.firstPasser! : living(state).some(seat => seat.id === state.startSeatId) ? state.startSeatId : living(state)[0].id;
  state.activeSeatId = state.startSeatId; state.firstPasser = null; state.passOrder = []; state.round++; state.phase = 'action';
  e.action = null; e.aftermath = undefined; e.aftermathDone = []; e.upkeepDone = []; e.diplomacyDone = []; e.diplomacyDeclined = []; e.battleSectors = []; e.battle = null; e.combatInitialized = false;
  if (gameRules(state).explorationRules && state.lessRandom) state.lessRandom.outerPlacementsThisRound = Object.fromEntries(living(state).map(seat => [seat.id, 0]));
  emit(events, null, `Round ${state.round}: action phase.`, 'phase');
}
/** Called after every resolved decision; never consumes a outstanding player choice. */
export function advanceRound(state: GameState, events: GameEvent[]): void {
  if (state.phase === 'upkeep') {
    const e = continuation(state);
    const remaining = living(state).filter(seat => !e.upkeepDone.includes(seat.id));
    state.activeSeatId = remaining[0]?.id ?? null;
    // An abandoned sector's cube returns must finish before recalculating that
    // seat's income; another civilization's choices never block its payment.
    const ready = remaining.find(seat => done(state, `upkeep-payment:${seat.id}`) && !upkeepDecisionForSeat(state, seat.id));
    if (ready) { finishUpkeep(state, ready.id, events); return; }
    if (!remaining.length && !state.pendingDecision && !e.decisions.length) {
      state.phase = 'cleanup'; cleanup(state, events); return;
    }
    presentNextDecision(state);
    return;
  }
  if (state.pendingDecision || presentNextDecision(state)) return;
  if (state.phase === 'combat') {
    aftermath(state, events);
    if (!state.pendingDecision) advanceRound(state, events);
    return;
  }
  if (state.phase === 'cleanup') cleanup(state, events);
}
export function finishUpkeep(state: GameState, seatId: string, events: GameEvent[]): void {
  const seat = player(state, seatId); const e = continuation(state);
  requireRule(upkeepSeatUnfinished(state, seatId), 'Wait for your uncompleted upkeep.');
  requireRule(!upkeepDecisionForSeat(state, seatId), 'Resolve the outstanding upkeep choice.');
  const balance = upkeepBalance(seat);
  if (balance < 0) {
    if (!done(state, `upkeep-payment:${seatId}`)) mark(state, `upkeep-payment:${seatId}`);
    const sectors = state.sectors.filter(sector => sector.owner === seatId).map(sector => sector.id);
    const ratio = getFaction(seat.faction).tradeRatio;
    const canTrade = Math.floor(seat.resources.materials / ratio) + Math.floor(seat.resources.science / ratio);
    if (!sectors.length && canTrade < -balance) { eliminate(state, seat, events); advanceRound(state, events); return; }
    queueDecision(state, { id: uniqueId(state, 'bankruptcy'), owner: seatId, kind: 'bankruptcy', shortfall: -balance, abandonableSectorIds: sectors }); presentNextDecision(state); return;
  }
  seat.resources.money = balance;
  seat.resources.materials += incomeForPopulationAway(seat.populationTracks.materials);
  seat.resources.science += incomeForPopulationAway(seat.populationTracks.science);
  e.upkeepDone.push(seatId);
  emit(events, seatId, 'Income and upkeep paid; materials and science produced.', 'resource');
  advanceRound(state, events);
}
export function resolveAftermathChoice(state: GameState, actor: string, decision: PendingDecision, choice: DecisionChoice, events: GameEvent[]): void {
  requireRule(decision.owner === actor, 'This choice belongs to another player.');
  if (decision.kind === 'bombardment' && choice.kind === 'bombardment') {
    requireRule(state.phase === 'combat' && new Set(choice.squareIds).size === choice.squareIds.length && choice.squareIds.length <= decision.hits && choice.squareIds.every(id => decision.squareIds.includes(id)), 'Choose at most one occupied square per damage.');
    const sector = state.sectors.find(sector => sector.id === decision.sectorId); requireRule(!!sector, 'Population sector is missing.');
    destroyPopulation(state, sector!, choice.squareIds);
    emit(events, actor, `Destroyed ${choice.squareIds.length} population cube(s).`, 'combat');
  } else if (decision.kind === 'bankruptcy' && choice.kind === 'bankruptcy') {
    requireRule(state.phase === 'upkeep' && upkeepBalance(player(state, actor)) < 0, 'The civilization is no longer bankrupt.');
    const sector = state.sectors.find(sector => sector.id === choice.abandonSectorId);
    requireRule(!!sector && sector.owner === actor && decision.abandonableSectorIds.includes(sector.id), 'Choose a sector you control to abandon.');
    abandonSector(state, sector!); emit(events, actor, 'Abandoned a sector to reduce upkeep.', 'resource');
  } else requireRule(false, 'The response does not match this aftermath decision.');
}
