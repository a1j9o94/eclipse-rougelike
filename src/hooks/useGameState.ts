/**
 * React hooks for Eclipse game state
 *
 * Subscribe to current turn, phase, and player state
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Hook to get current game state (turn, phase, active player)
 *
 * Usage:
 * ```tsx
 * const gameState = useGameState(roomId);
 * if (gameState.currentPhase === 'action') {
 *   // Show action UI
 * }
 * ```
 */
export function useGameState(roomId: Id<"rooms"> | undefined) {
  const gameState = useQuery(
    api.queries.game.getGameState,
    roomId ? { roomId } : "skip"
  );

  return gameState;
}

/**
 * Hook to get current player's turn status
 *
 * Returns whether it's the current player's turn
 */
export function useIsMyTurn(
  roomId: Id<"rooms"> | undefined,
  playerId: string | undefined
) {
  const gameState = useGameState(roomId);

  return {
    isMyTurn: gameState?.activePlayerId === playerId,
    hasPassed: gameState?.passedPlayers?.includes(playerId || "") || false,
    canAct: gameState?.activePlayerId === playerId && gameState?.currentPhase === "action",
  };
}

/**
 * Hook to get player resources
 */
export function usePlayerResources(
  roomId: Id<"rooms"> | undefined,
  playerId: string | undefined
) {
  const resources = useQuery(
    api.queries.players.getPlayerResources,
    roomId && playerId ? { roomId, playerId } : "skip"
  );

  return resources;
}

/**
 * Hook to get current player state
 */
export function useCurrentPlayer(
  roomId: Id<"rooms"> | undefined,
  playerId: string | undefined
) {
  const player = useQuery(
    api.queries.players.getPlayer,
    roomId && playerId ? { roomId, playerId } : "skip"
  );

  return player;
}
