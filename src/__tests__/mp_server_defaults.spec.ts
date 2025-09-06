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

  it('should have partIds for client reconstruction (no incomplete parts array)', async () => {
    const gameStateModule = await import('../../convex/gameState');
    
    const snap = gameStateModule.makeBasicInterceptorSnap();
    
    // Should have partIds but NOT incomplete parts array
    expect(snap).toHaveProperty('partIds');
    expect(snap).not.toHaveProperty('parts'); // Should not have incomplete parts
    
    // PartIds should contain the default interceptor parts
    expect(Array.isArray(snap.partIds)).toBe(true);
    expect(snap.partIds?.length).toBe(4);
    expect(snap.partIds).toEqual(expect.arrayContaining([
      'fusion_source',
      'fusion_drive',
      'plasma',
      'positron'
    ]));
  });

  it('should allow client to reconstruct ships with proper parts', async () => {
    const gameStateModule = await import('../../convex/gameState');
    const { PARTS } = await import('../game');
    
    const snap = gameStateModule.makeBasicInterceptorSnap();
    
    // Simulate client reconstruction logic  
    const fullParts: unknown[] = Array.isArray(snap?.parts) ? (snap.parts as unknown[]) : [];
    const idList: string[] = Array.isArray(snap?.partIds) ? (snap.partIds as string[]) : [];
    
    // Should use partIds to map to catalog parts (since no fullParts)
    expect(fullParts.length).toBe(0);
    expect(idList.length).toBe(4);
    
    // Map IDs to catalog parts (simplified version of client logic)
    const allParts = [...PARTS.sources, ...PARTS.drives, ...PARTS.weapons, ...PARTS.computers, ...PARTS.shields, ...PARTS.hull];
    const reconstructedParts = idList.map(id => allParts.find(p => p.id === id)).filter(p => p !== undefined);
    
    // Should successfully reconstruct all 4 parts
    expect(reconstructedParts.length).toBe(4);
    
    // Should have the expected part types
    const partNames = reconstructedParts.map(p => p?.name);
    expect(partNames).toEqual(expect.arrayContaining([
      'Fusion Source',
      'Fusion Drive', 
      'Plasma Cannon',
      'Positron Computer'
    ]));
  });
});