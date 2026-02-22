import { HexGrid, Layout, Hexagon } from 'react-hexgrid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import EclipseSectorTile, { WormholeEdges } from './EclipseSectorTile';
import type { EclipseSector } from '../../types/eclipse-sectors';

interface EclipseGalaxyBoardProps {
  sectors: EclipseSector[];
  onSectorClick?: (sectorId: string) => void;
  onSectorHover?: (sectorId: string | null) => void;
  showCoordinates?: boolean;
  enableZoom?: boolean;
}

/**
 * EclipseGalaxyBoard - Full Eclipse: Second Dawn galaxy map with zoom/pan
 *
 * Renders the complete board game galaxy with:
 * - Galactic Center (001)
 * - Starting sectors (221-232)
 * - Inner/Middle/Outer sector tiles
 * - Guardian sectors
 * - Wormhole connections
 * - Discovery tiles and ancients
 * - Player ships and influence disks
 * - Zoom and pan controls
 */
export default function EclipseGalaxyBoard({
  sectors,
  onSectorClick,
  onSectorHover,
  showCoordinates = false,
  enableZoom = true
}: EclipseGalaxyBoardProps) {
  // Create sector lookup by coordinates
  const sectorMap = new Map<string, EclipseSector>();
  sectors.forEach(sector => {
    if (sector.coordinates) {
      const key = `${sector.coordinates.q},${sector.coordinates.r},${sector.coordinates.s}`;
      sectorMap.set(key, sector);
    }
  });

  const handleHexClick = (_event: unknown, source: { state: { hex: { q: number; r: number; s: number } } }) => {
    const hex = source.state.hex;
    const key = `${hex.q},${hex.r},${hex.s}`;
    const sector = sectorMap.get(key);
    if (sector && onSectorClick) {
      onSectorClick(sector.id);
    }
  };

  const handleHexHover = (_event: unknown, source: { state: { hex: { q: number; r: number; s: number } } }) => {
    if (!onSectorHover) return;
    const hex = source.state.hex;
    const key = `${hex.q},${hex.r},${hex.s}`;
    const sector = sectorMap.get(key);
    onSectorHover(sector?.id || null);
  };

  const handleHexLeave = () => {
    if (onSectorHover) {
      onSectorHover(null);
    }
  };

  // Get hex fill color based on sector state
  const getHexFill = (sector: EclipseSector): string => {
    if (!sector.explored) {
      return '#1e293b'; // Face-down (unexplored)
    }

    if (sector.ring === 'center') {
      return '#3730a3'; // Deep purple for galactic center
    }

    if (sector.ring === 'guardian') {
      return '#7f1d1d'; // Dark red for guardians
    }

    if (sector.controlledBy) {
      return '#1e40af'; // Blue tint for player-controlled
    }

    return '#1f2937'; // Default explored sector
  };

  const galaxyContent = (
    <div className="eclipse-galaxy-board" style={{ width: '100%', height: '100%' }}>
      <HexGrid width={1400} height={900} viewBox="-60 -60 120 120">
        <Layout size={{ x: 7, y: 7 }} flat={true} spacing={1.05}>
          {sectors
            .filter(sector => sector.coordinates) // Only render placed sectors
            .map(sector => {
              const { q, r, s } = sector.coordinates!;

              return (
                <Hexagon
                  key={sector.id}
                  q={q}
                  r={r}
                  s={s}
                  onClick={handleHexClick}
                  onMouseEnter={handleHexHover}
                  onMouseLeave={handleHexLeave}
                  className={`eclipse-hex eclipse-hex-${sector.ring}`}
                  data-sector-id={sector.id}
                  style={{
                    fill: getHexFill(sector),
                    stroke: sector.explored ? '#475569' : '#334155',
                    strokeWidth: sector.ring === 'center' ? 0.3 : 0.15,
                    cursor: 'pointer',
                    transition: 'fill 0.2s, stroke 0.2s'
                  }}
                >
                  {/* Wormhole indicators on edges */}
                  {sector.explored && sector.wormholes.length > 0 && (
                    <WormholeEdges
                      wormholes={sector.wormholes}
                      orientation={sector.orientation}
                    />
                  )}

                  {/* Sector content */}
                  <EclipseSectorTile
                    sector={sector}
                    showCoordinates={showCoordinates}
                  />
                </Hexagon>
              );
            })}
        </Layout>
      </HexGrid>

      {/* CSS for hover effects */}
      <style>{`
        .eclipse-hex:hover {
          stroke: #94a3b8 !important;
          stroke-width: 0.25 !important;
        }

        .eclipse-hex-center:hover {
          fill: #4338ca !important;
        }

        .eclipse-hex-starting:hover {
          fill: #374151 !important;
        }

        .eclipse-hex-guardian:hover {
          fill: #991b1b !important;
        }
      `}</style>
    </div>
  );

  if (!enableZoom) {
    return galaxyContent;
  }

  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.5}
      maxScale={3}
      centerOnInit
      wheel={{ step: 0.1 }}
      panning={{ velocityDisabled: true }}
      doubleClick={{ disabled: false, step: 0.5 }}
    >
      {({ zoomIn, zoomOut, resetTransform }) => (
        <>
          {/* Zoom Controls */}
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <button
              onClick={() => zoomIn()}
              style={{
                padding: '0.5rem 1rem',
                background: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '0.25rem',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: '1.25rem',
                fontWeight: 'bold'
              }}
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => zoomOut()}
              style={{
                padding: '0.5rem 1rem',
                background: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '0.25rem',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: '1.25rem',
                fontWeight: 'bold'
              }}
              title="Zoom Out"
            >
              −
            </button>
            <button
              onClick={() => resetTransform()}
              style={{
                padding: '0.5rem 1rem',
                background: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '0.25rem',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>

          <TransformComponent
            wrapperStyle={{
              width: '100%',
              height: '100%',
              cursor: 'grab'
            }}
            contentStyle={{
              width: '100%',
              height: '100%'
            }}
          >
            {galaxyContent}
          </TransformComponent>
        </>
      )}
    </TransformWrapper>
  );
}
