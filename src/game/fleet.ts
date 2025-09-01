import type { Ship } from '../config/types';

export type FleetGroup = { ship: Ship; count: number; indices: number[] };

export function groupFleet(fleet: Ship[]): FleetGroup[] {
  const map = new Map<string, FleetGroup>();
  fleet.forEach((ship, idx) => {
    const key = ship.frame.id + '|' + ship.parts.map(p => p.id).sort().join(',');
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      existing.indices.push(idx);
    } else {
      map.set(key, { ship, count: 1, indices: [idx] });
    }
  });
  return Array.from(map.values());
}

