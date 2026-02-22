import { Text } from 'react-hexgrid';
import type { EclipseSector, PopulationSquare } from '../../types/eclipse-sectors';

interface EclipseSectorTileProps {
  sector: EclipseSector;
  showCoordinates?: boolean;
}

/**
 * EclipseSectorTile - Renders Eclipse: Second Dawn sector content
 *
 * Displays:
 * - Population squares (colored by resource type)
 * - Wormhole gates on hex edges
 * - Discovery tiles with ancient ships
 * - Influence disks (player control)
 * - Ship counts by player
 */
export default function EclipseSectorTile({
  sector,
  showCoordinates = false
}: EclipseSectorTileProps) {
  // Unexplored sectors show as face-down
  if (!sector.explored) {
    return (
      <g>
        <Text y={0} style={{ fontSize: '0.3em', fill: '#64748b', fontWeight: 'bold' }}>
          {sector.ring.toUpperCase()}
        </Text>
        <Text y={1.5} style={{ fontSize: '0.25em', fill: '#475569' }}>
          {sector.id}
        </Text>
      </g>
    );
  }

  // Galactic Center
  if (sector.ring === 'center') {
    return (
      <g>
        <Text y={-0.5} style={{ fontSize: '0.35em', fill: '#fbbf24', fontWeight: 'bold' }}>
          GALACTIC
        </Text>
        <Text y={1} style={{ fontSize: '0.35em', fill: '#fbbf24', fontWeight: 'bold' }}>
          CENTER
        </Text>
        <Text y={2.5} style={{ fontSize: '0.2em', fill: '#94a3b8' }}>
          {sector.id}
        </Text>
      </g>
    );
  }

  return (
    <g>
      {/* Sector ID (small, top) */}
      {showCoordinates && sector.coordinates && (
        <Text y={-3.5} style={{ fontSize: '0.18em', fill: '#64748b' }}>
          {sector.id} ({sector.coordinates.q},{sector.coordinates.r})
        </Text>
      )}

      {/* Population Squares */}
      {sector.populationSquares.length > 0 && (
        <PopulationSquares squares={sector.populationSquares} />
      )}

      {/* Discovery Tile */}
      {sector.discoveryTile && (
        <DiscoveryTileOverlay tile={sector.discoveryTile} />
      )}

      {/* Ancients */}
      {sector.ancients.length > 0 && (
        <AncientShips ancients={sector.ancients} />
      )}

      {/* Ships */}
      {sector.ships.length > 0 && (
        <PlayerShips ships={sector.ships} />
      )}

      {/* Influence Disk */}
      {sector.influenceDisk && (
        <InfluenceDisk playerId={sector.influenceDisk} controlled={sector.controlledBy === sector.influenceDisk} />
      )}

      {/* Wormholes rendered on hex edges (handled by parent) */}
    </g>
  );
}

/**
 * Render population squares in a grid layout
 */
function PopulationSquares({ squares }: { squares: PopulationSquare[] }) {
  const colors = {
    gray: '#9ca3af',
    money: '#fbbf24', // Yellow
    science: '#3b82f6', // Blue
    materials: '#f97316' // Orange
  };

  // Layout population squares in a grid (max 3 per row)
  const positions = [
    { x: -2, y: -1 }, { x: 0, y: -1 }, { x: 2, y: -1 }, // Top row
    { x: -2, y: 0.5 }, { x: 0, y: 0.5 }, { x: 2, y: 0.5 }, // Middle row
    { x: -1, y: 2 }, { x: 1, y: 2 } // Bottom row
  ];

  return (
    <g>
      {squares.slice(0, 8).map((square, i) => {
        const pos = positions[i] || { x: 0, y: 0 };
        return (
          <g key={i}>
            {/* Population square */}
            <rect
              x={pos.x - 0.6}
              y={pos.y - 0.6}
              width={1.2}
              height={1.2}
              fill={colors[square.type]}
              stroke="#1f2937"
              strokeWidth={0.1}
              rx={0.15}
            />
            {/* Advanced marker (star) */}
            {square.advanced && (
              <Text
                x={pos.x}
                y={pos.y + 0.35}
                style={{ fontSize: '0.4em', fill: '#ffffff' }}
              >
                ★
              </Text>
            )}
            {/* Resource value */}
            {square.resources > 0 && !square.advanced && (
              <Text
                x={pos.x}
                y={pos.y + 0.3}
                style={{ fontSize: '0.35em', fill: '#ffffff', fontWeight: 'bold' }}
              >
                {square.resources}
              </Text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/**
 * Render discovery tile overlay
 */
function DiscoveryTileOverlay({ tile }: { tile: { revealed: boolean; ancientCount: number; value?: number } }) {
  if (!tile.revealed) {
    return (
      <g>
        <circle cx={0} cy={2} r={1.2} fill="#7c3aed" stroke="#5b21b6" strokeWidth={0.15} />
        <Text y={2.3} style={{ fontSize: '0.3em', fill: '#ffffff', fontWeight: 'bold' }}>
          ?
        </Text>
      </g>
    );
  }

  return (
    <g>
      <circle cx={0} cy={2} r={1.2} fill="#10b981" stroke="#059669" strokeWidth={0.15} />
      <Text y={2.3} style={{ fontSize: '0.3em', fill: '#ffffff', fontWeight: 'bold' }}>
        {tile.value || '?'}
      </Text>
    </g>
  );
}

/**
 * Render ancient ships
 */
function AncientShips({ ancients }: { ancients: { count: number; type: string }[] }) {
  const totalAncients = ancients.reduce((sum, a) => sum + a.count, 0);

  return (
    <g>
      <Text y={3.5} style={{ fontSize: '0.35em', fill: '#ef4444', fontWeight: 'bold' }}>
        ⚠ {totalAncients}
      </Text>
    </g>
  );
}

/**
 * Render player ships
 */
function PlayerShips({ ships }: { ships: { playerId: string; count: number; pinned: boolean }[] }) {
  const totalShips = ships.reduce((sum, s) => sum + s.count, 0);
  const hasPinned = ships.some(s => s.pinned);

  return (
    <g>
      <Text y={-2.5} style={{ fontSize: '0.35em', fill: '#3b82f6', fontWeight: 'bold' }}>
        🚀 {totalShips}
        {hasPinned && <tspan style={{ fontSize: '0.25em', fill: '#94a3b8' }}> (P)</tspan>}
      </Text>
    </g>
  );
}

/**
 * Render influence disk
 */
function InfluenceDisk({ playerId, controlled }: { playerId: string; controlled: boolean }) {
  // Player color mapping (temporary - should come from game state)
  const playerColors: Record<string, string> = {
    player1: '#ef4444',
    player2: '#3b82f6',
    player3: '#10b981',
    player4: '#f59e0b',
    player5: '#8b5cf6',
    player6: '#ec4899'
  };

  const color = playerColors[playerId] || '#9ca3af';

  return (
    <g>
      <circle
        cx={0}
        cy={-1}
        r={0.8}
        fill={controlled ? color : 'none'}
        stroke={color}
        strokeWidth={0.2}
      />
      {controlled && (
        <Text y={-0.7} style={{ fontSize: '0.3em', fill: '#ffffff', fontWeight: 'bold' }}>
          ●
        </Text>
      )}
    </g>
  );
}

/**
 * Render wormhole indicators on hex edges
 * (This should be rendered on the Hexagon itself, not inside the tile)
 */
export function WormholeEdges({ wormholes, orientation }: { wormholes: { direction: number }[]; orientation: number }) {
  // Wormhole positions on hex edges (distance from center)
  const edgeDistance = 5.5;

  return (
    <g>
      {wormholes.map((wh, i) => {
        const effectiveDirection = (wh.direction + orientation) % 6;
        const angle = (effectiveDirection * 60 - 90) * (Math.PI / 180);
        const x = Math.cos(angle) * edgeDistance;
        const y = Math.sin(angle) * edgeDistance;

        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={0.5}
            fill="#8b5cf6"
            stroke="#6d28d9"
            strokeWidth={0.15}
          />
        );
      })}
    </g>
  );
}
