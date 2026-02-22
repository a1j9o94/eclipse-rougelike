import type { EclipseSector } from '../types/eclipse-sectors';

/**
 * Sample Eclipse sector data for testing and development
 *
 * Based on Eclipse: Second Dawn for the Galaxy
 */

export const GALACTIC_CENTER: EclipseSector = {
  id: '001',
  ring: 'center',
  explored: true,
  orientation: 0,
  coordinates: { q: 0, r: 0, s: 0 },
  populationSquares: [],
  wormholes: [
    { direction: 0, type: 'normal' },
    { direction: 1, type: 'normal' },
    { direction: 2, type: 'normal' },
    { direction: 3, type: 'normal' },
    { direction: 4, type: 'normal' },
    { direction: 5, type: 'normal' }
  ],
  ships: [],
  ancients: []
};

export const SAMPLE_STARTING_SECTOR: EclipseSector = {
  id: '221',
  ring: 'starting',
  explored: true,
  orientation: 0,
  coordinates: { q: 1, r: -1, s: 0 },
  populationSquares: [
    { type: 'gray', advanced: false, resources: 2 },
    { type: 'gray', advanced: false, resources: 1 },
    { type: 'money', advanced: false, resources: 1 }
  ],
  wormholes: [
    { direction: 0, type: 'normal' },
    { direction: 3, type: 'normal' }
  ],
  controlledBy: 'player1',
  influenceDisk: 'player1',
  ships: [
    { playerId: 'player1', count: 2, pinned: false }
  ],
  ancients: []
};

export const SAMPLE_INNER_SECTOR_WITH_DISCOVERY: EclipseSector = {
  id: '101',
  ring: 'inner',
  explored: true,
  orientation: 0,
  coordinates: { q: 2, r: -1, s: -1 },
  populationSquares: [
    { type: 'science', advanced: false, resources: 2 },
    { type: 'gray', advanced: true, resources: 1 }
  ],
  wormholes: [
    { direction: 1, type: 'normal' },
    { direction: 4, type: 'normal' }
  ],
  discoveryTile: {
    id: 'disc-1',
    revealed: false,
    ancientCount: 1
  },
  ships: [],
  ancients: [
    { count: 1, type: 'interceptor' }
  ]
};

export const SAMPLE_MIDDLE_SECTOR_RICH: EclipseSector = {
  id: '201',
  ring: 'middle',
  explored: true,
  orientation: 0,
  coordinates: { q: 1, r: -2, s: 1 },
  populationSquares: [
    { type: 'materials', advanced: false, resources: 3 },
    { type: 'money', advanced: false, resources: 2 },
    { type: 'science', advanced: false, resources: 1 }
  ],
  wormholes: [
    { direction: 2, type: 'normal' },
    { direction: 5, type: 'normal' }
  ],
  influenceDisk: 'player2',
  ships: [
    { playerId: 'player2', count: 3, pinned: false }
  ],
  ancients: []
};

export const SAMPLE_OUTER_SECTOR_UNEXPLORED: EclipseSector = {
  id: '301',
  ring: 'outer',
  explored: false,
  orientation: 0,
  populationSquares: [
    { type: 'gray', advanced: false, resources: 1 }
  ],
  wormholes: [
    { direction: 0, type: 'normal' }
  ],
  ships: [],
  ancients: []
};

export const SAMPLE_GUARDIAN_SECTOR: EclipseSector = {
  id: '271',
  ring: 'guardian',
  explored: true,
  orientation: 0,
  coordinates: { q: -1, r: -1, s: 2 },
  populationSquares: [
    { type: 'materials', advanced: true, resources: 3 },
    { type: 'science', advanced: true, resources: 2 }
  ],
  wormholes: [
    { direction: 1, type: 'normal' },
    { direction: 3, type: 'normal' },
    { direction: 5, type: 'normal' }
  ],
  discoveryTile: {
    id: 'disc-guardian',
    revealed: false,
    ancientCount: 2
  },
  ships: [],
  ancients: [
    { count: 1, type: 'dreadnought' },
    { count: 1, type: 'cruiser' }
  ]
};

/**
 * Sample galaxy setup for 2-player game
 */
export const SAMPLE_2_PLAYER_GALAXY: EclipseSector[] = [
  GALACTIC_CENTER,
  SAMPLE_STARTING_SECTOR,
  {
    ...SAMPLE_STARTING_SECTOR,
    id: '222',
    coordinates: { q: -1, r: 1, s: 0 },
    controlledBy: 'player2',
    influenceDisk: 'player2',
    ships: [{ playerId: 'player2', count: 2, pinned: false }]
  },
  SAMPLE_INNER_SECTOR_WITH_DISCOVERY,
  SAMPLE_MIDDLE_SECTOR_RICH,
  SAMPLE_GUARDIAN_SECTOR
];

/**
 * Generate sector stack for exploration
 */
export function generateSectorStack(ring: 'inner' | 'middle' | 'outer', count: number): EclipseSector[] {
  const stack: EclipseSector[] = [];

  for (let i = 0; i < count; i++) {
    const baseId = ring === 'inner' ? 101 : ring === 'middle' ? 201 : 301;
    const sector: EclipseSector = {
      id: String(baseId + i),
      ring,
      explored: false,
      orientation: 0,
      populationSquares: generateRandomPopulation(ring),
      wormholes: generateRandomWormholes(),
      ships: [],
      ancients: Math.random() > 0.7 ? [{ count: 1, type: 'interceptor' }] : []
    };

    // Add discovery tiles to some sectors
    if (Math.random() > 0.6) {
      sector.discoveryTile = {
        id: `disc-${sector.id}`,
        revealed: false,
        ancientCount: sector.ancients.length
      };
    }

    stack.push(sector);
  }

  return stack;
}

/**
 * Generate random population squares for a sector
 */
function generateRandomPopulation(ring: 'inner' | 'middle' | 'outer'): EclipseSector['populationSquares'] {
  const count = ring === 'inner' ? 2 : ring === 'middle' ? 3 : 1;
  const types: ('gray' | 'money' | 'science' | 'materials')[] = ['gray', 'money', 'science', 'materials'];

  return Array.from({ length: count }, () => ({
    type: types[Math.floor(Math.random() * types.length)],
    advanced: Math.random() > 0.7,
    resources: Math.floor(Math.random() * 3) + 1
  }));
}

/**
 * Generate random wormholes for a sector
 */
function generateRandomWormholes(): EclipseSector['wormholes'] {
  const count = Math.floor(Math.random() * 3) + 1; // 1-3 wormholes
  const directions = [0, 1, 2, 3, 4, 5];
  const selected = directions.sort(() => Math.random() - 0.5).slice(0, count);

  return selected.map(dir => ({
    direction: dir as 0 | 1 | 2 | 3 | 4 | 5,
    type: 'normal' as const
  }));
}
