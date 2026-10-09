import { getFaction } from './catalog';
import { getDiscovery, type DiscoveryId } from './discoveries';
import { getShipPart, isShipPartId } from './parts';
import { researchedTechnologyIds } from './technologies';
import { continuation, emit, player, queueDecision, requireRule, uniqueId } from './rulesState';
import type { BattleState, DecisionChoice, GameEvent, GameState, ScifiProject, Seat, Ship } from './types';

/** Draws are removed from the finite deck and persisted before any player input. */
export function initializeScifiDiscoveries(state: GameState): void {
  for (const seat of state.seats) {
    if (seat.faction !== 'exfor' || seat.scifi?.exforDraftInitialized) continue;
    seat.scifi ??= {};
    seat.scifi.exforDraftInitialized = true;
    const tileIds = state.supplies.discovery.splice(0, 3);
    if (tileIds.length) queueDecision(state, {
      id: uniqueId(state, 'discovery-draft'), owner: seat.id, kind: 'discovery-draft',
      tileIds, keepCount: Math.min(2, tileIds.length),
    });
  }
}

function ledger(battle: BattleState): NonNullable<BattleState['scifi']> {
  return battle.scifi ??= { participantShips: {}, observations: {}, wreckIds: [], settled: false };
}
function sameProject(a: ScifiProject, b: ScifiProject): boolean {
  return a.kind === b.kind && a.id === b.id;
}
function eligibleProject(seat: Seat, project: ScifiProject): boolean {
  if (project.kind === 'technology') return !researchedTechnologyIds(seat).some(id => id === project.id);
  return !(seat.scifi?.copiedAncientParts ?? []).includes(project.id) &&
    !(seat.storedParts ?? []).includes(project.id) &&
    !seat.blueprints.some(blueprint => [...blueprint.parts, ...(blueprint.outsideParts ?? [])].includes(project.id));
}

/** Snapshot each actual engagement before casualties; no knowledge is learned from uninvolved fleets. */
export function observeScifiEngagement(state: GameState, battle: BattleState, pair: [string, string]): void {
  if (!state.seats.some(seat => seat.faction === 'portiids' || seat.faction === 'belters')) return;
  const saved = ledger(battle);
  for (const owner of pair) {
    const fleet = state.ships.filter(ship => ship.sectorId === battle.sectorId && ship.owner === owner);
    saved.participantShips[owner] = [...new Set([...(saved.participantShips[owner] ?? []), ...fleet.map(ship => ship.id)])];
    const seat = state.seats.find(candidate => candidate.id === owner);
    if (seat?.faction !== 'portiids') continue;
    const opponent = state.seats.find(candidate => candidate.id === pair.find(id => id !== owner));
    if (!opponent) continue;
    const opponentTypes = new Set(state.ships.filter(ship => ship.sectorId === battle.sectorId && ship.owner === opponent.id).map(ship => ship.type));
    const projects: ScifiProject[] = researchedTechnologyIds(opponent).map(id => ({ kind: 'technology', id }));
    for (const blueprint of opponent.blueprints.filter(blueprint => opponentTypes.has(blueprint.shipType))) {
      for (const id of [...blueprint.parts, ...(blueprint.outsideParts ?? [])]) {
        if (id && isShipPartId(id) && getShipPart(id).access.kind === 'ancient') projects.push({ kind: 'ancient-part', id });
      }
    }
    saved.observations[owner] ??= [];
    for (const project of projects) if (eligibleProject(seat, project) && !saved.observations[owner].some(existing => sameProject(existing, project))) saved.observations[owner].push(project);
  }
}

/** Unique ship IDs prevent duplicate payouts across sequential engagements and recovery. */
export function recordScifiWreck(battle: BattleState, ship: Ship): void {
  if (!battle.scifi) return;
  if (!battle.scifi.wreckIds.includes(ship.id)) battle.scifi.wreckIds.push(ship.id);
}

/** A factory's cube returns to its own track immediately, reducing the next income. */
export function returnFactoryPopulation(state: GameState, ship: Ship): void {
  if (!ship.factoryPopulation) return;
  const seat = player(state, ship.owner);
  requireRule(seat.populationTracks.materials > -1, 'The materials population track has no room for this factory cube.');
  seat.populationTracks.materials--;
  ship.factoryPopulation = false;
}

/** Only settle once the complete sector battle ends, including later third-party engagements. */
export function settleScifiBattle(state: GameState, battle: BattleState, events: GameEvent[]): void {
  const saved = battle.scifi;
  if (!saved || saved.settled) return;
  saved.settled = true;
  for (const owner of battle.participants) {
    const seat = state.seats.find(candidate => candidate.id === owner);
    if (!seat || seat.eliminated || !state.ships.some(ship => (saved.participantShips[owner] ?? []).includes(ship.id))) continue;
    if (seat.faction === 'belters') {
      const gained = Math.min(3, saved.wreckIds.length);
      if (gained) {
        seat.resources.materials += gained;
        emit(events, owner, `Salvaged ${gained} materials from ${saved.wreckIds.length} battle wrecks.`, 'resource');
      }
    }
    if (seat.faction === 'portiids') {
      const projects = (saved.observations[owner] ?? []).filter(project => eligibleProject(seat, project));
      if (projects.length) queueDecision(state, {
        id: uniqueId(state, 'reverse-engineering'), owner, kind: 'reverse-engineering', battleId: battle.id, projects,
      });
    }
  }
}

/** Called while the authoritative pending decision remains present. */
export function resolveScifiBattleChoice(state: GameState, seat: Seat, choice: DecisionChoice, events: GameEvent[]): boolean {
  if (choice.kind !== 'discovery-draft' && choice.kind !== 'reverse-engineering') return false;
  const decision = state.pendingDecision;
  requireRule(!!decision && decision.kind === choice.kind && decision.owner === seat.id, 'This choice does not match your pending decision.', 'WRONG_DECISION');
  if (decision!.kind === 'discovery-draft' && choice.kind === 'discovery-draft') {
    requireRule(seat.faction === 'exfor' && choice.tileIds.length === decision!.keepCount, 'Keep exactly the allowed number of discoveries.');
    const returned = [...decision!.tileIds];
    for (const id of choice.tileIds) {
      const index = returned.indexOf(id);
      requireRule(index >= 0, 'Keep only discovery tiles in this draft.');
      returned.splice(index, 1);
    }
    state.supplies.discovery.push(...returned);
    const home = state.sectors.find(sector => sector.owner === seat.id && Number(sector.tileId) === getFaction(seat.faction).homeSector);
    const queued = choice.tileIds.map(tileId => {
      const needsSector = ['place-unbuilt-ship', 'place-structure', 'place-warp-portal'].includes(getDiscovery(tileId as DiscoveryId).effect.kind);
      return { id: uniqueId(state, 'discovery'), owner: seat.id, kind: 'discovery' as const, tileId,
        ...(home ? {sectorId: home.id} : {}), options: needsSector && !home ? ['keep' as const] : ['keep' as const, 'use' as const] };
    });
    // Resolve retained rewards before another player's setup draft.
    continuation(state).decisions.unshift(...queued);
    events.push({type:'decision',seatId:seat.id,visibility:{seatId:seat.id},message:`Kept discoveries: ${choice.tileIds.join(', ')}.`});
    emit(events,seat.id,`Selected ${choice.tileIds.length} starting discoveries.`,'decision');
  }
  if (decision!.kind === 'reverse-engineering' && choice.kind === 'reverse-engineering') {
    requireRule(seat.faction === 'portiids', 'Only Portiids may select a reverse-engineering project.');
    if (choice.project) {
      requireRule(decision!.projects.some(project => sameProject(project, choice.project!)) && eligibleProject(seat, choice.project), 'Choose one eligible observed project.');
      seat.scifi ??= {};
      seat.scifi.reverseEngineeringProject = {...choice.project};
      emit(events,seat.id,`Recorded ${choice.project.id} for reverse engineering.`,'decision');
    } else emit(events,seat.id,'Kept the existing reverse-engineering project.','decision');
  }
  state.pendingDecision = null;
  return true;
}
