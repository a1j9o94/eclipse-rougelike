import { type SectorSpec } from './types'

export const SECTORS: SectorSpec[] = [
  { sector: 1, enemyTonnage: 1,   enemyTierCap: 1, boss: false },
  { sector: 2, enemyTonnage: 2,   enemyTierCap: 1, boss: false },
  { sector: 3, enemyTonnage: 3,   enemyTierCap: 1, boss: false },
  { sector: 4, enemyTonnage: 3,   enemyTierCap: 2, boss: false },
  { sector: 5, enemyTonnage: 4,   enemyTierCap: 2, boss: true  },
  { sector: 6, enemyTonnage: 4,   enemyTierCap: 2, boss: false },
  { sector: 7, enemyTonnage: 5,   enemyTierCap: 2, boss: false },
  { sector: 8, enemyTonnage: 5,   enemyTierCap: 3, boss: false },
  { sector: 9, enemyTonnage: 6,   enemyTierCap: 3, boss: false },
  { sector:10, enemyTonnage: 7,   enemyTierCap: 3, boss: true  },
];

export function getSectorSpec(sector:number): SectorSpec {
  const s = SECTORS.find(x=>x.sector===sector);
  return s || SECTORS[SECTORS.length-1];
}


