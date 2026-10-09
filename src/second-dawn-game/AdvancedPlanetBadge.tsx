import './advancedPlanetBadge.css';

/** The same advanced-planet designation in every inspector, planner and preview. */
export default function AdvancedPlanetBadge({className = '', decorative = false}: {className?: string; decorative?: boolean}) {
  return <svg width="16" height="16" viewBox="0 0 16 16" className={`dg-advanced-planet-badge ${className}`} data-planet-feature="advanced" role={decorative?undefined:'img'} aria-hidden={decorative?true:undefined} aria-label={decorative?undefined:'Advanced planet'}>
    <path className="dg-advanced-badge-star" d="M8 1l2 4 5 .7-3.5 3.4.8 4.9L8 11.7 3.7 14l.8-4.9L1 5.7 6 5Z"/>
    <path className="dg-advanced-badge-facet" d="M8 1v10.7L10 5Z"/>
  </svg>;
}
