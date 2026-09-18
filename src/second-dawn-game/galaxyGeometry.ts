import type { AxialPosition, HexEdge } from "../../shared/eclipse/geometry";
export const TILE_RADIUS = 58;
export function galaxyPoint({ q, r }: AxialPosition): { x: number; y: number } {
  return { x: Math.sqrt(3) * 60 * (q + r / 2), y: 90 * r };
}
/** Screen y points down; engine edges run E, NE, NW, W, SW, SE. */
export function wormholePoint(
  edge: HexEdge,
  rotation: number,
): { x: number; y: number } {
  const angle = (-(edge + rotation) * Math.PI) / 3;
  return {
    x: (Math.cos(angle) * TILE_RADIUS * Math.sqrt(3)) / 2,
    y: (Math.sin(angle) * TILE_RADIUS * Math.sqrt(3)) / 2,
  };
}
