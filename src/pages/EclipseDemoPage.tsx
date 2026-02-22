import { useState } from 'react';
import EclipseGalaxyBoard from '../components/eclipse/EclipseGalaxyBoard';
import { SAMPLE_2_PLAYER_GALAXY } from '../data/sample-eclipse-sectors';
import type { EclipseSector } from '../types/eclipse-sectors';

/**
 * EclipseDemoPage - Demo of Eclipse: Second Dawn galaxy board
 *
 * Shows actual Eclipse board game mechanics:
 * - Galactic Center
 * - Starting sectors for players
 * - Inner/Middle/Outer sector tiles
 * - Population squares (4 resource types)
 * - Wormhole connections
 * - Discovery tiles with Ancients
 * - Guardian sectors
 * - Player ships and influence disks
 */
export default function EclipseDemoPage() {
  const [sectors] = useState<EclipseSector[]>(SAMPLE_2_PLAYER_GALAXY);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [showCoordinates, setShowCoordinates] = useState(true);

  const handleSectorClick = (sectorId: string) => {
    setSelectedSector(sectorId);
    console.log('Clicked sector:', sectorId);
  };

  const handleSectorHover = (sectorId: string | null) => {
    setHoveredSector(sectorId);
  };

  // Get sector details for info panel
  const selectedSectorData = sectors.find(s => s.id === selectedSector);
  const hoveredSectorData = sectors.find(s => s.id === hoveredSector);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(to bottom, #0f172a, #1e1b4b)',
      color: '#e2e8f0',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #334155',
        background: '#1e293b'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          🌌 Eclipse: Second Dawn for the Galaxy
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
          Full board game implementation - 2 player demo
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
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showCoordinates}
              onChange={(e) => setShowCoordinates(e.target.checked)}
            />
            <span style={{ fontSize: '0.875rem' }}>Show coordinates & IDs</span>
          </label>
        </div>

        <div style={{ fontSize: '0.875rem' }}>
          Sectors: {sectors.length} total ({sectors.filter(s => s.explored).length} explored)
        </div>
      </div>

      {/* Galaxy Board */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        overflow: 'auto',
        position: 'relative'
      }}>
        <EclipseGalaxyBoard
          sectors={sectors}
          onSectorClick={handleSectorClick}
          onSectorHover={handleSectorHover}
          showCoordinates={showCoordinates}
        />
      </div>

      {/* Info Panel */}
      <div style={{
        padding: '1rem',
        background: '#1e293b',
        borderTop: '1px solid #334155',
        maxHeight: '200px',
        overflow: 'auto'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontSize: '0.875rem' }}>
          {/* Hovered Sector */}
          <div>
            <strong style={{ color: '#94a3b8' }}>Hovering:</strong> {hoveredSector || 'none'}
            {hoveredSectorData && (
              <div style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
                <div>Ring: {hoveredSectorData.ring}</div>
                <div>Explored: {hoveredSectorData.explored ? 'Yes' : 'No'}</div>
                {hoveredSectorData.explored && (
                  <>
                    <div>Population Squares: {hoveredSectorData.populationSquares.length}</div>
                    <div>Wormholes: {hoveredSectorData.wormholes.length}</div>
                    {hoveredSectorData.discoveryTile && (
                      <div style={{ color: '#a78bfa' }}>
                        Discovery Tile (Ancients: {hoveredSectorData.discoveryTile.ancientCount})
                      </div>
                    )}
                    {hoveredSectorData.controlledBy && (
                      <div style={{ color: '#10b981' }}>
                        Controlled by: {hoveredSectorData.controlledBy}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Selected Sector */}
          <div>
            <strong style={{ color: '#94a3b8' }}>Selected:</strong> {selectedSector || 'none'}
            {selectedSectorData && (
              <div style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
                <div>ID: {selectedSectorData.id}</div>
                <div>Ring: {selectedSectorData.ring}</div>
                {selectedSectorData.coordinates && (
                  <div>
                    Coordinates: ({selectedSectorData.coordinates.q}, {selectedSectorData.coordinates.r}, {selectedSectorData.coordinates.s})
                  </div>
                )}
                {selectedSectorData.explored && (
                  <>
                    <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>Resources:</div>
                    {selectedSectorData.populationSquares.map((pop, i) => (
                      <div key={i} style={{ paddingLeft: '1rem' }}>
                        {pop.type} {pop.advanced && '★'}: {pop.resources}
                      </div>
                    ))}
                    {selectedSectorData.ships.length > 0 && (
                      <>
                        <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>Ships:</div>
                        {selectedSectorData.ships.map((ship, i) => (
                          <div key={i} style={{ paddingLeft: '1rem' }}>
                            {ship.playerId}: {ship.count} {ship.pinned && '(pinned)'}
                          </div>
                        ))}
                      </>
                    )}
                    {selectedSectorData.ancients.length > 0 && (
                      <>
                        <div style={{ marginTop: '0.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                          Ancients:
                        </div>
                        {selectedSectorData.ancients.map((ancient, i) => (
                          <div key={i} style={{ paddingLeft: '1rem', color: '#ef4444' }}>
                            {ancient.type}: {ancient.count}
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        padding: '0.75rem 1rem',
        background: '#0f172a',
        borderTop: '1px solid #334155',
        fontSize: '0.75rem',
        color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div><span style={{ color: '#fbbf24' }}>●</span> Money</div>
          <div><span style={{ color: '#3b82f6' }}>●</span> Science</div>
          <div><span style={{ color: '#f97316' }}>●</span> Materials</div>
          <div><span style={{ color: '#9ca3af' }}>●</span> Gray (Any)</div>
          <div><span style={{ color: '#8b5cf6' }}>●</span> Wormhole</div>
          <div><span style={{ color: '#7c3aed' }}>●</span> Discovery</div>
          <div><span style={{ color: '#ef4444' }}>⚠</span> Ancients</div>
          <div>★ = Advanced (requires tech)</div>
        </div>
      </div>
    </div>
  );
}
