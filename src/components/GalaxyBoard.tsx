import { HexGrid, Layout, Hexagon, GridGenerator, Hex } from 'react-hexgrid';
import SectorTile, { type SectorData } from './SectorTile';

interface GalaxyBoardProps {
  rings?: number;
  sectors?: SectorData[];
  onHexClick?: (sectorId: string) => void;
  onHexHover?: (sectorId: string | null) => void;
}

/**
 * GalaxyBoard - Interactive hex grid for galaxy map
 *
 * Supports both simple demo mode (no sectors) and full game mode (with SectorData)
 */
export default function GalaxyBoard({
  rings = 3,
  sectors,
  onHexClick,
  onHexHover
}: GalaxyBoardProps) {
  // Generate hex grid using cubic coordinates (q, r, s where q + r + s = 0)
  const centerHex = new Hex(0, 0, 0);

  // Generate rings around center
  const hexagons: Hex[] = [centerHex];
  for (let ring = 1; ring <= rings; ring++) {
    const ringHexes = GridGenerator.ring(centerHex, ring);
    hexagons.push(...ringHexes);
  }

  // Create sector lookup by coordinates
  const sectorMap = new Map<string, SectorData>();
  if (sectors) {
    sectors.forEach(sector => {
      const key = `${sector.coordinates.q},${sector.coordinates.r},${sector.coordinates.s}`;
      sectorMap.set(key, sector);
    });
  }

  const handleHexClick = (_event: unknown, source: { state: { hex: Hex } }) => {
    const hex = source.state.hex;
    const key = `${hex.q},${hex.r},${hex.s}`;
    const sector = sectorMap.get(key);
    if (sector && onHexClick) {
      onHexClick(sector.id);
    }
  };

  const handleHexHover = (_event: unknown, source: { state: { hex: Hex } }) => {
    if (!onHexHover) return;
    const hex = source.state.hex;
    const key = `${hex.q},${hex.r},${hex.s}`;
    const sector = sectorMap.get(key);
    onHexHover(sector?.id || null);
  };

  const handleHexLeave = () => {
    if (onHexHover) {
      onHexHover(null);
    }
  };

  const getSectorType = (index: number): SectorData['type'] => {
    if (index === 0) return 'center';
    if (index <= 6) return 'inner';
    if (index <= 18) return 'middle';
    return 'outer';
  };

  return (
    <div className="galaxy-board" style={{ width: '100%', height: '100%' }}>
      <HexGrid width={1200} height={800} viewBox="-50 -50 100 100">
        <Layout size={{ x: 6, y: 6 }} flat={true} spacing={1.1}>
          {hexagons.map((hex, i) => {
            const key = `${hex.q},${hex.r},${hex.s}`;
            const sector = sectorMap.get(key);

            // If sectors provided, only render those in the map
            // Otherwise render all hexes in demo mode
            const shouldRender = !sectors || sector;

            if (!shouldRender) return null;

            // Demo sector for testing
            const demoSector: SectorData = sector || {
              id: `hex-${i}`,
              coordinates: { q: hex.q, r: hex.r, s: hex.s },
              type: getSectorType(i),
              explored: true,
              planets: i === 0 ? undefined : i % 3 === 0 ? [
                { type: 'terran', resources: 2 }
              ] : undefined,
              hasAncientShip: i === 7,
            };

            return (
              <Hexagon
                key={`hex-${hex.q}-${hex.r}-${hex.s}`}
                q={hex.q}
                r={hex.r}
                s={hex.s}
                onClick={handleHexClick}
                onMouseEnter={handleHexHover}
                onMouseLeave={handleHexLeave}
                className="galaxy-hex"
                style={{
                  fill: i === 0 ? '#4a5568' : demoSector.explored ? '#2d3748' : '#1f2937',
                  stroke: '#718096',
                  strokeWidth: 0.2,
                  cursor: 'pointer',
                  transition: 'fill 0.2s'
                }}
              >
                <SectorTile sector={demoSector} />
              </Hexagon>
            );
          })}
        </Layout>
      </HexGrid>
    </div>
  );
}
