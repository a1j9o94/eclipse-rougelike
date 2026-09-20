import {seatColor} from './factionColors';
import {useState,type CSSProperties} from 'react';
import {getFaction} from '../../shared/eclipse/catalog';
import type {BlueprintShipType} from '../../shared/eclipse/blueprints';
import {TECHNOLOGIES,type TechnologyId} from '../../shared/eclipse/technologies';
import type {PlayerView,Resource} from '../../shared/eclipse/types';
import FactionSymbol from './FactionSymbol';
import ReputationSummary from './ReputationSummary';
import ReputationTile from './ReputationTile';
import EmpireEconomyTracks from './EconomyTracks';
import ResearchDiscountTrack from './ResearchDiscountTrack';
import {AcquiredMinorSpecies} from './MinorSpeciesMarket';
import {factionPresentation} from './factionPresentation';
import {empireOverviewModel} from './empireOverviewModel';
import {empireBuildOptions} from './empireBuildOptions';
import {emptyBuildOrder,type BuildOrderDraft} from './buildPlanning';
import {TradeResourceIcon} from './TradePanel';
import {PlanetIcon,type PlanetResource} from './SectorPlanets';
import ShipSilhouette from './ShipSilhouette';
import {StatIcon,type StatIconName} from './ShipPartStats';
import TechnologyStats from './TechnologyStats';
import {describeTechnology} from './itemDescriptions';
import './empireOverview.css';

export type EmpireDestination='Research'|'Scoring'|'Diplomacy'|'Trade'|'colonize';
export interface EmpireOverviewProps {
 view:PlayerView;seatId:string;onSector:(sectorId:string)=>void;
 onNavigate:(destination:EmpireDestination)=>void;onBlueprints:(type?:BlueprintShipType)=>void;
 onBuild?:(type:BlueprintShipType)=>void;buildOrder?:BuildOrderDraft;buildUnavailableReason?:string;
}
const names:Record<PlanetResource,string>={money:'Money',science:'Science',materials:'Materials',gray:'Flexible',orbital:'Orbital'};
const actionIcons:Record<string,StatIconName>={explore:'discovery',influence:'influence',research:'computer',upgrade:'hull',build:'structure',move:'drive'};
function ResourceSymbol({resource}:{resource:PlanetResource}){return <svg viewBox="0 0 20 20" aria-hidden="true"><PlanetIcon resource={resource}/></svg>;}
const title=(text:string)=>text[0].toUpperCase()+text.slice(1);
export default function EmpireOverview({view,seatId,onSector,onNavigate,onBlueprints,onBuild,buildOrder=emptyBuildOrder(),buildUnavailableReason}:EmpireOverviewProps){
 const seat=view.seats.find(seat=>seat.id===seatId)!;
 const faction=getFaction(seat.faction),presentation=factionPresentation(seat.faction),model=empireOverviewModel(view,seatId);
 const buildOptions=model.own&&onBuild?empireBuildOptions(view,buildOrder):[];
 const upkeepComplete=view.phase==='upkeep'&&view.upkeepDone?.includes(seatId);
 const [planetGroup,setPlanetGroup]=useState<Resource|'gray'>('science');
 const [showReputation,setShowReputation]=useState(false);
 const canReviewReputation=seatId===view.viewerSeatId&&view.private.seatId===view.viewerSeatId&&!!view.private.reputationSummary;
 const [selectedTech,setSelectedTech]=useState<TechnologyId|null>(null);
 const researched=Object.values(seat.technologies).flat();
 const technology=TECHNOLOGIES.find(tech=>tech.id===selectedTech&&researched.includes(tech.id));
 const planets=model.planets.filter(planet=>planetGroup==='gray'?planet.resource==='gray'||planet.resource==='orbital':planet.resource===planetGroup);
 const readyCount=model.planets.filter(planet=>planet.readyResources.length>0).length;
 return <div className="eo-overview" style={{'--empire-color':seatColor(seat)} as CSSProperties}>
  <header className="eo-hero">
   <div className="eo-hero-emblem"><FactionSymbol faction={seat.faction}/></div>
   <div className="eo-hero-copy"><p className="sd-eyebrow">{model.own?'YOUR EMPIRE':'PUBLIC EMPIRE OVERVIEW'}{seat.eliminated?' · ELIMINATED':''}</p><h1>{faction.name}</h1><p>{presentation.overview}</p>
    <div className="eo-hero-facts"><span>{model.sectorCount} controlled {model.sectorCount===1?'sector':'sectors'}</span><span>{view.phase==='upkeep'?(view.upkeepDone?.includes(seat.id)?'Upkeep complete':'Preparing upkeep'):seat.passed?'Passed · reactions only':seat.id===view.activeSeatId?'Taking an action':'Awaiting turn'}</span></div>
   </div>
   <button className="eo-score" onClick={()=>onNavigate('Scoring')} aria-label={`View ${view.phase==='finished'?'final':'public'} score: ${model.score} VP`}><strong>{model.score}</strong><span>{view.phase==='finished'?'Final':'Public'} VP</span><small>Score breakdown ↗</small></button>
  </header>

  <div className="eo-economy" aria-label="Empire resources">
   {model.resources.map(resource=><article key={resource.resource} className={`eo-resource eo-${resource.resource}`}><ResourceSymbol resource={resource.resource}/><div><h2>{names[resource.resource]}</h2><strong>{resource.stock}</strong></div><div className="eo-production"><b>+{resource.income}</b><small>round income</small><span>{resource.cubes} cubes available</span></div></article>)}
  </div>
  <div className="eo-economy-footer"><span><StatIcon kind="influence"/><b>{model.influence}</b> influence discs available</span><span>Round upkeep <b>{model.upkeep} money</b></span>{model.own&&<button disabled={upkeepComplete} title={upkeepComplete?'You have completed upkeep.':undefined} onClick={()=>onNavigate('Trade')}>Convert resources <b>{faction.tradeRates?'Faction rates':`${model.tradeRatio}:1`}</b></button>}</div>
  <div className="eo-quick-status">
   {model.own&&view.private.seatId===view.viewerSeatId&&<section className="eo-panel eo-reputation" aria-label="Your reputation tiles"><header><h2>Your reputation</h2><small>{view.phase==='finished'?'Final score':'Private · only you can see these'}</small></header><div className="eo-held-reputation">{view.private.reputation.length?view.private.reputation.map((points,index)=><ReputationTile key={index} points={points}/>):<p className="eo-muted">No reputation tiles yet.</p>}</div>
  {canReviewReputation&&<div className="eo-reputation-recap"><button aria-expanded={showReputation} onClick={()=>setShowReputation(open=>!open)}>Latest reputation draw</button>{showReputation&&<ReputationSummary view={view} onDismiss={()=>setShowReputation(false)}/>}</div>}
   </section>}
   <section className="eo-panel eo-colony-supply" aria-label="Colony ships available"><header><h2>Colony ships</h2></header><div className="eo-colony-ships"><StatIcon kind="population"/><strong>{model.colonyShips}<small> / {model.colonyShipCapacity}</small></strong><span>available</span></div>{model.own&&<button className="sd-primary" disabled={upkeepComplete} title={upkeepComplete?'You have completed upkeep.':undefined} onClick={()=>onNavigate('colonize')}>Colonize planets</button>}</section>
  </div>
  <EmpireEconomyTracks seat={seat}/>
  <section className="eo-panel eo-research"><header><div><p className="sd-eyebrow">KNOWLEDGE & CAPABILITIES</p><h2>Researched technologies</h2></div>{model.own&&<button onClick={()=>onNavigate('Research')}>Research technology</button>}</header>
   {(['military','grid','nano'] as const).map(track=><div key={track} className="eo-tech-track"><h3>{title(track)} <span>{seat.technologies[track].length} / 7</span></h3><ResearchDiscountTrack track={track} count={seat.technologies[track].length} minorSpecies={seat.minorSpecies}/><div className="eo-tech-tiles">{seat.technologies[track].length?seat.technologies[track].map(id=>{const tech=TECHNOLOGIES.find(tech=>tech.id===id);return tech?<button key={id} onClick={()=>setSelectedTech(tech.id)} aria-label={`Inspect ${tech.name}`} aria-pressed={selectedTech===tech.id}><strong>{tech.name}</strong><TechnologyStats technology={tech}/></button>:null;}):<small className="eo-muted">No technologies</small>}</div></div>)}
   <p className="eo-muted">Discounts reduce science costs on that track, never below a technology’s minimum price.</p>
   {technology&&<div className="eo-tech-effect" role="status"><h3>{technology.name}</h3><p>{describeTechnology(technology)}</p></div>}
  </section>
  <div className="eo-planning-stack">
   <details className="eo-panel eo-colonies" aria-label="Colonization opportunities"><summary><strong>Empty planets</strong><span>{readyCount} technology ready · view locations</span></summary>
    <div className="eo-planet-groups">{(['money','science','materials','gray'] as const).map(resource=>{
     const group=model.planets.filter(planet=>resource==='gray'?planet.resource==='gray'||planet.resource==='orbital':planet.resource===resource),ready=group.filter(planet=>planet.readyResources.length>0).length;
     return <button key={resource} className={`eo-${resource}${planetGroup===resource?' eo-selected':''}`} onClick={()=>setPlanetGroup(resource)} aria-pressed={planetGroup===resource} aria-label={`${names[resource]} planets: ${ready} technology ready, ${group.length-ready} locked`}><ResourceSymbol resource={resource}/><strong>{ready}<small> / {group.length}</small></strong><span>{names[resource]}</span><small>{group.length-ready>0?`${group.length-ready} locked`:'technology ready'}</small></button>;
    })}</div>
    <div className="eo-planet-locations" aria-label={`${names[planetGroup]} empty planets`}>
     {planets.length===0?<p className="eo-muted">No empty {names[planetGroup].toLowerCase()} planets in controlled sectors.</p>:planets.map(planet=><button key={`${planet.sectorId}:${planet.squareId}`} className={`eo-planet-location eo-${planet.resource}${planet.readyResources.length?'':' eo-locked'}`} onClick={()=>onSector(planet.sectorId)} aria-label={`Inspect sector ${planet.tileId}, ${planet.advanced?'advanced ':''}${names[planet.resource]} planet, ${planet.readyResources.length?'technology ready':'research required'}`}>
      <span className="eo-planet-orb"><ResourceSymbol resource={planet.resource}/>{planet.advanced&&<span role="img" aria-label="Advanced planet">★</span>}</span><span><strong>Sector {planet.tileId}</strong><small>{planet.readyResources.length?(planet.resource==='gray'||planet.resource==='orbital'?planet.readyResources.map(resource=>names[resource]).join(' / '):'Technology ready'):'Research required'}</small></span><span aria-hidden="true">↗</span>
     </button>)}
    </div>
    <footer><p>{readyCount} empty {readyCount===1?'space meets':'spaces meet'} technology requirements. Each population needs a colony ship and a matching cube; turn and sector restrictions still apply.</p></footer>
   </details>
   <section className="eo-panel eo-fleet"><header><div><p className="sd-eyebrow">SHIPS IN THE GALAXY</p><h2>Fleet & blueprints</h2></div><span className="eo-muted">Select a hull to inspect</span></header>
    <div className="eo-fleet-grid">{model.fleets.map(fleet=>{const option=buildOptions.find(option=>option.shipType===fleet.type),reason=buildUnavailableReason??option?.disabledReason,conversion=!!option?.requiresConversion&&!reason;return <div key={fleet.type} className="eo-fleet-card" role="group" aria-label={`${title(fleet.type)} fleet`}>
     <button className="eo-fleet-hull" aria-label={`Inspect ${title(fleet.type)} blueprint`} onClick={()=>onBlueprints(fleet.type)}><ShipSilhouette type={fleet.type} faction={seat.faction}/><strong className="eo-fleet-count">×{fleet.count}</strong><span>{title(fleet.type)}</span></button>
     <div className="eo-fleet-stats"><span aria-label={`Movement per activation: ${fleet.movement}`} title="Movement per activation"><StatIcon kind="drive"/>{fleet.movement}</span><span aria-label={`Initiative: ${fleet.initiative}`} title="Initiative"><StatIcon kind="initiative"/>{fleet.initiative}</span><span aria-label={`Hit points: ${fleet.hitPoints}`} title="Hit points"><StatIcon kind="hull"/>{fleet.hitPoints}</span></div>
     {option&&<div className="eo-build-shortcut"><button className="eo-build-button" disabled={!!reason} aria-label={`Build ${fleet.type} · ${option.cost} materials${conversion?' · conversion required':''}`} aria-describedby={reason||conversion?`build-${seatId}-${fleet.type}-reason`:undefined} onClick={()=>{if(!reason)onBuild?.(fleet.type);}}><span>Build</span><span className="eo-build-price"><TradeResourceIcon resource="materials"/>{option.cost}</span></button>{(reason||conversion)&&<small id={`build-${seatId}-${fleet.type}-reason`} className={conversion?'eo-build-conversion':'eo-build-reason'}>{reason??'Conversion required'}</small>}</div>}
     <div className="eo-fleet-locations">{fleet.locations.length?fleet.locations.map(location=><button key={location.sectorId} onClick={()=>onSector(location.sectorId)} aria-label={`Sector ${location.tileId}, ${location.count} ${title(fleet.type)}${location.damaged?`, ${location.damaged} damaged`:''}`}><span>Sector {location.tileId}</span><b>×{location.count}</b>{location.damaged>0&&<small>{location.damaged} damaged</small>}</button>):<small>No ships deployed</small>}</div>
    </div>;})}</div>
   </section>
  </div>
  <section className="eo-panel eo-abilities"><header><div><p className="sd-eyebrow">WHAT MAKES YOUR CIVILIZATION DIFFERENT</p><h2>Faction abilities</h2></div></header>
   <div className="eo-benefits">{presentation.benefits.map(benefit=><article key={benefit.label}><div className="eo-benefit-icon"><StatIcon kind={benefit.icon}/>{benefit.value&&<strong>{benefit.value}</strong>}</div><div><h3>{benefit.label}</h3><p>{benefit.detail}</p></div></article>)}</div>
   <div className="eo-capacities" aria-label={seat.passed?'Reaction capacities':'Action capacities'}>{model.capacities.map(item=><div key={item.action}><StatIcon kind={actionIcons[item.action]}/><strong>{item.amount}</strong><span>{title(item.action)}</span></div>)}</div>
   <p className="eo-muted eo-capacity-note">{seat.passed?'After passing: one activation per Upgrade, Build or Move reaction.':'Activations per action, including researched bonuses.'}</p>
   {presentation.constraints.length>0&&<div className="eo-constraints">{presentation.constraints.map(constraint=><p key={constraint}>{constraint}</p>)}</div>}
  </section>
  <div className="eo-relations"><section className="eo-panel eo-diplomacy"><header><div><p className="sd-eyebrow">RELATIONS</p><h2>Diplomacy</h2></div></header>
   <AcquiredMinorSpecies seat={seat}/>
   <div className="eo-ambassadors">{seat.ambassadors.length?seat.ambassadors.map(id=>{const partner=view.seats.find(player=>player.id===id);return partner?<div key={id}><FactionSymbol faction={partner.faction}/><span>{getFaction(partner.faction).name}</span></div>:null;}):<p className="eo-muted">No ambassadors exchanged.</p>}</div>
   <p>{seat.ambassadors.length} ambassador {seat.ambassadors.length===1?'tile':'tiles'}</p>{seat.traitor&&<p className="eo-traitor"><StatIcon kind="shield"/><strong>Traitor · {faction.special?.ignoresTraitorPenalty?'0':'−2'} VP</strong><span>Cannot form diplomatic relations while holding the traitor tile.</span></p>}
   <button onClick={()=>onNavigate('Diplomacy')}>View diplomatic relations</button><p className="eo-privacy">Reputation stays hidden until final scoring.</p>
  </section></div>
 </div>;
}
