import type { Doc } from '../../../convex/_generated/dataModel';

interface TechTileProps {
  tech: Doc<"technologies">;
  isResearched: boolean;
  canAfford: boolean;
  onResearch: () => void;
  disabled?: boolean;
}

/**
 * TechTile - Individual technology card
 *
 * Displays technology name, cost, effects, VP, and unlocked parts
 */
export default function TechTile({
  tech,
  isResearched,
  canAfford,
  onResearch,
  disabled = false
}: TechTileProps) {
  const trackColors = {
    nano: '#8b5cf6',      // Purple
    grid: '#3b82f6',      // Blue
    military: '#ef4444',  // Red
    rare: '#f59e0b',      // Orange
    propulsion: '#10b981', // Green
    plasma: '#ec4899'     // Pink
  };

  const trackColor = trackColors[tech.track] || '#9ca3af';

  return (
    <div
      style={{
        border: `2px solid ${isResearched ? trackColor : '#475569'}`,
        borderRadius: '0.5rem',
        padding: '1rem',
        background: isResearched ? `${trackColor}20` : '#1f2937',
        opacity: isResearched ? 0.7 : 1,
        transition: 'all 0.2s',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '0.5rem'
      }}>
        <div style={{
          fontSize: '0.875rem',
          fontWeight: 'bold',
          color: trackColor,
          flex: 1
        }}>
          {tech.name}
        </div>
        {tech.victoryPoints > 0 && (
          <div style={{
            fontSize: '0.75rem',
            background: '#fbbf24',
            color: '#1f2937',
            padding: '0.125rem 0.375rem',
            borderRadius: '0.25rem',
            fontWeight: 'bold'
          }}>
            {tech.victoryPoints} VP
          </div>
        )}
      </div>

      {/* Tier indicator */}
      <div style={{
        fontSize: '0.75rem',
        color: '#94a3b8',
        marginBottom: '0.5rem'
      }}>
        Tier {tech.tier}
      </div>

      {/* Effect description */}
      <div style={{
        fontSize: '0.75rem',
        color: '#cbd5e1',
        marginBottom: '0.75rem',
        minHeight: '3rem',
        lineHeight: '1.4'
      }}>
        {tech.effect}
      </div>

      {/* Parts unlocked */}
      {tech.unlocksParts.length > 0 && (
        <div style={{
          fontSize: '0.75rem',
          color: '#64748b',
          marginBottom: '0.75rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid #334155'
        }}>
          Unlocks: {tech.unlocksParts.length} part{tech.unlocksParts.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Cost and action */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '0.75rem',
        borderTop: '1px solid #334155'
      }}>
        <div style={{
          fontSize: '0.875rem',
          color: canAfford ? '#3b82f6' : '#ef4444',
          fontWeight: 'bold'
        }}>
          {tech.cost} ⚗️
        </div>

        {isResearched ? (
          <div style={{
            fontSize: '0.75rem',
            color: trackColor,
            fontWeight: 'bold'
          }}>
            ✓ Researched
          </div>
        ) : (
          <button
            onClick={onResearch}
            disabled={disabled || !canAfford}
            style={{
              padding: '0.375rem 0.75rem',
              background: canAfford && !disabled ? trackColor : '#334155',
              border: 'none',
              borderRadius: '0.25rem',
              color: canAfford && !disabled ? '#ffffff' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: canAfford && !disabled ? 'pointer' : 'not-allowed',
              opacity: canAfford && !disabled ? 1 : 0.5
            }}
          >
            Research
          </button>
        )}
      </div>
    </div>
  );
}
