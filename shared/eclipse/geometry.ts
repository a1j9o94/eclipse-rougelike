/** Axial edges: east, northeast, northwest, west, southwest, southeast. */
export type HexEdge = 0 | 1 | 2 | 3 | 4 | 5;
export interface AxialPosition {
  readonly q: number;
  readonly r: number;
}
export interface MovementSector extends AxialPosition {
  readonly id: string;
  readonly rotation: HexEdge;
  readonly wormholes: readonly HexEdge[];
  readonly warpPortal: boolean;
  readonly controller: string | null;
}
export interface MovementShip {
  readonly id: string;
  readonly sectorId: string;
  readonly owner: string | null;
  readonly kind:
    | 'interceptor'
    | 'cruiser'
    | 'dreadnought'
    | 'starbase'
    | 'ancient'
    | 'guardian'
    | 'gcds';
  readonly movement: number;
}
export interface MovementAbilities {
  readonly wormholeGenerator: boolean;
  readonly cloakingDevice: boolean;
  readonly descendantsOfDraco: boolean;
}
export type MovementValidation =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code:
        | 'missing-ship'
        | 'ownership'
        | 'empty-path'
        | 'immobile'
        | 'range'
        | 'unexplored'
        | 'disconnected'
        | 'pinned'
        | 'not-controlled'
        | 'occupied';
      readonly message: string;
      readonly sectorId?: string;
    };
const offsets: readonly AxialPosition[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];
export function rotatedEdge(edge: HexEdge, rotation: HexEdge): HexEdge {
  return ((edge + rotation) % 6) as HexEdge;
}
export function adjacentPosition(
  position: AxialPosition,
  edge: HexEdge,
): AxialPosition {
  return { q: position.q + offsets[edge].q, r: position.r + offsets[edge].r };
}
export function connectionBetween(
  from: MovementSector,
  to: MovementSector,
  wormholeGenerator = false,
): 'none' | 'wormhole' | 'generator' | 'warp' {
  if (from.id === to.id || (from.q === to.q && from.r === to.r)) return 'none';
  if (from.warpPortal && to.warpPortal) return 'warp';
  const edge = offsets.findIndex(
    (d) => from.q + d.q === to.q && from.r + d.r === to.r,
  );
  if (edge < 0) return 'none';
  const a = from.wormholes.some((e) => rotatedEdge(e, from.rotation) === edge);
  const b = to.wormholes.some(
    (e) => rotatedEdge(e, to.rotation) === (edge + 3) % 6,
  );
  return a && b
    ? 'wormhole'
    : wormholeGenerator && (a || b)
      ? 'generator'
      : 'none';
}
function isOpponent(
  ship: MovementShip,
  player: string,
  abilities: MovementAbilities,
): boolean {
  return (
    ship.owner !== player &&
    !(ship.kind === 'ancient' && abilities.descendantsOfDraco)
  );
}
/** Count ships that the player may choose to leave; diplomacy does not prevent pinning. */
export function movableShipCount(
  player: string,
  sectorId: string,
  ships: readonly MovementShip[],
  abilities: MovementAbilities,
): number {
  const present = ships.filter((s) => s.sectorId === sectorId);
  if (present.some((s) => s.kind === 'gcds')) return 0;
  const friendly = present.filter((s) => s.owner === player).length;
  const enemies = present.filter((s) =>
    isOpponent(s, player, abilities),
  ).length;
  return Math.max(
    0,
    friendly - Math.floor(enemies / (abilities.cloakingDevice ? 2 : 1)),
  );
}
export interface MovementPathRequest {
  readonly player: string;
  readonly shipId: string;
  /** Destinations after the starting sector, one entry for each movement point. */
  readonly path: readonly string[];
  readonly sectors: readonly MovementSector[];
  readonly ships: readonly MovementShip[];
  readonly abilities: MovementAbilities;
}
export function validateMovementPath(
  request: MovementPathRequest,
): MovementValidation {
  const { player, shipId, path, sectors, ships, abilities } = request;
  const ship = ships.find((s) => s.id === shipId);
  if (!ship)
    return {
      ok: false,
      code: 'missing-ship',
      message: 'This ship is not on the board.',
    };
  if (ship.owner !== player)
    return {
      ok: false,
      code: 'ownership',
      message: 'You can only move your own ships.',
    };
  if (!path.length)
    return { ok: false, code: 'empty-path', message: 'Choose a destination.' };
  if (ship.movement <= 0 || ship.kind === 'starbase')
    return { ok: false, code: 'immobile', message: 'This ship cannot move.' };
  if (path.length > ship.movement)
    return {
      ok: false,
      code: 'range',
      message: `This ship can move at most ${ship.movement} sectors.`,
    };
  let currentId = ship.sectorId;
  for (const nextId of path) {
    const from = sectors.find((s) => s.id === currentId);
    const to = sectors.find((s) => s.id === nextId);
    if (!from || !to)
      return {
        ok: false,
        code: 'unexplored',
        sectorId: !from ? currentId : nextId,
        message: 'Ships cannot move into unexplored space.',
      };
    // Relocate only the moving ship in this local view, including when a route loops back.
    const present = ships.map((s) =>
      s.id === shipId ? { ...s, sectorId: currentId } : s,
    );
    if (movableShipCount(player, currentId, present, abilities) === 0)
      return {
        ok: false,
        code: 'pinned',
        sectorId: currentId,
        message: 'Opponent ships pin your fleet here; no ship can leave.',
      };
    if (connectionBetween(from, to, abilities.wormholeGenerator) === 'none')
      return {
        ok: false,
        code: 'disconnected',
        sectorId: nextId,
        message: 'These sectors have no usable wormhole connection.',
      };
    currentId = nextId;
  }
  return { ok: true };
}
export interface RetreatRequest {
  readonly player: string;
  readonly from: MovementSector;
  readonly to: MovementSector;
  readonly ships: readonly MovementShip[];
  readonly abilities: MovementAbilities;
}
/** Destination eligibility only. The battle engine must persist the next-activation delay. */
export function validateRetreat({
  player,
  from,
  to,
  ships,
  abilities,
}: RetreatRequest): MovementValidation {
  if (to.controller !== player)
    return {
      ok: false,
      code: 'not-controlled',
      sectorId: to.id,
      message: 'You must control your retreat destination.',
    };
  if (connectionBetween(from, to, abilities.wormholeGenerator) === 'none')
    return {
      ok: false,
      code: 'disconnected',
      sectorId: to.id,
      message: 'Retreat requires a connected sector.',
    };
  if (
    ships.some((s) => s.sectorId === to.id && isOpponent(s, player, abilities))
  )
    return {
      ok: false,
      code: 'occupied',
      sectorId: to.id,
      message: 'Opponent ships occupy this retreat destination.',
    };
  return { ok: true };
}
