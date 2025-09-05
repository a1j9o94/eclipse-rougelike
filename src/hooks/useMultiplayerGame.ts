import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { MultiplayerGameConfig } from "../config/multiplayer";

export function useMultiplayerGame(roomId: Id<"rooms"> | null) {
  // Detect vitest and allow tests to bypass Convex entirely
  const isTestEnv = Boolean((import.meta as unknown as { vitest?: unknown }).vitest) || import.meta.env.MODE === 'test';
  // Check if Convex is available (tests and single‑player use should work without it)
  const isConvexAvailable = !!import.meta.env.VITE_CONVEX_URL && !isTestEnv;

  // In environments without Convex (e.g., tests), return a safe stub and avoid calling Convex hooks
  if (!isConvexAvailable) {
    const noopAsync = async () => { /* no-op for tests */ };
    const noopCreateRoom = async () => ({
      roomId: '' as Id<'rooms'>,
      roomCode: 'TEST',
      playerId: 'TEST_PLAYER',
    });
    const noopJoinRoom = async () => ({
      roomId: '' as Id<'rooms'>,
      playerId: 'TEST_PLAYER',
    });
    return {
      roomDetails: undefined,
      gameState: undefined,
      // Helper fns
      isHost: () => false,
      isMyTurn: () => false,
      getCurrentPlayer: () => undefined,
      getOpponent: () => undefined,
      getMyGameState: () => null,
      getOpponentGameState: () => null,
      getPlayerId: () => null as unknown as string | null,
      // Actions (safe no-ops in tests)
      createRoom: noopCreateRoom,
      joinRoom: noopJoinRoom,
      updatePlayerReady: noopAsync,
      setReady: noopAsync,
      updateFleetValidity: noopAsync,
      startGame: noopAsync,
      restartToSetup: noopAsync,
      updateGameState: noopAsync,
      switchTurn: noopAsync,
      updateGamePhase: noopAsync,
      resolveCombatResult: async () => ({ processed: true, finished: false, loserLives: 0 }),
      endCombatToSetup: noopAsync,
      // State flags
      isLoading: false,
      isConvexAvailable: false,
    } as const;
  }
  
  /* eslint-disable react-hooks/rules-of-hooks */
  // Queries
  const roomDetails = useQuery(
    api.rooms.getRoomDetails,
    roomId ? { roomId } : "skip"
  );
  
  const gameState = useQuery(
    api.gameState.getGameState,
    roomId ? { roomId } : "skip"
  );

  // Mutations
  const createRoom = useMutation(api.rooms.createRoom);
  const joinRoom = useMutation(api.rooms.joinRoom);
  const updatePlayerReady = useMutation(api.rooms.updatePlayerReady);
  const updatePlayerFleetValidity = useMutation(api.gameState.updatePlayerFleetValidity);
  const restartToSetup = useMutation(api.rooms.restartToSetup);
  const startGame = useMutation(api.rooms.startGame);
  const updateGameState = useMutation(api.gameState.updateGameState);
  const endCombatToSetup = useMutation(api.gameState.endCombatToSetup);
  const resolveCombatResult = useMutation(api.gameState.resolveCombatResult);
  const switchTurn = useMutation(api.gameState.switchTurn);
  const updateGamePhase = useMutation(api.gameState.updateGamePhase);
  const initializeGameState = useMutation(api.gameState.initializeGameState);
  /* eslint-enable react-hooks/rules-of-hooks */

  // Get current player info from localStorage
  const getPlayerId = () => localStorage.getItem('eclipse-player-id');
  const setPlayerId = (id: string) => localStorage.setItem('eclipse-player-id', id);

  // Helper functions
  type RoomPlayer = { playerId: string; isHost?: boolean; isReady?: boolean };
  const players = roomDetails?.players as RoomPlayer[] | undefined;

  const isHost = () => {
    const playerId = getPlayerId();
    return players?.find(p => p.playerId === playerId)?.isHost ?? false;
  };

  const isMyTurn = () => {
    const playerId = getPlayerId();
    return gameState?.currentTurn === playerId;
  };

  const getCurrentPlayer = () => {
    const playerId = getPlayerId();
    return players?.find(p => p.playerId === playerId);
  };

  const getOpponent = () => {
    const playerId = getPlayerId();
    return players?.find(p => p.playerId !== playerId);
  };

  const getMyGameState = () => {
    const playerId = getPlayerId();
    return playerId ? gameState?.playerStates[playerId] : null;
  };

  const getOpponentGameState = () => {
    const opponent = getOpponent();
    return opponent ? gameState?.playerStates[opponent.playerId] : null;
  };

  // Room management actions
  const handleCreateRoom = async (roomName: string, isPublic: boolean, playerName: string, gameConfig: MultiplayerGameConfig) => {
    if (!isConvexAvailable) {
      throw new Error("Multiplayer features are not available. Please check your connection and try again.");
    }
    try {
      const result = await createRoom({
        roomName,
        isPublic,
        playerName,
        gameConfig,
      });
      setPlayerId(result.playerId);
      return result;
    } catch (error) {
      console.error("Failed to create room:", error);
      throw error;
    }
  };

  const handleJoinRoom = async (roomCode: string, playerName: string) => {
    if (!isConvexAvailable) {
      throw new Error("Multiplayer features are not available. Please check your connection and try again.");
    }
    try {
      const result = await joinRoom({ roomCode, playerName });
      setPlayerId(result.playerId);
      return result;
    } catch (error) {
      console.error("Failed to join room:", error);
      throw error;
    }
  };

  const handlePlayerReady = async (isReady: boolean) => {
    if (!isConvexAvailable) {
      throw new Error("Multiplayer features are not available. Please check your connection and try again.");
    }
    const playerId = getPlayerId();
    if (!playerId) throw new Error("No player ID found");

    try {
      await updatePlayerReady({ playerId, isReady });
    } catch (error) {
      console.error("Failed to update ready status:", error);
      throw error;
    }
  };

  const handleUpdateFleetValidity = async (fleetValid: boolean) => {
    if (!isConvexAvailable) {
      throw new Error("Multiplayer features are not available. Please check your connection and try again.");
    }
    if (!roomId) {
      // Silent no-op if room is not yet established on this client
      return;
    }
    const playerId = getPlayerId();
    if (!playerId) throw new Error("No player ID found");
    try {
      await updatePlayerFleetValidity({ roomId, playerId, fleetValid });
    } catch (error) {
      console.error("Failed to update fleet validity:", error);
      throw error;
    }
  };

  const handleRestartToSetup = async () => {
    if (!isConvexAvailable) {
      throw new Error("Multiplayer features are not available. Please check your connection and try again.");
    }
    if (!roomId) throw new Error("No room ID");
    const playerId = getPlayerId();
    if (!playerId) throw new Error("No player ID found");
    try {
      return await restartToSetup({ roomId, playerId });
    } catch (error) {
      console.error("Failed to restart to setup:", error);
      throw error;
    }
  };

  const handleStartGame = async () => {
    if (!isConvexAvailable) {
      throw new Error("Multiplayer features are not available. Please check your connection and try again.");
    }
    if (!roomId) throw new Error("No room ID");
    if (!isHost()) throw new Error("Only host can start game");

    try {
      await startGame({ roomId });
      // Initialize game state after starting
      await initializeGameState({
        roomId,
        gameConfig: roomDetails!.room.gameConfig,
      });
    } catch (error) {
      console.error("Failed to start game:", error);
      throw error;
    }
  };

  // Game state actions
  const handleGameStateUpdate = async (updates: Record<string, unknown>) => {
    if (!isConvexAvailable) {
      throw new Error("Multiplayer features are not available. Please check your connection and try again.");
    }
    if (!roomId) throw new Error("No room ID");
    const playerId = getPlayerId();
    if (!playerId) throw new Error("No player ID found");

    try {
      await updateGameState({ roomId, playerId, updates });
    } catch (error) {
      console.error("Failed to update game state:", error);
      throw error;
    }
  };

  const handleSwitchTurn = async () => {
    if (!isConvexAvailable) {
      throw new Error("Multiplayer features are not available. Please check your connection and try again.");
    }
    if (!roomId) throw new Error("No room ID");

    try {
      return await switchTurn({ roomId });
    } catch (error) {
      console.error("Failed to switch turn:", error);
      throw error;
    }
  };

  const handlePhaseChange = async (phase: "setup" | "combat" | "finished") => {
    if (!isConvexAvailable) {
      throw new Error("Multiplayer features are not available. Please check your connection and try again.");
    }
    if (!roomId) throw new Error("No room ID");

    try {
      await updateGamePhase({ roomId, phase });
    } catch (error) {
      console.error("Failed to update game phase:", error);
      throw error;
    }
  };

  const handleResolveCombatResult = async (winnerPlayerId: string) => {
    if (!isConvexAvailable) {
      throw new Error("Multiplayer features are not available. Please check your connection and try again.");
    }
    if (!roomId) {
      // If room lost locally, skip (other client will have reported the result)
      return { processed: false } as unknown as { processed: boolean };
    }
    try {
      return await resolveCombatResult({ roomId, winnerPlayerId });
    } catch (error) {
      console.error("Failed to resolve combat:", error);
      throw error;
    }
  };

  const handleEndCombatToSetup = async () => {
    if (!roomId) throw new Error("No room ID");
    try {
      await endCombatToSetup({ roomId });
    } catch (error) {
      console.error("Failed to end combat:", error);
      throw error;
    }
  };

  return {
    // Data
    roomDetails,
    gameState,
    
    // Helper functions
    isHost,
    isMyTurn,
    getCurrentPlayer,
    getOpponent,
    getMyGameState,
    getOpponentGameState,
    getPlayerId,
    
    // Room actions
    createRoom: handleCreateRoom,
    joinRoom: handleJoinRoom,
    updatePlayerReady: handlePlayerReady,
    setReady: handlePlayerReady,
    updateFleetValidity: handleUpdateFleetValidity,
    startGame: handleStartGame,
    restartToSetup: handleRestartToSetup,
    
    // Game actions
    updateGameState: handleGameStateUpdate,
    switchTurn: handleSwitchTurn,
    updateGamePhase: handlePhaseChange,
    resolveCombatResult: handleResolveCombatResult,
    endCombatToSetup: handleEndCombatToSetup,
    
    // Loading states and availability
    isLoading: isConvexAvailable && !!roomId && (roomDetails === undefined || gameState === undefined),
    isConvexAvailable,
  };
}
