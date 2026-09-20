import {researchedTechnologyIds} from '../../shared/eclipse/technologies';
import SectorFeatureIcon from './SectorFeatureIcon';
import type {FactionId} from '../../shared/eclipse/catalog';
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
    case 'choice-resources': return effect.money ? `Gain ${effect.money} money, then choose ${effect.amount} resources.` : `Choose ${effect.amount} resources.`;
    case 'end-game-bonus': return effect.bonus === 'artifacts' ? 'At game end, score 1 VP for each artifact you control.' : 'At game end, score 1 VP for every 3 reputation VP you hold.';
  }
}
function rewardAction(effect: DiscoveryEffect): string {
  switch(effect.kind){
    case 'resources': return `Gain ${(['money','science','materials'] as const).filter(r=>effect.resources[r]).map(r=>`${effect.resources[r]} ${r}`).join(', ')}`;
    case 'ancient-ship-part': return `Install or store ${DISCOVERIES.find(d=>d.effect===effect)?.name ?? 'component'}`;
    case 'free-technology': return 'Choose free technology';
    case 'place-unbuilt-ship': return 'Place free Cruiser';
    case 'place-structure': return `Place free ${effect.structure}`;
    case 'place-warp-portal': return 'Place Warp Portal';
    case 'choice-resources': return effect.money ? `Gain ${effect.money} money and choose resources` : 'Choose resources';
    case 'end-game-bonus': return 'Keep end-game bonus';
  }
}
function RewardStats({ effect,faction }: { effect: DiscoveryEffect;faction?:FactionId }) {
  if (effect.kind === 'ancient-ship-part') return <ShipPartStats partId={effect.part}/>;
  const details = explanation(effect);
  return <div className="dg-part-stats">
    {effect.kind === 'resources' && (['money','science','materials'] as const).filter(resource=>effect.resources[resource]>0).map(resource => <ResourceReward key={resource} resource={resource} amount={effect.resources[resource]}/>)}
    {effect.kind === 'free-technology' && <StatBadge icon="discovery" value="1" label="free technology" explanation={details}/>}
    {effect.kind === 'place-unbuilt-ship' && <PieceReward piece="cruiser" explanation={details} faction={faction}/>}
    {effect.kind === 'place-structure' && <><PieceReward piece={effect.structure} explanation={details}/>{effect.structure === 'monolith' ? <StatBadge icon="discovery" value="3 VP" label="final controller" explanation={details}/> : <ResourceReward resource="materials" amount={effect.bonusMaterials}/>}</>}
    {effect.kind === 'place-warp-portal' && <><StatBadge icon="portal" value="+1" label="warp portal" explanation={details}/><StatBadge icon="discovery" value="2 VP" label="final controller" explanation={details}/></>}
    {effect.kind === 'choice-resources' && <><ResourceReward resource="money" amount={effect.money}/><StatBadge icon="discovery" value={`${effect.amount}`} label="chosen resources" explanation={details}/></>}
    {effect.kind === 'end-game-bonus' && <StatBadge icon="discovery" value="+1 VP" label={effect.bonus === 'artifacts' ? 'per artifact' : 'per 3 reputation VP'} explanation={details}/>}
  </div>;
}
function PieceReward({ piece, explanation: details,faction }: { piece: 'cruiser'|'orbital'|'monolith'; explanation: string;faction?:FactionId }) {
  return <span role="img" className="dg-stat-badge dg-discovery-piece" aria-label={`+1 ${piece}. ${details}`} title={details}>
    {piece === 'cruiser' ? <span aria-hidden="true"><ShipSilhouette type="cruiser" faction={faction}/></span> : <svg viewBox="0 0 32 32" className="dg-stat-icon" aria-hidden="true">{piece === 'orbital' ? <><circle cx="16" cy="16" r="6"/><ellipse cx="16" cy="16" rx="14" ry="5" transform="rotate(-30 16 16)"/></> : <><path d="M10 28V6L21 2v26Z"/><path d="m10 6 11-4M17 5v23"/></>}</svg>}
    <strong>+1</strong><small>{piece}</small>
  </span>;
}
function ResourceReward({ resource, amount }: { resource: Resource; amount: number }) {
  const name = resource[0].toUpperCase() + resource.slice(1);
  return <span role="img" className={`dg-stat-badge dg-discovery-${resource}`} aria-label={`${name}: +${amount}. Gain immediately.`}><svg viewBox="0 0 20 20" className="dg-stat-icon" aria-hidden="true"><PlanetIcon resource={resource}/></svg><strong>+{amount}</strong><small>{name}</small></span>;
}
export default function DiscoveryDecision({ decision, view, disabled, onSubmit }: DiscoveryDecisionProps) {
  const [option, setOption] = useState<'keep'|'use'|null>(null);
  const [selectedDiscoveryId,setSelectedDiscoveryId]=useState<string|null>(decision.availableTileIds?.[0]??null);
  const [search,setSearch]=useState('');
  const discovery = DISCOVERIES.find(tile => tile.id === (selectedDiscoveryId??decision.tileId));
  if (!discovery) return <p role="alert">This discovery is absent from the match catalog. Reconnect to restore its details.</p>;
  const seat = view?.seats.find(candidate => candidate.id === decision.owner);
  const noTechnology = discovery.effect.kind === 'free-technology' && view && seat && ancientTechnologyChoices(view.technologyMarket, seat.technologies,researchedTechnologyIds(seat)).length === 0;
  const useAvailable = decision.options.includes('use') && !noTechnology;
  const keepAvailable = decision.options.includes('keep');
  const sector = view?.sectors.find(candidate => candidate.id === decision.sectorId);
  const submit=(option:'keep'|'use')=>onSubmit({type:'resolve',decisionId:decision.id,choice:{kind:'discovery',option,...(decision.availableTileIds?{discoveryId:selectedDiscoveryId??undefined}:{})}});
  if(decision.availableTileIds)return <section className="dg-discovery-decision">
    <span className="dg-yard-eyebrow">{decision.reserveForFourthTechnology?'Reserve starting discovery':'Choose a public discovery'}{sector ? ` · Sector ${sector.tileId}` : ''}</span>
    <h2>{decision.reserveForFourthTechnology?'Reserve a discovery for your fourth technology':'Public discovery supply'}</h2>
    {decision.availableTileIds.length>10&&<label className="dg-discovery-search">Find a discovery<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search discoveries"/></label>}
    <div className="dg-discovery-pool" role="radiogroup" aria-label="Public discovery pool">{decision.availableTileIds.filter(tileId=>{const tile=DISCOVERIES.find(candidate=>candidate.id===tileId);return tile?.name.toLowerCase().includes(search.toLowerCase());}).map(tileId=>{const tile=DISCOVERIES.find(candidate=>candidate.id===tileId);if(!tile)return null;const selected=selectedDiscoveryId===tileId;const canUse=decision.reserveForFourthTechnology||useAvailable;return <article key={tileId} className={`dg-discovery-pool-card ${selected?'dg-discovery-selected':''}`}><button type="button" role="radio" aria-checked={selected} aria-label={tile.name} disabled={disabled} onClick={()=>{setSelectedDiscoveryId(tileId);setOption(null);}}><strong>{tile.name}</strong><RewardStats effect={tile.effect} faction={seat?.faction}/></button>{selected&&<div className="dg-discovery-pool-confirm"><p>{decision.reserveForFourthTechnology?'This stays beside your faction board until your fourth technology. It does not resolve now.':explanation(tile.effect)}</p>{!canUse&&<p className="dg-danger">{noTechnology?'No eligible lowest-cost technology remains. Choose another discovery.':'The reward cannot be used in this position.'}</p>}<button className="sd-primary" disabled={disabled||!canUse} onClick={()=>submit('use')}>{decision.reserveForFourthTechnology?`Reserve ${tile.name}`:rewardAction(tile.effect)}</button>{!decision.reserveForFourthTechnology&&keepAvailable&&<button disabled={disabled} onClick={()=>submit('keep')}>Keep for 2 VP</button>}</div>}</article>;})}</div>
  </section>;
  return <section className="dg-discovery-decision">
    <span className="dg-yard-eyebrow">Discovery revealed{sector ? ` · Sector ${sector.tileId}` : ''}</span>
    <h2><SectorFeatureIcon kind="discovery"/> {discovery.name}</h2>
    <div className="dg-discovery-alternatives" role="radiogroup" aria-label="Discovery reward">
      <section className={`dg-discovery-reward ${option === 'use' ? 'dg-discovery-selected' : ''}`}>
        <label className="dg-discovery-side"><input type="radio" name={`discovery-${decision.id}`} checked={option==='use'} disabled={disabled || !useAvailable} onChange={()=>setOption('use')}/>Use {discovery.name}</label>
        <RewardStats effect={discovery.effect} faction={seat?.faction}/>
        <p>{explanation(discovery.effect)}</p>
        {!useAvailable && <p className="dg-danger">{noTechnology ? 'No eligible lowest-cost technology remains. Keep this tile for 2 VP.' : 'The reward cannot be used in this position.'}</p>}
        {option==='use'&&<button className="sd-primary" disabled={disabled||!useAvailable} onClick={()=>submit('use')}>{rewardAction(discovery.effect)}</button>}
      </section>
      <section className={`dg-discovery-reward dg-discovery-vp ${option === 'keep' ? 'dg-discovery-selected' : ''}`}>
        <label className="dg-discovery-side"><input type="radio" name={`discovery-${decision.id}`} checked={option==='keep'} disabled={disabled || !keepAvailable} onChange={()=>setOption('keep')}/>Keep for 2 VP</label>
        <StatBadge icon="discovery" value="2 VP" label="discovery points" explanation="Keep the tile for two victory points instead of receiving its reward."/>
        <p>Keep the tile. Gain 2 victory points; do not receive its reward.</p>
        {option==='keep'&&<button className="sd-primary" disabled={disabled||!keepAvailable} onClick={()=>submit('keep')}>Keep for 2 VP</button>}
      </section>
    </div>
    <p className="dg-discovery-note">Choose a side, then confirm inside that reward card. The revealed tile is already saved.</p>
  </section>;
}
