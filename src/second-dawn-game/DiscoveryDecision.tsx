import {researchedTechnologyIds} from '../../shared/eclipse/technologies';
import SectorFeatureIcon from './SectorFeatureIcon';
import type {FactionId} from '../../shared/eclipse/catalog';
import { useState } from 'react';
import { DISCOVERIES, type DiscoveryEffect } from '../../shared/eclipse/discoveries';
import { ancientTechnologyChoices } from '../../shared/eclipse/technologies';
import type { GameCommand, PendingDecision, PlayerView, Resource } from '../../shared/eclipse/types';
import BuildPieceSilhouette from './BuildPieceSilhouette';
import ShipPartStats, { StatBadge } from './ShipPartStats';
import { PlanetIcon } from './SectorPlanets';
import './discoveryDecision.css';
import CommitBar from './CommitBar';
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
function consequence(effect:DiscoveryEffect):string|null {
 switch(effect.kind){
  case 'resources': return 'Added now';
  case 'ancient-ship-part': return effect.placement==='outside-grid'?'Permanent · outside the grid':'Free install or store · replaced ancient parts are lost';
  case 'free-technology': return 'Lowest printed cost · no science paid';
  case 'place-unbuilt-ship': return 'Uses an unbuilt Cruiser and your current blueprint';
  case 'place-structure': return effect.structure==='orbital'?'Unpopulated · colonize for income':'3 VP to final controller';
  case 'place-warp-portal': return 'Links every portal · 2 VP to final controller';
  case 'choice-resources': return `Choose ${effect.amount} resources`;
  case 'end-game-bonus': return 'Scored at game end';
 }
}
export function DiscoveryRewardStats({ effect,faction }: { effect: DiscoveryEffect;faction?:FactionId }) {
  if (effect.kind === 'ancient-ship-part') return <ShipPartStats partId={effect.part}/>;
  const details = explanation(effect);
  return <div className="dg-part-stats">
    {effect.kind === 'resources' && (['money','science','materials'] as const).filter(resource=>effect.resources[resource]>0).map(resource => <ResourceReward key={resource} resource={resource} amount={effect.resources[resource]}/>)}
    {effect.kind === 'free-technology' && <StatBadge icon="discovery" value="1" label="free technology" explanation={details}/>}
    {effect.kind === 'place-unbuilt-ship' && <PieceReward piece="cruiser" explanation={details} faction={faction}/>}
    {effect.kind === 'place-structure' && <><PieceReward piece={effect.structure} explanation={details} faction={faction}/>{effect.structure === 'monolith' ? <StatBadge icon="discovery" value="3 VP" label="final controller" explanation={details}/> : <ResourceReward resource="materials" amount={effect.bonusMaterials}/>}</>}
    {effect.kind === 'place-warp-portal' && <><StatBadge icon="warp-portal" value="+1" label="warp portal" explanation={details}/><StatBadge icon="discovery" value="2 VP" label="final controller" explanation={details}/></>}
    {effect.kind === 'choice-resources' && <>{effect.money>0&&<ResourceReward resource="money" amount={effect.money}/>}<StatBadge icon="discovery" value={`${effect.amount}`} label="chosen resources" explanation={details}/></>}
    {effect.kind === 'end-game-bonus' && <StatBadge icon="discovery" value="+1 VP" label={effect.bonus === 'artifacts' ? 'per artifact' : 'per 3 reputation VP'} explanation={details}/>}
  </div>;
}
function PieceReward({ piece, explanation: details,faction }: { piece: 'cruiser'|'orbital'|'monolith'; explanation: string;faction?:FactionId }) {
  return <span role="img" className="dg-stat-badge dg-discovery-piece" aria-label={`+1 ${piece}. ${details}`} title={details}>
    <span aria-hidden="true"><BuildPieceSilhouette component={piece} faction={faction}/></span>
    <strong>+1</strong><small>{piece}</small>
  </span>;
}
function ResourceReward({ resource, amount }: { resource: Resource; amount: number }) {
  const name = resource[0].toUpperCase() + resource.slice(1);
  return <span role="img" className={`dg-stat-badge dg-discovery-${resource}`} aria-label={`${name}: +${amount}. Gain immediately.`}><svg viewBox="0 0 20 20" className="dg-stat-icon" aria-hidden="true"><PlanetIcon resource={resource}/></svg><strong>+{amount}</strong><small>{name}</small></span>;
}
export default function DiscoveryDecision({ decision, view, disabled, onSubmit }: DiscoveryDecisionProps) {
  const [option, setOption] = useState<'keep'|'use'|null>(decision.availableTileIds?'use':null);
  const [selectedDiscoveryId,setSelectedDiscoveryId]=useState<string|null>(decision.availableTileIds?.[0]??null);
  const [search,setSearch]=useState('');
  const discovery = DISCOVERIES.find(tile => tile.id === (selectedDiscoveryId??decision.tileId));
  if (!discovery) return <p role="alert">This discovery is absent from the match catalog. Reconnect to restore its details.</p>;
  const seat = view?.seats.find(candidate => candidate.id === decision.owner);
  const noTechnology = discovery.effect.kind === 'free-technology' && view && seat && ancientTechnologyChoices(view.technologyMarket, seat.technologies,researchedTechnologyIds(seat)).length === 0;
  const availableSelection=!decision.availableTileIds||decision.availableTileIds.includes(selectedDiscoveryId??'');
  const useAvailable=availableSelection&&decision.options.includes('use')&&(decision.reserveForFourthTechnology||!noTechnology);
  const keepAvailable=availableSelection&&decision.options.includes('keep')&&!decision.reserveForFourthTechnology;
  const legalOptions=(['use','keep'] as const).filter(choice=>choice==='use'?useAvailable:keepAvailable);
  const selectedOption=option??(legalOptions.length===1?legalOptions[0]:null);
  const canCommit=selectedOption==='use'?useAvailable:selectedOption==='keep'?keepAvailable:false;
  const sector = view?.sectors.find(candidate => candidate.id === decision.sectorId);
  const commitLabel=selectedOption==='keep'?'Keep for 2 VP':selectedOption==='use'?decision.reserveForFourthTechnology?`Reserve ${discovery.name}`:rewardAction(discovery.effect):'Collect discovery';
  const submit=()=>{
    if(disabled||!canCommit||!selectedOption)return;
    onSubmit({type:'resolve',decisionId:decision.id,choice:{kind:'discovery',option:selectedOption,...(decision.availableTileIds?{discoveryId:selectedDiscoveryId??undefined}:{})}});
  };
  return <section className="dg-discovery-decision">
    {(decision.reserveForFourthTechnology||sector)&&<span className="dg-yard-eyebrow">{decision.reserveForFourthTechnology?'Reserve starting discovery':`Sector ${sector!.tileId}`}</span>}
    <h2><SectorFeatureIcon kind="discovery"/> {decision.availableTileIds?'Public discovery supply':discovery.name}</h2>
    {decision.availableTileIds&&<>
      {decision.availableTileIds.length>10&&<label className="dg-discovery-search">Find a discovery<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search discoveries"/></label>}
      <div className="dg-discovery-pool" role="radiogroup" aria-label="Public discovery pool">{decision.availableTileIds.filter(tileId=>DISCOVERIES.find(tile=>tile.id===tileId)?.name.toLowerCase().includes(search.toLowerCase())).map((tileId,index)=>{
        const tile=DISCOVERIES.find(candidate=>candidate.id===tileId);if(!tile)return null;
        return <article key={`${tileId}:${index}`} className={`dg-discovery-pool-card ${selectedDiscoveryId===tileId?'dg-discovery-selected':''}`}><button type="button" role="radio" aria-checked={selectedDiscoveryId===tileId} aria-label={tile.name} disabled={disabled} onClick={()=>setSelectedDiscoveryId(tileId)}><strong>{tile.name}</strong><DiscoveryRewardStats effect={tile.effect} faction={seat?.faction}/></button></article>;
      })}</div>
    </>}
    {!decision.reserveForFourthTechnology&&<div className={`dg-discovery-alternatives${decision.availableTileIds?' is-public-selection':''}`} role="radiogroup" aria-label="Discovery reward">
      <section className={`dg-discovery-reward ${selectedOption==='use'?'dg-discovery-selected':''}`}>
        <label className="dg-discovery-side"><input type="radio" aria-label={`Use ${discovery.name}`} name={`discovery-${decision.id}`} checked={selectedOption==='use'} disabled={disabled||!useAvailable} onChange={()=>setOption('use')}/><span>Use reward</span></label>
        {!decision.availableTileIds&&<DiscoveryRewardStats effect={discovery.effect} faction={seat?.faction}/>}
        <p className="dg-discovery-consequence">{consequence(discovery.effect)}</p>
      </section>
      {decision.options.includes('keep')&&<section className={`dg-discovery-reward dg-discovery-vp ${selectedOption==='keep'?'dg-discovery-selected':''}`}>
        <label className="dg-discovery-side"><input type="radio" name={`discovery-${decision.id}`} checked={selectedOption==='keep'} disabled={disabled||!keepAvailable} onChange={()=>setOption('keep')}/>Keep for 2 VP</label>
        {!decision.availableTileIds&&<StatBadge icon="discovery" value="2 VP" label="discovery points" explanation="Keep the tile for two victory points instead of receiving its reward."/>}
      </section>}
    </div>}
    {!availableSelection&&<p className="dg-danger" role="status">This discovery is no longer in the public supply. Choose another.</p>}
    {availableSelection&&!useAvailable&&decision.options.includes('use')&&<p className="dg-danger" role="status">{noTechnology?'No eligible lowest-cost technology remains. Choose points or another discovery.':'The reward cannot be used in this position.'}</p>}
    <details className="dg-discovery-details"><summary>Reward details · {discovery.name}</summary><p>{decision.reserveForFourthTechnology?'Reserved until your fourth technology; the reward is not applied now.':explanation(discovery.effect)}</p></details>
    <section className="dg-discovery-commit" aria-label="Discovery commitment"><CommitBar summary={decision.reserveForFourthTechnology?'Activates after your fourth technology':undefined}><button type="button" className="sd-primary" disabled={disabled||!canCommit} onClick={submit}>{commitLabel}</button></CommitBar></section>
  </section>;
}
