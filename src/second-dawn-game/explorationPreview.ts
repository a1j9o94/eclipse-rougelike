import {
  adjacentPosition,
  connectionBetween,
  movableShipCount,
  rotatedEdge,
  type HexEdge,
  type MovementSector,
} from "../../shared/eclipse/geometry";
import { mapSector, movementAbilities } from "../../shared/eclipse/rulesState";
import {
  sectorDefinition,
  type SectorDefinition,
} from "../../shared/eclipse/sectors";
import type {
  Coordinate,
  PendingDecision,
  PlayerView,
  Sector,
} from "../../shared/eclipse/types";
export interface ExploreNeighborPreview {
  edge: HexEdge;
  oppositeEdge: HexEdge;
  position: Coordinate;
  sector: Sector | null;
  movementSector: MovementSector | null;
  drawnOpening: boolean;
  neighborOpening: boolean;
  sourceEligible: boolean;
  sourceKind: "controlled" | "unpinned-fleet" | null;
  connection: "paired" | "generator" | "warp" | "closed" | "unexplored";
}
export interface ExplorePreview {
  drawn: MovementSector | null;
  tile: SectorDefinition | null;
  legal: boolean;
  neighbors: ExploreNeighborPreview[];
  connectedSourceIds: string[];
  remotePortalSectorIds: string[];
  explanation: string;
}
/** Public visual explanation only: the persisted decision remains the placement authority. */
export function deriveExplorePreview(
  view: PlayerView,
  decision: Extract<PendingDecision, { kind: "exploration" }>,
  tileId: string,
  rotation: number,
): ExplorePreview {
  const player = view.seats.find((s) => s.id === decision.owner);
  const abilities = player
    ? movementAbilities(player)
    : {
        wormholeGenerator: false,
        cloakingDevice: false,
        descendantsOfDraco: false,
      };
  const validRotation =
    Number.isInteger(rotation) && rotation >= 0 && rotation < 6;
  const tile = decision.drawnTileIds.includes(tileId)
    ? (sectorDefinition(Number(tileId)) ?? null)
    : null;
  const drawn: MovementSector | null =
    tile && validRotation
      ? {
          id: "exploration-preview",
          ...decision.position,
          rotation: rotation as HexEdge,
          wormholes: tile.wormholes,
          warpPortal: tile.warpPortal,
          controller: null,
        }
      : null;
  const ships = view.ships.map((ship) => ({
    id: ship.id,
    owner: ship.owner,
    sectorId: ship.sectorId,
    kind: ship.type,
    movement: 0,
  }));
  const neighbors: ExploreNeighborPreview[] = (
    [0, 1, 2, 3, 4, 5] as HexEdge[]
  ).map((edge) => {
    const position = adjacentPosition(decision.position, edge);
    const oppositeEdge = ((edge + 3) % 6) as HexEdge;
    const sector =
      view.sectors.find(
        (s) => s.position.q === position.q && s.position.r === position.r,
      ) ?? null;
    const movementSector = sector ? mapSector(sector) : null;
    const neighborOpening = !!movementSector?.wormholes.some(
      (w) => rotatedEdge(w, movementSector.rotation) === oppositeEdge,
    );
    const drawnOpening = !!drawn?.wormholes.some(
      (w) => rotatedEdge(w, drawn.rotation) === edge,
    );
    const sourceKind =
      !sector || !player
        ? null
        : sector.owner === player.id
          ? ("controlled" as const)
          : movableShipCount(player.id, sector.id, ships, abilities) > 0
            ? ("unpinned-fleet" as const)
            : null;
    // An eligible source must face the chosen exploration location; a generator permits the missing source opening.
    const sourceEligible =
      sourceKind !== null && (neighborOpening || abilities.wormholeGenerator);
    const physical =
      drawn && movementSector
        ? connectionBetween(drawn, movementSector, abilities.wormholeGenerator)
        : "none";
    const connection = !sector
      ? ("unexplored" as const)
      : physical === "none"
        ? ("closed" as const)
        : physical === "wormhole"
          ? ("paired" as const)
          : physical;
    return {
      edge,
      oppositeEdge,
      position,
      sector,
      movementSector,
      drawnOpening,
      neighborOpening,
      sourceEligible,
      sourceKind,
      connection,
    };
  });
  const legal =
    !!drawn &&
    decision.placements.some(
      (p) => p.tileId === tileId && p.rotation === rotation,
    );
  const connectedSourceIds = neighbors
    .filter(
      (n) =>
        n.sourceEligible &&
        n.connection !== "closed" &&
        n.connection !== "unexplored",
    )
    .map((n) => n.sector!.id);
  const remotePortalSectorIds = drawn?.warpPortal
    ? view.sectors
        .filter(
          (s) =>
            mapSector(s).warpPortal &&
            !neighbors.some((n) => n.sector?.id === s.id),
        )
        .map((s) => s.id)
    : [];
  const explanation = !drawn
    ? "Select a revealed sector tile and a rotation."
    : legal
      ? "This rotation is legal: it connects to an eligible exploration source. Other neighboring sectors do not all need to connect."
      : "This rotation is not in the saved legal placements. A placed tile needs a usable connection to at least one controlled sector or unpinned exploring fleet; other neighbors need not connect.";
  return {
    drawn,
    tile,
    legal,
    neighbors,
    connectedSourceIds,
    remotePortalSectorIds,
    explanation,
  };
}
