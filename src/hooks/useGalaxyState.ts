import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useMemo } from "react";
import { convexSectorsToEclipse } from "../lib/convex-adapters";
import type { EclipseSector } from "../types/eclipse-sectors";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Hook to get real-time galaxy state from Convex
 *
 * Automatically converts Convex sectors to EclipseSector format
 * Updates in real-time when any player modifies the galaxy
 */
export function useGalaxyState(roomId: Id<"rooms"> | undefined): {
  sectors: EclipseSector[];
  isLoading: boolean;
} {
  // Query galaxy state from Convex
  const galaxyState = useQuery(
    api.queries.galaxy.getGalaxyState,
    roomId ? { roomId } : "skip"
  );

  // Convert Convex sectors to Eclipse format
  const sectors = useMemo(() => {
    if (!galaxyState) return [];
    return convexSectorsToEclipse(galaxyState);
  }, [galaxyState]);

  return {
    sectors,
    isLoading: galaxyState === undefined && roomId !== undefined,
  };
}

/**
 * Hook to get sectors only (without ships/resources)
 */
export function useSectors(roomId: Id<"rooms"> | undefined) {
  const sectors = useQuery(
    api.queries.galaxy.getSectors,
    roomId ? { roomId } : "skip"
  );

  return sectors;
}

/**
 * Hook to get ships in a specific sector
 */
export function useShipsInSector(
  roomId: Id<"rooms"> | undefined,
  sectorId: Id<"sectors"> | undefined
) {
  const ships = useQuery(
    api.queries.galaxy.getShipsInSector,
    roomId && sectorId ? { roomId, sectorId } : "skip"
  );

  return ships;
}
