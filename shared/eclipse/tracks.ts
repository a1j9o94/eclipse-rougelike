import type { EconomyTracks } from './economy';

/** Publisher 2021-04-27 raster rulebook pp.4,6 (also corroborated by p.24 example).
 * Population values include the always-visible starting production of 2.
 * Influence values are indexed by EMPTY SLOTS, not by the printed slot index:
 * with no empty slots cost is 0; otherwise read the rightmost empty slot.
 */
export const BASE_ECONOMY_TRACKS: EconomyTracks = Object.freeze({
  income: Object.freeze([2, 3, 4, 6, 8, 10, 12, 15, 18, 21, 24, 28]),
  upkeep: Object.freeze([0, 0, 0, 1, 2, 3, 5, 7, 10, 13, 17, 21, 25, 30]),
});
export const ECONOMY_TRACK_SOURCE =
  'https://www.dropbox.com/scl/fi/gw0xv0um7ami1952be59o/Eclipse2_rules-ENG_2021-04-27_web200.pdf?rlkey=8b8dymg6fbzkj8umjiunjgp1s&dl=1';

function trackValue(
  track: readonly number[],
  position: number,
  label: string,
): number {
  if (!Number.isInteger(position) || position < 0 || position >= track.length) {
    throw new RangeError(
      `${label} must be an integer from 0 to ${track.length - 1}.`,
    );
  }
  return track[position];
}
export function incomeForPopulationAway(cubesAway: number): number {
  if (cubesAway === -1) return 0; // p14: a returned cube may cover the printed 2.
  return trackValue(
    BASE_ECONOMY_TRACKS.income,
    cubesAway,
    'Population cubes absent from the track',
  );
}
/** Species setup gaps (e.g. Eridani's two missing discs) count as empty slots too. */
export function upkeepForEmptyInfluenceSlots(emptySlots: number): number {
  return trackValue(
    BASE_ECONOMY_TRACKS.upkeep,
    emptySlots,
    'Empty influence-track slots',
  );
}
