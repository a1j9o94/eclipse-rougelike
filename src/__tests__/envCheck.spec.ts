import { describe, it, expect } from 'vitest';
import { assertEnv, hasEnv } from '../../tools/envCheck';

describe('envCheck', () => {
  it('hasEnv returns true when all variables exist', () => {
    const env = { A: '1', B: '2' } as Record<string, string>;
    expect(hasEnv(['A', 'B'], env)).toBe(true);
  });

  it('hasEnv returns false when a variable is missing', () => {
    const env = { A: '1' } as Record<string, string>;
    expect(hasEnv(['A', 'B'], env)).toBe(false);
  });

  it('assertEnv throws when a variable is missing', () => {
    const env = { A: '1' } as Record<string, string>;
    expect(() => assertEnv(['A', 'B'], env)).toThrowError(/Missing required/);
  });
});

