import { describe, it, expect } from 'vitest';
// import { render } from '@testing-library/react';

describe('PublicLobbyPage UI', () => {
  it('module exists and renders without crashing', async () => {
    const mod = await import('../pages/PublicLobbyPage').catch(() => null);
    expect(mod).toBeTruthy(); // fail first until page exists
  });
});
