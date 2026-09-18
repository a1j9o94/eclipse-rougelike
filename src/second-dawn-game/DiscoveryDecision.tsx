import { useState } from 'react';
import { DISCOVERIES, type DiscoveryEffect } from '../../shared/eclipse/discoveries';
import { ancientTechnologyChoices } from '../../shared/eclipse/technologies';
import type { GameCommand, PendingDecision, PlayerView, Resource } from '../../shared/eclipse/types';
import ShipSilhouette from './ShipSilhouette';
import ShipPartStats, { StatBadge } from './ShipPartStats';
import { PlanetIcon } from './SectorPlanets';
import './discoveryDecision.css';
export interface DiscoveryDecisionProps {
  decision: Extract<PendingDecision, { kind: 'discovery' }>;
  view?: PlayerView;
  disabled: boolean;
  onSubmit: (command: GameCommand) => void;
}
function explanation(effect: DiscoveryEffect): string {
  switch (effect.kind) {
    case 'resources': return 'Add these resources to your supply immediately.';
    case 'ancient-ship-part': return effect.placement === 'outside-grid'
      ? 'Next, install it for free outside a ship blueprint grid or store it for a later Upgrade. Once installed, this part is permanent and uses no grid slot.'
      : 'Next, install it for free in one ship blueprint or store it for a later Upgrade. No research or Upgrade action is needed for immediate installation. Replacing this ancient part later removes it from the game.';
    case 'free-technology': return 'Next, choose a technology with the lowest printed cost among unowned regular technologies in the market. Ties are your choice; a legal track space is required. Pay no science. Its research effect still applies.';
    case 'place-unbuilt-ship': return 'Place one of your unbuilt Cruisers in the discovery sector for free, using your current Cruiser blueprint. If all four Cruisers are already on the board, no ship is added.';
    case 'place-structure': return effect.structure === 'orbital'
      ? 'Place an Orbital in the discovery sector and gain 2 materials. Colonize it with money or science population to raise that income; the Orbital is not populated automatically.'
      : 'Place a Monolith in the discovery sector for free. Its final controller scores 3 VP for the Monolith.';
    case 'place-warp-portal': return 'Place a Warp Portal in the discovery sector. It connects to every other portal sector. Its final controller gains 2 VP from this portal.';
  }
}
function RewardStats({ effect }: { effect: DiscoveryEffect }) {
  if (effect.kind === 'ancient-ship-part') return <ShipPartStats partId={effect.part}/>;
  const details = explanation(effect);
  return <div className="dg-part-stats">
    {effect.kind === 'resources' && (['money','science','materials'] as const).filter(resource=>effect.resources[resource]>0).map(resource => <ResourceReward key={resource} resource={resource} amount={effect.resources[resource]}/>)}
    {effect.kind === 'free-technology' && <StatBadge icon="discovery" value="1" label="free technology" explanation={details}/>}
    {effect.kind === 'place-unbuilt-ship' && <PieceReward piece="cruiser" explanation={details}/>}
    {effect.kind === 'place-structure' && <><PieceReward piece={effect.structure} explanation={details}/>{effect.structure === 'monolith' ? <StatBadge icon="discovery" value="3 VP" label="final controller" explanation={details}/> : <ResourceReward resource="materials" amount={effect.bonusMaterials}/>}</>}
    {effect.kind === 'place-warp-portal' && <><StatBadge icon="portal" value="+1" label="warp portal" explanation={details}/><StatBadge icon="discovery" value="2 VP" label="final controller" explanation={details}/></>}
  </div>;
}
function PieceReward({ piece, explanation: details }: { piece: 'cruiser'|'orbital'|'monolith'; explanation: string }) {
  return <span role="img" className="dg-stat-badge dg-discovery-piece" aria-label={`+1 ${piece}. ${details}`} title={details}>
    {piece === 'cruiser' ? <span aria-hidden="true"><ShipSilhouette type="cruiser"/></span> : <svg viewBox="0 0 32 32" className="dg-stat-icon" aria-hidden="true">{piece === 'orbital' ? <><circle cx="16" cy="16" r="6"/><ellipse cx="16" cy="16" rx="14" ry="5" transform="rotate(-30 16 16)"/></> : <><path d="M10 28V6L21 2v26Z"/><path d="m10 6 11-4M17 5v23"/></>}</svg>}
    <strong>+1</strong><small>{piece}</small>
  </span>;
}
function ResourceReward({ resource, amount }: { resource: Resource; amount: number }) {
  const name = resource[0].toUpperCase() + resource.slice(1);
  return <span role="img" className={`dg-stat-badge dg-discovery-${resource}`} aria-label={`${name}: +${amount}. Gain immediately.`}><svg viewBox="0 0 20 20" className="dg-stat-icon" aria-hidden="true"><PlanetIcon resource={resource}/></svg><strong>+{amount}</strong><small>{name}</small></span>;
}
export default function DiscoveryDecision({ decision, view, disabled, onSubmit }: DiscoveryDecisionProps) {
  const [option, setOption] = useState<'keep'|'use'|null>(null);
  const discovery = DISCOVERIES.find(tile => tile.id === decision.tileId);
  if (!discovery) return <p role="alert">This discovery is absent from the match catalog. Reconnect to restore its details.</p>;
  const seat = view?.seats.find(candidate => candidate.id === decision.owner);
  const noTechnology = discovery.effect.kind === 'free-technology' && view && seat && ancientTechnologyChoices(view.technologyMarket, seat.technologies).length === 0;
  const useAvailable = decision.options.includes('use') && !noTechnology;
  const keepAvailable = decision.options.includes('keep');
  const sector = view?.sectors.find(candidate => candidate.id === decision.sectorId);
  return <section className="dg-discovery-decision">
    <span className="dg-yard-eyebrow">Discovery revealed{sector ? ` · Sector ${sector.tileId}` : ''}</span>
    <h2>{discovery.name}</h2>
    <div className="dg-discovery-alternatives" role="radiogroup" aria-label="Discovery reward">
      <section className={`dg-discovery-reward ${option === 'use' ? 'dg-discovery-selected' : ''}`}>
        <label className="dg-discovery-side"><input type="radio" name={`discovery-${decision.id}`} checked={option==='use'} disabled={disabled || !useAvailable} onChange={()=>setOption('use')}/>Use {discovery.name}</label>
        <RewardStats effect={discovery.effect}/>
        <p>{explanation(discovery.effect)}</p>
        {!useAvailable && <p className="dg-danger">{noTechnology ? 'No eligible lowest-cost technology remains. Keep this tile for 2 VP.' : 'The reward cannot be used in this position.'}</p>}
      </section>
      <section className={`dg-discovery-reward dg-discovery-vp ${option === 'keep' ? 'dg-discovery-selected' : ''}`}>
        <label className="dg-discovery-side"><input type="radio" name={`discovery-${decision.id}`} checked={option==='keep'} disabled={disabled || !keepAvailable} onChange={()=>setOption('keep')}/>Keep for 2 VP</label>
        <StatBadge icon="discovery" value="2 VP" label="discovery points" explanation="Keep the tile for two victory points instead of receiving its reward."/>
        <p>Keep the tile. Gain 2 victory points; do not receive its reward.</p>
      </section>
    </div>
    <button className="sd-primary" disabled={disabled || option===null || (option==='use' ? !useAvailable : !keepAvailable)} onClick={()=>{if(option)onSubmit({type:'resolve',decisionId:decision.id,choice:{kind:'discovery',option}});}}>Confirm discovery</button>
    <p className="dg-discovery-note">Choose a side, then confirm. The revealed tile is already saved.</p>
  </section>;
}
