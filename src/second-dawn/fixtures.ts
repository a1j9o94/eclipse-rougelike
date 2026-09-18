export type FixtureStage = 'Opening' | 'Midgame' | 'Late game';
export interface PrototypeSector {
  id: number;
  q: number;
  r: number;
  owner: number;
  ships: number;
  population: number;
  structure: 'Orbital' | 'Monolith' | null;
  discovery: boolean;
}
export const players = [
  { name: 'Terran Directorate', color: '#df7e86', mark: 'I' },
  { name: 'Hydran Progress', color: '#70c8e3', mark: 'II' },
  { name: 'Descendants of Draco', color: '#e8c766', mark: 'III' },
  { name: 'Orion Hegemony', color: '#a4acba', mark: 'IV' },
  { name: 'Mechanema', color: '#e3e7ed', mark: 'V' },
  { name: 'Planta', color: '#79c9a0', mark: 'VI' },
];
// Layout and values are illustrative UI fixtures, never a rules catalog or playable state.
export function sectorsFor(stage: FixtureStage): PrototypeSector[] {
  const all: PrototypeSector[] = [];
  for (let q = -3; q <= 3; q++)
    for (let r = -3; r <= 3; r++) {
      if (Math.abs(q + r) > 3) continue;
      const i = all.length;
      all.push({
        id: 101 + i,
        q,
        r,
        owner: i % 6,
        ships: i % 4,
        population: 1 + (i % 3),
        structure: i % 7 === 0 ? 'Orbital' : i % 9 === 0 ? 'Monolith' : null,
        discovery: i % 5 === 0,
      });
    }
  return stage === 'Opening'
    ? all.filter(
        (s) => Math.max(Math.abs(s.q), Math.abs(s.r), Math.abs(s.q + s.r)) <= 1,
      )
    : stage === 'Midgame'
      ? all.filter((s) => s.id % 4 !== 0)
      : all;
}
