import { type SectorSpec } from './types'

export const SECTORS: SectorSpec[] = [
  { sector: 1, enemyTonnage: 1,   enemyScienceCap: 1, boss: false },
  { sector: 2, enemyTonnage: 2,   enemyScienceCap: 1, boss: false },
  { sector: 3, enemyTonnage: 2,   enemyScienceCap: 1, boss: false },
  { sector: 4, enemyTonnage: 3,   enemyScienceCap: 1, boss: false },
  { sector: 5, enemyTonnage: 4,   enemyScienceCap: 2, boss: true  },
  { sector: 6, enemyTonnage: 5,   enemyScienceCap: 1, boss: false },
  { sector: 7, enemyTonnage: 5,   enemyScienceCap: 2, boss: false },
  { sector: 8, enemyTonnage: 6,   enemyScienceCap: 1, boss: false },
  { sector: 9, enemyTonnage: 6,   enemyScienceCap: 3, boss: false },
  { sector:10, enemyTonnage: 7,   enemyScienceCap: 3, boss: true  },
];

export function getSectorSpec(sector:number): SectorSpec {
  const s = SECTORS.find(x=>x.sector===sector);
  if(s) return s;
  // Infinite mode scaffold: beyond predefined sectors scale tonnage and science cap
  const last = SECTORS[SECTORS.length-1];
  const extra = sector - SECTORS.length;
  return {
    sector,
    enemyTonnage: last.enemyTonnage + extra,
    enemyScienceCap: last.enemyScienceCap + Math.floor(extra/3),
    boss: sector % 5 === 0,
  };
}