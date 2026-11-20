import { factionHasCapability, getFaction, tradeQuote } from './catalog';
import { factionRulesMode, gameRules } from './gameRules';
import { firstPassMoney } from './passing';
import { hasEnemy, hasTech, upkeepBalance } from './rulesState';
import { sectorDefinition } from './sectors';
import { incomeForPopulationAway } from './tracks';
import type { GameCommand, PlayerView, Resource, Seat, Sector } from './types';

/** VP controlled through a sector, including visible end-game bonuses. */
export function controlPoints(seat: Seat, sector: Sector): number {
  const tile = sectorDefinition(Number(sector.tileId));
  const faction = getFaction(seat.faction);
  return (tile?.victoryPoints ?? 0) + (sector.monolith ? 3 : 0) + (sector.portalVp ?? 0)
    + Number(factionHasCapability(seat.faction, 'controlled-sector-vp'))
    + (sector.orbital && sector.population.some(cube => cube.squareId === 'orbital') ? faction.special?.populatedOrbitalVp ?? 0 : 0)
    + (seat.faction === 'lyra' ? seat.shrines?.filter(shrine => shrine.sectorId === sector.id).length ?? 0 : 0)
    + (seat.discoveryBonuses?.filter(bonus => bonus === 'artifacts').length ?? 0) * (tile?.artifacts ?? 0);
}

/** Reserve today's income for upkeep. Science and Materials income arrives after payment. */
function settleResources(view: PlayerView, seat: Seat) {
  const balance = upkeepBalance(seat);
  const spareShips = getFaction(seat.faction).special?.convertColonyShipToResource ? seat.colonyShipsAvailable : 0;
  let missing = Math.max(0, -balance - spareShips);
  let resources = balance + spareShips + seat.resources.materials + seat.resources.science
    + incomeForPopulationAway(seat.populationTracks.materials) + incomeForPopulationAway(seat.populationTracks.science);
  for (const resource of ['materials', 'science'] as const) {
    for (let received = missing; received > 0; received--) {
      const quote = tradeQuote(seat.faction, resource, 'money', received, factionRulesMode(view));
      if (quote && quote.input <= seat.resources[resource]) {
        missing -= received;
        resources -= quote.input - received;
        break;
      }
    }
  }
  return { missing, resources };
}

export function remainingUpkeepShortfall(view: PlayerView, seat: Seat): number {
  return settleResources(view, seat).missing;
}

export function finalPopulationReturnValue(seat: Seat, resources: readonly Resource[]): number {
  const tracks = { ...seat.populationTracks };
  let balance = upkeepBalance(seat);
  let value = 0;
  for (const resource of resources) {
    if (tracks[resource] <= -1) return -Infinity;
    const loss = incomeForPopulationAway(tracks[resource]) - incomeForPopulationAway(tracks[resource] - 1);
    tracks[resource]--;
    value -= loss;
    if (resource === 'money') {
      value -= (Math.max(0, loss - balance) - Math.max(0, -balance)) * 5;
      balance -= loss;
    }
  }
  return value;
}

function afterWithdrawals(seat: Seat, sectors: readonly Sector[], discCost: number): Seat {
  const projected = {
    ...seat,
    influenceOnTrack: seat.influenceOnTrack - discCost,
    populationTracks: { ...seat.populationTracks },
  };
  for (const sector of sectors) {
    projected.influenceOnTrack++;
    const tile = sectorDefinition(Number(sector.tileId));
    for (const cube of sector.population) {
      const allowed: Resource[] = cube.squareId === 'orbital' ? ['money', 'science']
        : tile?.population[Number(cube.squareId.slice(1))]?.resource === 'gray' ? ['money', 'science', 'materials']
        : [cube.resource];
      const funded = allowed.filter(resource => projected.populationTracks[resource] > -1);
      const choices = funded.length ? funded : (['money', 'science', 'materials'] as const).filter(resource => projected.populationTracks[resource] > -1);
      const resource = [...choices].sort((a, b) => finalPopulationReturnValue(projected, [b]) - finalPopulationReturnValue(projected, [a]))[0];
      if (resource) projected.populationTracks[resource]--;
    }
  }
  return projected;
}

type Influence = Extract<GameCommand, { type: 'influence' }>;
const resources: readonly Resource[] = ['money', 'science', 'materials'];

function colonyGain(view: PlayerView, seat: Seat, resource: Resource): number {
  const current = seat.populationTracks[resource];
  if (current >= 11) return -Infinity;
  if (resource !== 'money' && getFaction(seat.faction).special?.convertColonyShipToResource &&
      remainingUpkeepShortfall(view, { ...seat, colonyShipsAvailable: seat.colonyShipsAvailable - 1 }) > remainingUpkeepShortfall(view, seat))
    return -Infinity;
  const income = incomeForPopulationAway(current + 1) - incomeForPopulationAway(current);
  // Paying upkeep takes precedence over collecting today's tiebreak resources.
  return income + (resource === 'money' ? Math.min(income, Math.max(0, -upkeepBalance(seat))) * 5 : 0);
}

export function finalColonyValue(view: PlayerView, seat: Seat, placements: Extract<GameCommand, { type: 'colonize' }>['placements']): number {
  const projected = { ...seat, populationTracks: { ...seat.populationTracks } };
  let value = 0;
  for (const placement of placements) {
    value += colonyGain(view, projected, placement.resource);
    if (placement.squareId === 'orbital') value += (getFaction(seat.faction).special?.populatedOrbitalVp ?? 0) * 10;
    projected.populationTracks[placement.resource]++;
    projected.colonyShipsAvailable--;
  }
  return value;
}

function settlementForecast(view: PlayerView, seat: Seat, held: Sector[]) {
  const projected = { ...seat, populationTracks: { ...seat.populationTracks } };
  let points = held.reduce((sum, sector) => sum + controlPoints(seat, sector), 0);
  const orbitalVp = getFaction(seat.faction).special?.populatedOrbitalVp ?? 0;
  const canSettleAdvanced = {
    money: hasTech(seat, 'advanced-economy'), science: hasTech(seat, 'advanced-labs'), materials: hasTech(seat, 'advanced-mining'),
  };
  const slots: { choices: readonly Resource[]; vp: number }[] = [];
  for (const sector of held) {
    if (!seat.colonyShipsAvailable || hasEnemy(view, seat, sector.id)) continue;
    const planets = sectorDefinition(Number(sector.tileId))?.population ?? [];
    planets.forEach((planet, index) => {
      if (sector.population.some(cube => cube.squareId === `p${index}`)) return;
      const choices = resources.filter(resource => (planet.resource === resource || planet.resource === 'gray') &&
        (!planet.advanced || canSettleAdvanced[resource] || hasTech(seat, 'metasynthesis')));
      if (choices.length) slots.push({ choices, vp: 0 });
    });
    if (sector.orbital && !sector.population.some(cube => cube.squareId === 'orbital'))
      slots.push({ choices: ['money', 'science'], vp: orbitalVp });
  }
  while (projected.colonyShipsAvailable > 0 && slots.length) {
    let best: { index: number; resource: Resource; gain: number } | undefined;
    const gains = { money: colonyGain(view, projected, 'money'), materials: colonyGain(view, projected, 'materials'), science: colonyGain(view, projected, 'science') };
    for (const [index, slot] of slots.entries()) {
      for (const resource of slot.choices) {
        const gain = gains[resource] + slot.vp * 10;
        if (Number.isFinite(gain) && (!best || gain > best.gain)) best = { index, resource, gain };
      }
    }
    if (!best) break;
    points += slots.splice(best.index, 1)[0].vp;
    projected.populationTracks[best.resource]++;
    projected.colonyShipsAvailable--;
  }
  return { points, ...settleResources(view, projected) };
}

type Forecast = ReturnType<typeof settlementForecast>;

/** A feasible settlement takes precedence. Among those, VP decides before resources. */
function betterForecast(a: Forecast, b: Forecast): boolean {
  if (a.missing !== b.missing) return a.missing < b.missing;
  return a.points !== b.points ? a.points > b.points : a.resources > b.resources;
}

export function createFinalInfluenceEvaluator(view: PlayerView, seat: Seat, activationCost = 0): (command: Influence) => number {
  const controlled = view.sectors.filter(sector => sector.owner === seat.id);
  const isInfluence = view.phase === 'action' && !view.pendingDecision;
  const startsAction = isInfluence && !view.actionProgress;
  const ownFleet = view.ships.filter(ship => ship.owner === seat.id);
  const occupied = view.sectors.filter(sector => ownFleet.some(ship => ship.sectorId === sector.id) && !hasEnemy(view, seat, sector.id));
  const discoveryLimit = gameRules(view).publicDiscoveries ? view.lessRandom?.discoverySupply.length ?? 0 : Infinity;
  const availableDiscovery = (sector: Sector) => sector.discovery && discoveryLimit > 0 &&
    !view.ships.some(ship => ship.sectorId === sector.id && ['ancient', 'guardian', 'gcds'].includes(ship.type));

  // Project the same final opportunities on each branch, including the option to
  // claim a safely occupied sector after combat for just its control disc.
  function finish(projected: Seat, holdings: Sector[], removed: Sector[], discoveries: Set<string>) {
    let forecast = settlementForecast(view, projected, holdings);
    if (isInfluence) {
      for (const sector of occupied.filter(s => !s.owner || removed.includes(s)).sort((a, b) => Number(b.tileId) - Number(a.tileId))) {
        if (holdings.includes(sector) || !ownFleet.some(ship => ship.sectorId === sector.id && !(ship.orbitalShip && removed.includes(sector)))) continue;
        if (availableDiscovery(sector)) discoveries.add(sector.id);
        if (projected.influenceOnTrack <= 0) continue;
        const claim = removed.includes(sector) ? { ...sector, population: [] } : sector;
        const nextSeat = { ...projected, influenceOnTrack: projected.influenceOnTrack - 1 };
        const nextHeld = [...holdings, claim];
        const next = settlementForecast(view, nextSeat, nextHeld);
        if (betterForecast(next, forecast)) {
          projected = nextSeat;
          holdings = nextHeld;
          forecast = next;
        }
      }
    }
    const unpaidBeforeAbandoning = forecast.missing;
    // In bankruptcy the player may return control discs without spending an action.
    // Estimate the best single release at each step until the remaining empire is funded.
    while (forecast.missing > 0 && holdings.length) {
      let best: { seat: Seat; held: Sector[]; forecast: Forecast } | undefined;
      for (const sector of holdings) {
        const nextSeat = afterWithdrawals(projected, [sector], 0);
        const nextHeld = holdings.filter(s => s !== sector);
        const next = settlementForecast(view, nextSeat, nextHeld);
        if (!best || betterForecast(next, best.forecast)) best = { seat: nextSeat, held: nextHeld, forecast: next };
      }
      if (!best) break;
      projected = best.seat;
      holdings = best.held;
      forecast = best.forecast;
    }
    return { ...forecast, points: forecast.points + Math.min(discoveries.size, discoveryLimit) * 2, unpaidBeforeAbandoning };
  }

  const passMoney = startsAction ? firstPassMoney(view) : 0;
  const stoppingSeat = passMoney ? { ...seat, resources: { ...seat.resources, money: seat.resources.money + passMoney } } : seat;
  const discoveriesOn = (sectors: Sector[]) => new Set(sectors.filter(availableDiscovery).map(s => s.id));
  const baseline = finish(stoppingSeat, controlled, [], discoveriesOn(isInfluence ? controlled : []));
  return command => {
    const removed = controlled.filter(sector => command.removeSectorIds.includes(sector.id));
    const added = view.sectors.filter(sector => command.addSectorIds.includes(sector.id));
    const holdings = [...controlled.filter(sector => !removed.includes(sector)), ...added];
    if (!holdings.length && !ownFleet.some(ship => !(ship.orbitalShip && removed.some(s => s.id === ship.sectorId)))) return -Infinity;
    const projected = afterWithdrawals(seat, removed, Number(startsAction));
    projected.influenceOnTrack -= added.length;
    if (activationCost) projected.resources = { ...seat.resources, money: seat.resources.money - activationCost };
    if (isInfluence && !view.actionProgress?.coloniesRefreshed) {
      const capacity = getFaction(seat.faction).colonyShips + Number(hasTech(seat, 'advanced-colony-ships'));
      projected.colonyShipsAvailable = Math.min(capacity, projected.colonyShipsAvailable + 2);
    }
    const after = finish(projected, holdings, removed, discoveriesOn(isInfluence ? holdings : []));
    if (added.length && after.unpaidBeforeAbandoning > baseline.unpaidBeforeAbandoning && !added.some(availableDiscovery)) return -Infinity;
    if (!betterForecast(after, baseline)) return -Infinity;
    // Keep the resource tiebreak strictly below one VP. A new paid action must
    // improve on passing; continuation compares against ending the already-paid action.
    const resourcesGain = after.resources - baseline.resources;
    return (after.points - baseline.points) * 5 + (baseline.missing - after.missing) * 8
      + resourcesGain / (1 + Math.abs(resourcesGain));
  };
}

export function finalBankruptcyValue(view: PlayerView, seat: Seat, sector: Sector): number {
  const projected = afterWithdrawals(seat, [sector], 0);
  const unpaid = remainingUpkeepShortfall(view, projected);
  return -controlPoints(seat, sector) * 5 - unpaid * 6 - (unpaid ? 4 : 0)
    + (upkeepBalance(projected) - upkeepBalance(seat)) * .25;
}
