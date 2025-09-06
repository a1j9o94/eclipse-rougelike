import { describe, it, expect } from 'vitest';

describe('Multiplayer server defaults', () => {
  it('should create interceptor snapshots with default part IDs', async () => {
    const gameStateModule = await import('../../convex/gameState');
    const makeSnap = gameStateModule.makeBasicInterceptorSnap;
    
    const snap = makeSnap();
    
    // Should have partIds matching shared defaults
    expect(snap).toHaveProperty('partIds');
    expect(Array.isArray(snap.partIds)).toBe(true);
    
    // Should include the 4 default interceptor parts
    expect(snap.partIds).toEqual(expect.arrayContaining([
      'fusion_source',
      'fusion_drive', 
      'plasma',
      'positron'
    ]));
    expect(snap.partIds?.length).toBe(4);
  });

  it('should create fleet snapshots that match single-player defaults', async () => {
    const gameStateModule = await import('../../convex/gameState');
    const makeFleetSnaps = gameStateModule.makeStartingFleetSnaps;
    
    const fleetSnaps = makeFleetSnaps(3);
    
    expect(fleetSnaps.length).toBe(3);
    
    // Each ship should have the default parts
    fleetSnaps.forEach(snap => {
      expect(snap).toHaveProperty('partIds');
      expect(snap.partIds).toEqual(expect.arrayContaining([
        'fusion_source',
        'fusion_drive',
        'plasma', 
        'positron'
      ]));
    });
  });

  it('should have parts array for client reconstruction', async () => {
    const gameStateModule = await import('../../convex/gameState');
    
    const snap = gameStateModule.makeBasicInterceptorSnap();
    
    // Should have parts array with id references for client reconstruction
    expect(snap).toHaveProperty('parts');
    expect(Array.isArray(snap.parts)).toBe(true);
    expect(snap.parts?.length).toBe(4);
    
    // Each part should have an id
    snap.parts?.forEach(part => {
      expect(part).toHaveProperty('id');
      expect(typeof part.id).toBe('string');
    });
    
    // Should have the expected part IDs
    const partIds = snap.parts?.map(p => p.id);
    expect(partIds).toEqual(expect.arrayContaining([
      'fusion_source',
      'fusion_drive',
      'plasma',
      'positron'
    ]));
  });
});