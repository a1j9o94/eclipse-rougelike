import { useState } from 'react';
import GalaxyBoard from '../components/GalaxyBoard';
import type { SectorData } from '../components/SectorTile';

/**
 * GalaxyDemoPage - Demo page for hex grid galaxy map
 *
 * Shows interactive galaxy board with sample sector data
 */
export default function GalaxyDemoPage() {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [rings, setRings] = useState(3);
  const [useCustomSectors, setUseCustomSectors] = useState(false);

  // Sample custom sector data
  const customSectors: SectorData[] = [
    {
      id: 'center',
      coordinates: { q: 0, r: 0, s: 0 },
      type: 'center',
      explored: true,
    },
    {
      id: 'sector-1',
      coordinates: { q: 1, r: -1, s: 0 },
      type: 'inner',
      explored: true,
      planets: [
        { type: 'terran', resources: 3 },
        { type: 'ice', resources: 1 }
      ],
      ships: [{ playerId: 'player1', count: 2 }]
    },
    {
      id: 'sector-2',
      coordinates: { q: 1, r: 0, s: -1 },
      type: 'inner',
      explored: true,
      planets: [{ type: 'gas', resources: 2 }],
      hasDiscovery: true,
    },
    {
      id: 'sector-3',
      coordinates: { q: 0, r: 1, s: -1 },
      type: 'inner',
      explored: false, // Unexplored
    },
    {
      id: 'sector-4',
      coordinates: { q: -1, r: 1, s: 0 },
      type: 'inner',
      explored: true,
      planets: [{ type: 'desert', resources: 1 }],
      hasAncientShip: true, // Dangerous!
    },
    {
      id: 'sector-5',
      coordinates: { q: -1, r: 0, s: 1 },
      type: 'inner',
      explored: true,
      planets: [
        { type: 'terran', resources: 2 },
        { type: 'terran', resources: 1 }
      ],
    },
    {
      id: 'sector-6',
      coordinates: { q: 0, r: -1, s: 1 },
      type: 'inner',
      explored: true,
      owner: 'player1',
      ships: [{ playerId: 'player1', count: 4 }]
    },
  ];

  const handleHexClick = (sectorId: string) => {
    setSelectedSector(sectorId);
    console.log('Clicked sector:', sectorId);
  };

  const handleHexHover = (sectorId: string | null) => {
    setHoveredSector(sectorId);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(to bottom, #0f172a, #1e1b4b)',
      color: '#e2e8f0',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #334155',
        background: '#1e293b'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          🌌 Eclipse Galaxy Map - Demo
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
          Interactive hex grid with react-hexgrid + React 19
        </p>
      </div>

      {/* Controls */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #334155',
        background: '#1e293b',
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
            Rings: {rings}
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={rings}
            onChange={(e) => setRings(Number(e.target.value))}
            style={{ width: '200px' }}
          />
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useCustomSectors}
              onChange={(e) => setUseCustomSectors(e.target.checked)}
            />
            <span style={{ fontSize: '0.875rem' }}>Use custom sector data</span>
          </label>
        </div>
      </div>

      {/* Galaxy Board */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        overflow: 'auto'
      }}>
        <GalaxyBoard
          rings={rings}
          sectors={useCustomSectors ? customSectors : undefined}
          onHexClick={handleHexClick}
          onHexHover={handleHexHover}
        />
      </div>

      {/* Info Panel */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '1rem',
        background: '#1e293b',
        borderTop: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
          <div>
            <strong>Selected:</strong> {selectedSector || 'none'}
          </div>
          <div>
            <strong>Hovering:</strong> {hoveredSector || 'none'}
          </div>
          <div>
            <strong>Total Hexes:</strong> {rings === 1 ? 7 : rings === 2 ? 19 : rings === 3 ? 37 : rings === 4 ? 61 : 91}
          </div>
        </div>
      </div>
    </div>
  );
}
