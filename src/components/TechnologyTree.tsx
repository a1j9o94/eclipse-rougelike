import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useResearchAction } from "../hooks/useGameActions";
import { usePlayerResources } from "../hooks/useGameState";
import TechTile from "./tech/TechTile";
import type { Id } from "../../convex/_generated/dataModel";
import { useMemo } from "react";

interface TechnologyTreeProps {
  roomId: Id<"rooms">;
  playerId: string;
}

/**
 * TechnologyTree - Display all technologies organized by track
 *
 * Shows 4 columns: Nano, Grid, Military, Rare
 * Highlights researched technologies
 * Allows players to research available technologies
 */
export default function TechnologyTree({ roomId, playerId }: TechnologyTreeProps) {
  // Query all technologies
  const allTechs = useQuery(api.queries.technologies.getAllTechnologies);

  // Query player's researched technologies
  const playerTechs = useQuery(
    api.queries.technologies.getPlayerTechnologies,
    { roomId, playerId }
  );

  // Query player resources
  const resources = usePlayerResources(roomId, playerId);

  // Research action hook
  const research = useResearchAction();

  // Group technologies by track
  const techsByTrack = useMemo(() => {
    if (!allTechs) return { nano: [], grid: [], military: [], rare: [], propulsion: [], plasma: [] };

    return {
      nano: allTechs.filter(t => t.track === 'nano').sort((a, b) => a.tier - b.tier),
      grid: allTechs.filter(t => t.track === 'grid').sort((a, b) => a.tier - b.tier),
      military: allTechs.filter(t => t.track === 'military').sort((a, b) => a.tier - b.tier),
      rare: allTechs.filter(t => t.track === 'rare').sort((a, b) => a.tier - b.tier),
      propulsion: allTechs.filter(t => t.track === 'propulsion').sort((a, b) => a.tier - b.tier),
      plasma: allTechs.filter(t => t.track === 'plasma').sort((a, b) => a.tier - b.tier),
    };
  }, [allTechs]);

  // Set of researched tech IDs
  const researchedIds = useMemo(() => {
    if (!playerTechs) return new Set<string>();
    return new Set(playerTechs.map(pt => pt.technologyId));
  }, [playerTechs]);

  const handleResearch = async (techId: Id<"technologies">) => {
    const result = await research({
      roomId,
      playerId,
      technologyId: techId,
    });

    if (!result.success) {
      console.error("Research failed:", result.error);
      // TODO: Show error toast
    }
  };

  if (!allTechs || !resources) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#94a3b8'
      }}>
        Loading technologies...
      </div>
    );
  }

  const currentScience = resources.science;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflow: 'auto',
      background: '#0f172a',
      padding: '1.5rem'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #334155'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '1.5rem',
          color: '#e2e8f0',
          marginBottom: '0.5rem'
        }}>
          Technology Tree
        </h2>
        <div style={{
          fontSize: '0.875rem',
          color: '#94a3b8'
        }}>
          Science Available: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{currentScience}</span>
        </div>
      </div>

      {/* Technology Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Nano Track */}
        <div>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.125rem',
            color: '#8b5cf6',
            paddingBottom: '0.5rem',
            borderBottom: '2px solid #8b5cf6'
          }}>
            Nano Technologies
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {techsByTrack.nano.map(tech => (
              <TechTile
                key={tech._id}
                tech={tech}
                isResearched={researchedIds.has(tech._id)}
                canAfford={currentScience >= tech.cost}
                onResearch={() => handleResearch(tech._id)}
              />
            ))}
          </div>
        </div>

        {/* Grid Track */}
        <div>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.125rem',
            color: '#3b82f6',
            paddingBottom: '0.5rem',
            borderBottom: '2px solid #3b82f6'
          }}>
            Grid Technologies
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {techsByTrack.grid.map(tech => (
              <TechTile
                key={tech._id}
                tech={tech}
                isResearched={researchedIds.has(tech._id)}
                canAfford={currentScience >= tech.cost}
                onResearch={() => handleResearch(tech._id)}
              />
            ))}
          </div>
        </div>

        {/* Military Track */}
        <div>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.125rem',
            color: '#ef4444',
            paddingBottom: '0.5rem',
            borderBottom: '2px solid #ef4444'
          }}>
            Military Technologies
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {techsByTrack.military.map(tech => (
              <TechTile
                key={tech._id}
                tech={tech}
                isResearched={researchedIds.has(tech._id)}
                canAfford={currentScience >= tech.cost}
                onResearch={() => handleResearch(tech._id)}
              />
            ))}
          </div>
        </div>

        {/* Rare Track */}
        <div>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.125rem',
            color: '#f59e0b',
            paddingBottom: '0.5rem',
            borderBottom: '2px solid #f59e0b'
          }}>
            Rare Technologies
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {techsByTrack.rare.map(tech => (
              <TechTile
                key={tech._id}
                tech={tech}
                isResearched={researchedIds.has(tech._id)}
                canAfford={currentScience >= tech.cost}
                onResearch={() => handleResearch(tech._id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{
        marginTop: '2rem',
        paddingTop: '1rem',
        borderTop: '2px solid #334155',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.875rem'
      }}>
        Researched: {researchedIds.size} / {allTechs.length} technologies
      </div>
    </div>
  );
}
