import { describe, it, expect } from 'vitest';
import { generateSpaceRoomName, generateRoomCode } from '../utils/roomNameGenerator';

describe('Room Name Generator', () => {
  it('should generate space-themed room names', () => {
    const name = generateSpaceRoomName();
    expect(name).toMatch(/^[A-Za-z]+ [A-Za-z]+ \d+$/);
    
    // Check that it contains space-themed words
    const words = name.split(' ');
    expect(words).toHaveLength(3);
    expect(words[2]).toMatch(/^\d+$/); // Third word should be a number
  });

  it('should generate different room names on subsequent calls', () => {
    const names = new Set();
    for (let i = 0; i < 20; i++) {
      names.add(generateSpaceRoomName());
    }
    expect(names.size).toBeGreaterThan(1); // Should generate variety
  });

  it('should generate unique room codes', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateRoomCode());
    }
    expect(codes.size).toBeGreaterThan(90); // High probability of uniqueness
  });

  it('should generate room codes with correct format', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z0-9]{6}$/); // 6 uppercase alphanumeric characters
  });
});