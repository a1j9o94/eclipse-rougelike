import { factionHasCapability, getFaction, tradeQuote } from './catalog';
import { factionRulesMode } from './gameRules';
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

/** Money still missing after using the seat's unspent, legally convertible resources. */
export function remainingUpkeepShortfall(view: PlayerView, seat: Seat): number {
  let missing = Math.max(0, -upkeepBalance(seat));
  if (getFaction(seat.faction).special?.convertColonyShipToResource)
    missing = Math.max(0, missing - seat.colonyShipsAvailable);
  for (const resource of ['materials', 'science'] as const) {
    for (let received = missing; received > 0; received--) {
      const quote = tradeQuote(seat.faction, resource, 'money', received, factionRulesMode(view));
      if (quote && quote.input <= seat.resources[resource]) {
        missing -= received;
        break;
      }
    }
  }
  return missing;
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

function afterMoneyColonies(view: PlayerView, seat: Seat, sectors: readonly Sector[]): Seat {
  const limit = Math.min(seat.colonyShipsAvailable, 11 - seat.populationTracks.money);
  if (limit <= 0) return seat;
  const advanced = hasTech(seat, 'advanced-economy') || hasTech(seat, 'metasynthesis');
  let squares = 0;
  for (const sector of sectors) {
    if (hasEnemy(view, seat, sector.id)) continue;
    const planets = sectorDefinition(Number(sector.tileId))?.population ?? [];
    squares += planets.filter((planet, index) =>
      (planet.resource === 'money' || planet.resource === 'gray') &&
      (!planet.advanced || advanced) && !sector.population.some(cube => cube.squareId === `p${index}`),
    ).length;
    if (sector.orbital && !sector.population.some(cube => cube.squareId === 'orbital')) squares++;
    if (squares >= limit) break;
  }
  const colonies = Math.min(limit, squares);
  return { ...seat, colonyShipsAvailable: seat.colonyShipsAvailable - colonies,
    populationTracks: { ...seat.populationTracks, money: seat.populationTracks.money + colonies } };
}

export function finalInfluenceValue(view: PlayerView, seat: Seat, command: Extract<GameCommand, { type: 'influence' }>): number {
  const controlled = view.sectors.filter(sector => sector.owner === seat.id);
  const removed = view.sectors.filter(sector => command.removeSectorIds.includes(sector.id));
  const added = view.sectors.filter(sector => command.addSectorIds.includes(sector.id));
  const startsAction = view.phase === 'action' && !view.actionProgress;
  const passMoney = startsAction ? firstPassMoney(view) : 0;
  const baseline = passMoney ? { ...seat, resources: { ...seat.resources, money: seat.resources.money + passMoney } } : seat;
  if (removed.length && !added.length &&
      controlled.every(sector => command.removeSectorIds.includes(sector.id)) &&
      view.ships.every(ship => ship.owner !== seat.id || ship.orbitalShip && command.removeSectorIds.includes(ship.sectorId)))
    return -Infinity;
  const projected = afterWithdrawals(seat, removed, Number(startsAction));
  projected.influenceOnTrack -= added.length;
  if (view.phase === 'action' && !view.actionProgress?.coloniesRefreshed) {
    const colonyCapacity = getFaction(seat.faction).colonyShips + Number(hasTech(seat, 'advanced-colony-ships'));
    projected.colonyShipsAvailable = Math.min(colonyCapacity, seat.colonyShipsAvailable + 2);
  }
  const retained = controlled.filter(sector => !command.removeSectorIds.includes(sector.id));
  const beforeFunding = afterMoneyColonies(view, baseline, controlled);
  const afterFunding = afterMoneyColonies(view, projected, [...retained, ...added]);
  const relief = remainingUpkeepShortfall(view, beforeFunding) - remainingUpkeepShortfall(view, afterFunding);
  // Routine claims must be sustainable. Discoveries can pay off immediately even without lasting control.
  if (added.length && relief < 0 && !added.some(sector => sector.discovery)) return -Infinity;
  const gained = added.reduce((sum, sector) => sum + controlPoints(seat, sector) + (sector.discovery ? 1 : 0), 0);
  const lost = removed.reduce((sum, sector) => sum + controlPoints(seat, sector), 0);
  const moneyChange = upkeepBalance(afterFunding) - upkeepBalance(beforeFunding);
  // Keep existing points when withdrawal offers no advantage over holding and settling upkeep.
  if (removed.length && relief <= 0 && (gained < lost || gained === lost && moneyChange <= 0)) return -Infinity;
  return (gained - lost) * 5 + relief * 8 + moneyChange * .25;
}

export function finalBankruptcyValue(view: PlayerView, seat: Seat, sector: Sector): number {
  const projected = afterWithdrawals(seat, [sector], 0);
  const unpaid = remainingUpkeepShortfall(view, projected);
  return -controlPoints(seat, sector) * 5 - unpaid * 6 - (unpaid ? 4 : 0)
    + (upkeepBalance(projected) - upkeepBalance(seat)) * .25;
}
