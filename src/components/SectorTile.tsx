import { Text } from 'react-hexgrid';

export interface SectorData {
  id: string;
  coordinates: { q: number; r: number; s: number };
  type: 'center' | 'inner' | 'middle' | 'outer' | 'starting';
  explored: boolean;
  owner?: string; // playerId
  planets?: {
    type: 'terran' | 'ice' | 'desert' | 'gas';
    resources: number;
  }[];
  wormholes?: string[]; // IDs of connected sectors
  hasAncientShip?: boolean;
  hasDiscovery?: boolean;
  ships?: {
    playerId: string;
    count: number;
  }[];
}

interface SectorTileProps {
  sector: SectorData;
  onClick?: () => void;
}

/**
 * SectorTile - Content renderer for a single hex sector
 *
 * Renders planets, resources, wormholes, ships, etc.
 * Used inside a react-hexgrid <Hexagon>
 */
export default function SectorTile({ sector }: SectorTileProps) {
  const { explored, type, planets, hasAncientShip, ships } = sector;

  // Unexplored sectors show as face-down
  if (!explored) {
    return (
      <Text style={{ fontSize: '0.25em', fill: '#718096' }}>
        ?
      </Text>
    );
  }

  // Center hex
  if (type === 'center') {
    return (
      <g>
        <Text y={0} style={{ fontSize: '0.25em', fill: '#fbbf24', fontWeight: 'bold' }}>
          Galactic
        </Text>
        <Text y={1.5} style={{ fontSize: '0.25em', fill: '#fbbf24', fontWeight: 'bold' }}>
          Center
        </Text>
      </g>
    );
  }

  // Calculate total resources
  const totalResources = planets?.reduce((sum, p) => sum + p.resources, 0) || 0;

  return (
    <g>
      {/* Sector coordinates (small) */}
      <Text y={-2.5} style={{ fontSize: '0.2em', fill: '#9ca3af' }}>
        {sector.coordinates.q},{sector.coordinates.r}
      </Text>

      {/* Planet icons (simplified as circles for now) */}
      {planets && planets.length > 0 && (
        <g>
          {planets.slice(0, 3).map((planet, i) => {
            const colors = {
              terran: '#10b981',
              ice: '#60a5fa',
              desert: '#f59e0b',
              gas: '#a78bfa'
            };
            return (
              <circle
                key={i}
                cx={-2 + i * 2}
                cy={-0.5}
                r={0.6}
                fill={colors[planet.type]}
                stroke="#1f2937"
                strokeWidth={0.1}
              />
            );
          })}
        </g>
      )}

      {/* Resource count */}
      {totalResources > 0 && (
        <Text y={1} style={{ fontSize: '0.3em', fill: '#fbbf24' }}>
          ⚛ {totalResources}
        </Text>
      )}

      {/* Ancient ship indicator */}
      {hasAncientShip && (
        <Text y={2.5} style={{ fontSize: '0.25em', fill: '#ef4444' }}>
          ⚠ Ancient
        </Text>
      )}

      {/* Ship count */}
      {ships && ships.length > 0 && (
        <Text y={3.5} style={{ fontSize: '0.3em', fill: '#3b82f6' }}>
          🚀 {ships.reduce((sum, s) => sum + s.count, 0)}
        </Text>
      )}
    </g>
  );
}
