import { useGalaxyState } from '../../hooks/useGalaxyState';
import EclipseGalaxyBoard from '../eclipse/EclipseGalaxyBoardWithZoom';
import type { Id } from '../../../convex/_generated/dataModel';

interface ConnectedGalaxyBoardProps {
  roomId: Id<"rooms">;
  onSectorClick?: (sectorId: string) => void;
  onSectorHover?: (sectorId: string | null) => void;
  showCoordinates?: boolean;
  enableZoom?: boolean;
}

/**
 * ConnectedGalaxyBoard - Galaxy board connected to Convex real-time state
 *
 * Automatically updates when any player modifies the galaxy:
 * - Exploration (new sectors placed)
 * - Influence (control changes)
 * - Ship movement (ship positions change)
 * - Combat (ship destruction)
 * - Resource placement (population cubes)
 */
export default function ConnectedGalaxyBoard({
  roomId,
  onSectorClick,
  onSectorHover,
  showCoordinates = false,
  enableZoom = true,
}: ConnectedGalaxyBoardProps) {
  const { sectors, isLoading } = useGalaxyState(roomId);

  if (isLoading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontSize: '1.25rem'
      }}>
        Loading galaxy...
      </div>
    );
  }

  if (sectors.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontSize: '1.25rem',
        gap: '1rem'
      }}>
        <div>No galaxy initialized</div>
        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Waiting for game to start...
        </div>
      </div>
    );
  }

  return (
    <EclipseGalaxyBoard
      sectors={sectors}
      onSectorClick={onSectorClick}
      onSectorHover={onSectorHover}
      showCoordinates={showCoordinates}
      enableZoom={enableZoom}
    />
  );
}
