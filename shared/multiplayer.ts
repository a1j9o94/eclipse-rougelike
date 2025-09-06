export const MULTIPLAYER_CONFIG = {
  DEFAULT_STARTING_SHIPS: 3,
  DEFAULT_LIVES_PER_PLAYER: 5,
  ROOM_CODE_LENGTH: 6,
  MAX_ROOM_NAME_LENGTH: 50,
  ROOM_TIMEOUT_MINUTES: 30,
  MAX_STARTING_SHIPS: 10,
  MAX_LIVES_PER_PLAYER: 20,
} as const;

export type MultiplayerGameConfig = { startingShips: number; livesPerPlayer: number };

export function createDefaultMultiplayerGameConfig(): MultiplayerGameConfig {
  return {
    startingShips: MULTIPLAYER_CONFIG.DEFAULT_STARTING_SHIPS,
    livesPerPlayer: MULTIPLAYER_CONFIG.DEFAULT_LIVES_PER_PLAYER,
  };
}

export function validateMultiplayerGameConfig(config: MultiplayerGameConfig): boolean {
  if (config.startingShips < 1 || config.startingShips > MULTIPLAYER_CONFIG.MAX_STARTING_SHIPS) return false;
  if (config.livesPerPlayer < 1 || config.livesPerPlayer > MULTIPLAYER_CONFIG.MAX_LIVES_PER_PLAYER) return false;
  return true;
}

