import {
  BASE_COMPONENTS,
  SETUP_BY_PLAYER_COUNT,
  type PlayerCount,
} from './catalog';
import { shuffle, type RandomState } from './random';
import { getTechnology, TECHNOLOGIES, type TechnologyId } from './technologies';

export interface TechnologyTile {
  id: string;
  technology: TechnologyId;
}
export interface TechnologyBag {
  tiles: TechnologyTile[];
  excluded: TechnologyTile[];
  random: RandomState;
}

/** Starting technologies are printed on boards and do not consume these physical tiles (p10). */
export function createTechnologyBag(
  random: RandomState,
  warpPortals = true,
): TechnologyBag {
  const tiles: TechnologyTile[] = [];
  for (const technology of TECHNOLOGIES) {
    if (
      technology.copies === null ||
      !Number.isSafeInteger(technology.copies) ||
      technology.copies < 1
    ) {
      throw new Error(
        `A sourced supply count is required for ${technology.id}.`,
      );
    }
    for (let copy = 0; copy < technology.copies; copy++) {
      tiles.push({
        id: `${technology.id}:${copy + 1}`,
        technology: technology.id,
      });
    }
  }
  if (tiles.length !== BASE_COMPONENTS.physical.technologyTiles)
    throw new Error('Technology inventory does not match the base-box total.');
  const excluded: TechnologyTile[] = warpPortals
    ? []
    : tiles.filter((tile) => tile.technology === 'warp-portal');
  const allowed = warpPortals
    ? tiles
    : tiles.filter((tile) => tile.technology !== 'warp-portal');
  const shuffled = shuffle(random, allowed);
  return { tiles: shuffled.items, excluded, random: shuffled.state };
}

export interface TechnologyDraw {
  drawn: TechnologyTile[];
  remaining: TechnologyTile[];
  regularDrawn: number;
}
/** Initial and cleanup draws: rares enter the market without consuming the quota (pp5,25). */
export function drawTechnologies(
  tiles: readonly TechnologyTile[],
  regularQuota: number,
): TechnologyDraw {
  if (!Number.isSafeInteger(regularQuota) || regularQuota < 0)
    throw new RangeError('Draw quota must be a nonnegative integer.');
  let regularDrawn = 0;
  let count = 0;
  while (count < tiles.length && regularDrawn < regularQuota) {
    if (getTechnology(tiles[count].technology).track !== 'rare') regularDrawn++;
    count++;
  }
  return {
    drawn: tiles.slice(0, count).map((tile) => ({ ...tile })),
    remaining: tiles.slice(count).map((tile) => ({ ...tile })),
    regularDrawn,
  };
}

export interface SectorStacks {
  inner: number[];
  middle: number[];
  outer: number[];
  outerInBox: number[];
  excluded: number[];
  random: RandomState;
}
/** Prepare ring stacks only; home-sector faces and player blueprints are separate setup work. */
export function prepareSectorStacks(
  random: RandomState,
  count: PlayerCount,
  warpPortals: boolean,
): SectorStacks {
  if (!Number.isInteger(count) || count < 2 || count > 6)
    throw new RangeError('Second Dawn requires two to six players.');
  const excluded: number[] = warpPortals
    ? []
    : [...BASE_COMPONENTS.sectorIds.optionalWarpPortals];
  const allowed = (id: number) => !excluded.includes(id);
  const inner = shuffle(random, BASE_COMPONENTS.sectorIds.inner);
  const middle = shuffle(
    inner.state,
    BASE_COMPONENTS.sectorIds.middle.filter(allowed),
  );
  const outer = shuffle(
    middle.state,
    BASE_COMPONENTS.sectorIds.outer.filter(allowed),
  );
  const limit = SETUP_BY_PLAYER_COUNT[count].outerSectors;
  return {
    inner: inner.items,
    middle: middle.items,
    outer: outer.items.slice(0, limit),
    outerInBox: outer.items.slice(limit),
    excluded,
    random: outer.state,
  };
}
