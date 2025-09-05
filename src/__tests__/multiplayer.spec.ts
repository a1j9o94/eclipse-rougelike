import { describe, it, expect } from 'vitest';
import { 
  MULTIPLAYER_CONFIG, 
  createDefaultMultiplayerGameConfig, 
  validateMultiplayerGameConfig,
  type MultiplayerGameConfig 
} from '../config/multiplayer';

describe('Multiplayer Configuration', () => {
  describe('MULTIPLAYER_CONFIG constants', () => {
    it('should have correct default values', () => {
      expect(MULTIPLAYER_CONFIG.DEFAULT_STARTING_SHIPS).toBe(3);
      expect(MULTIPLAYER_CONFIG.DEFAULT_LIVES_PER_PLAYER).toBe(5);
      expect(MULTIPLAYER_CONFIG.ROOM_CODE_LENGTH).toBe(6);
      expect(MULTIPLAYER_CONFIG.MAX_ROOM_NAME_LENGTH).toBe(50);
      expect(MULTIPLAYER_CONFIG.ROOM_TIMEOUT_MINUTES).toBe(30);
    });
  });

  describe('createDefaultMultiplayerGameConfig', () => {
    it('should create valid default config', () => {
      const config = createDefaultMultiplayerGameConfig();
      expect(config.startingShips).toBe(3);
      expect(config.livesPerPlayer).toBe(5);
    });
  });

  describe('validateMultiplayerGameConfig', () => {
    it('should validate correct config', () => {
      const config: MultiplayerGameConfig = {
        startingShips: 3,
        livesPerPlayer: 5
      };
      expect(validateMultiplayerGameConfig(config)).toBe(true);
    });

    it('should reject invalid starting ships count', () => {
      const config: MultiplayerGameConfig = {
        startingShips: 0,
        livesPerPlayer: 5
      };
      expect(validateMultiplayerGameConfig(config)).toBe(false);
    });

    it('should reject invalid lives count', () => {
      const config: MultiplayerGameConfig = {
        startingShips: 3,
        livesPerPlayer: 0
      };
      expect(validateMultiplayerGameConfig(config)).toBe(false);
    });

    it('should reject excessive values', () => {
      const config: MultiplayerGameConfig = {
        startingShips: 20,
        livesPerPlayer: 100
      };
      expect(validateMultiplayerGameConfig(config)).toBe(false);
    });
  });
});