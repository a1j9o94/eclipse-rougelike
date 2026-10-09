import AdvancedPlanetBadge from './AdvancedPlanetBadge';
import type { PlayerView } from '../../shared/eclipse/types';
import type { Technology } from '../../shared/eclipse/technologies';
import { advancedPopulationOpportunity } from './advancedPopulationOpportunity';
import { PlanetIcon } from './SectorPlanets';
import './advancedPopulationPreview.css';

export default function AdvancedPopulationPreview({ view, technology, detailed = false }: { view: PlayerView; technology: Technology; detailed?: boolean }) {
  const opportunity = advancedPopulationOpportunity(view, technology);
  if (!opportunity) return null;
  const { eligible, resource, newOptions, populationCapacity, colonyShips, cubes } = opportunity;
  const label = `${eligible} eligible empty advanced planet${eligible === 1 ? '' : 's'}${resource === 'all' ? '' : ` for ${resource}`}`;
  return <div className={`dg-advanced-opportunity dg-advanced-opportunity--${resource}`}>
    <div className="dg-advanced-count" aria-label={label} title={`${label} in sectors you control. Includes advanced gray planets.`}>
      <span className="dg-advanced-planet" aria-hidden="true"><svg viewBox="0 0 20 20"><PlanetIcon resource={resource === 'all' ? 'gray' : resource}/></svg><AdvancedPlanetBadge className="dg-advanced-star" decorative/></span>
      <b aria-hidden="true">{eligible}</b><span aria-hidden="true">empty planet{eligible === 1 ? '' : 's'}<small>in your sectors</small></span>
    </div>
    {detailed && <div className="dg-advanced-detail">
      <p>{newOptions === 0 ? eligible ? 'Already unlocked by your researched technologies.' : 'No eligible empty advanced planets in your sectors.' : resource === 'all' ? `${newOptions} planet${newOptions === 1 ? ' gains' : 's gain'} new resource options after research.` : `${newOptions} newly unlocked for ${resource} after research.`} {resource === 'all' ? 'Each gray planet holds one cube.' : 'Includes advanced gray planets.'}</p>
      <strong>Up to {populationCapacity} population with current supplies</strong>
      <span className="dg-advanced-supplies">{colonyShips} colony ship{colonyShips === 1 ? '' : 's'} · {cubes.map(cube => `${cube.available} ${cube.resource}`).join(' / ')} cube{cubes.reduce((sum,cube)=>sum+cube.available,0) === 1 ? '' : 's'} available</span>
      <small>After research, choose planets to colonize during your turn. Research does not place population.</small>
    </div>}
  </div>;
}
