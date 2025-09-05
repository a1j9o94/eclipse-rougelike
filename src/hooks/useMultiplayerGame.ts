import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useMultiplayerGame(roomId: Id<"rooms"> | null) {
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
  const startGame = useMutation(api.rooms.startGame);
  const updateGameState = useMutation(api.gameState.updateGameState);
  const switchTurn = useMutation(api.gameState.switchTurn);
  const updateGamePhase = useMutation(api.gameState.updateGamePhase);
  const initializeGameState = useMutation(api.gameState.initializeGameState);

  // Get current player info from localStorage
  const getPlayerId = () => localStorage.getItem('eclipse-player-id');
  const setPlayerId = (id: string) => localStorage.setItem('eclipse-player-id', id);

  // Helper functions
  const isHost = () => {
    const playerId = getPlayerId();
    return roomDetails?.players.find((p: any) => p.playerId === playerId)?.isHost ?? false;
  };

  const isMyTurn = () => {
    const playerId = getPlayerId();
    return gameState?.currentTurn === playerId;
  };

  const getCurrentPlayer = () => {
    const playerId = getPlayerId();
    return roomDetails?.players.find((p: any) => p.playerId === playerId);
  };

  const getOpponent = () => {
    const playerId = getPlayerId();
    return roomDetails?.players.find((p: any) => p.playerId !== playerId);
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
  const handleCreateRoom = async (roomName: string, isPublic: boolean, playerName: string, gameConfig: any) => {
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
    const playerId = getPlayerId();
    if (!playerId) throw new Error("No player ID found");

    try {
      await updatePlayerReady({ playerId, isReady });
    } catch (error) {
      console.error("Failed to update ready status:", error);
      throw error;
    }
  };

  const handleStartGame = async () => {
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
  const handleGameStateUpdate = async (updates: any) => {
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
    if (!roomId) throw new Error("No room ID");

    try {
      return await switchTurn({ roomId });
    } catch (error) {
      console.error("Failed to switch turn:", error);
      throw error;
    }
  };

  const handlePhaseChange = async (phase: "setup" | "combat" | "finished") => {
    if (!roomId) throw new Error("No room ID");

    try {
      await updateGamePhase({ roomId, phase });
    } catch (error) {
      console.error("Failed to update game phase:", error);
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
    startGame: handleStartGame,
    
    // Game actions
    updateGameState: handleGameStateUpdate,
    switchTurn: handleSwitchTurn,
    updateGamePhase: handlePhaseChange,
    
    // Loading states
    isLoading: roomDetails === undefined || gameState === undefined,
  };
}