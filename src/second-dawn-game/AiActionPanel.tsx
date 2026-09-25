import type {ReactNode} from 'react';
import type {PublicHistoryEntry,BuildComponent} from '../../shared/eclipse/history';
import type {PlayerView,SpectatorView} from '../../shared/eclipse/types';
import {getFaction} from '../../shared/eclipse/catalog';
import {TECHNOLOGIES} from '../../shared/eclipse/technologies';
import {getShipPart} from '../../shared/eclipse/parts';
import {effectiveBlueprintParts} from '../../shared/eclipse/blueprints';
import {publicBlueprint} from '../../shared/eclipse/legal';
import FactionSymbol from './FactionSymbol';
import ShipSilhouette from './ShipSilhouette';
import ShipPartStats,{StatIcon} from './ShipPartStats';
import TechnologyStats from './TechnologyStats';
import {describeTechnology} from './itemDescriptions';
import SectorFleet from './SectorFleet';
import SectorPlanets from './SectorPlanets';
import {MinorSpeciesCard} from './MinorSpeciesMarket';
import './aiActionPanel.css';
export interface AiActionPanelProps {
 view:PlayerView|SpectatorView;
 entry:PublicHistoryEntry;
 onInspectSector:(id:string)=>void;
}
const name=(id:string)=>id[0].toUpperCase()+id.slice(1);
function ComponentCard({type,count,label}:{type:BuildComponent;count:number;label:string}){
 return <div className="dg-ai-component-card" role="group" aria-label={`${label} ${count} ${name(type)}${count===1?'':'s'}`}><span className="dg-ai-component-art">{type==='orbital'||type==='monolith'?<StatIcon kind={type==='orbital'?'portal':'structure'}/>:<ShipSilhouette type={type}/>}</span><strong>{name(type)}</strong><b>×{count}</b></div>;
}
/** Read-only narration of committed public actions; never accesses view.private. */
export default function AiActionPanel({view,entry,onInspectSector}:AiActionPanelProps){
 const actor=view.seats.find(seat=>seat.id===entry.actorSeatId);
 const presentation=entry.presentation;
 const sectorIds=presentation&&'sectorIds'in presentation?presentation.sectorIds:[];
 const sectors=[...new Set(sectorIds)].flatMap(id=>view.sectors.filter(sector=>sector.id===id));
 let content:ReactNode=null;
 if(presentation?.kind==='minor-species'){
  content=<MinorSpeciesCard id={presentation.minorSpeciesId} seat={actor}/>;
 }else if(presentation?.kind==='research'){
  const technology=TECHNOLOGIES.find(item=>item.id===presentation.technologyId);
  if(technology)content=<article className="dg-ai-tech-card"><small>Technology researched</small><h3>{technology.name}</h3><TechnologyStats technology={technology}/><p>{describeTechnology(technology)}</p></article>;
 }else if(presentation?.kind==='upgrade'&&actor){
  content=<div className="dg-ai-loadouts"><p className="dg-ai-changed-classes">Changed classes: {[...new Set(presentation.shipTypes)].map(name).join(' · ')}</p>{[...new Set(presentation.shipTypes)].flatMap(type=>{
   const source=actor.blueprints.find(blueprint=>blueprint.shipType===type);
   if(!source)return[];
   const blueprint=publicBlueprint(source),parts=effectiveBlueprintParts(actor.faction,blueprint);
   return <article className="dg-ai-loadout" key={type}><header><ShipSilhouette type={type}/><div><h3>{name(type)}</h3><small>Current public loadout</small></div></header><div className="dg-ai-installed-parts">{parts.map((part,index)=><div key={index} className="dg-ai-installed-part"><small>Slot {index+1}</small><strong>{part?getShipPart(part).name:'Open hardpoint'}</strong>{part&&<ShipPartStats partId={part}/>}</div>)}{blueprint.outsideParts.map((part,index)=><div key={`outside-${index}`} className="dg-ai-installed-part"><small>Outside blueprint</small><strong>{getShipPart(part).name}</strong><ShipPartStats partId={part}/></div>)}</div></article>;
  })}</div>;
 }else if(presentation?.kind==='build'){
  content=<div className="dg-ai-component-cards">{presentation.components.map(component=><ComponentCard key={component.type} type={component.type} count={component.count} label="Built"/>)}</div>;
 }else if(presentation?.kind==='move'){
  const ships=view.ships.filter(ship=>presentation.shipIds.includes(ship.id)&&ship.owner===entry.actorSeatId);
  const types=[...new Set(ships.map(ship=>ship.type))];
  content=<div className="dg-ai-component-cards"><small className="dg-ai-current-note">Ships still on the public board</small>{types.flatMap(type=>type==='ancient'||type==='guardian'||type==='gcds'?[]:<ComponentCard key={type} type={type} count={ships.filter(ship=>ship.type===type).length} label="Moved"/>)}</div>;
 }
 return <section className="dg-ai-action-panel" aria-label={'kind' in view&&view.kind==='spectator'?'Public action details':'AI action details'}>
  <header className="dg-ai-action-heading">{actor&&<FactionSymbol faction={actor.faction}/>}<div><small>{actor?getFaction(actor.faction).name:entry.actorName}</small><h2>{entry.summary}</h2></div></header>
  {content}
  {sectors.length>0&&<nav className="dg-ai-sector-links" aria-label="Action sectors">{sectors.map(sector=><button key={sector.id} onClick={()=>onInspectSector(sector.id)} aria-label={`Inspect sector ${sector.tileId}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 21 7v10l-9 5-9-5V7Z"/></svg> Sector {sector.tileId}</button>)}</nav>}
  {presentation?.kind==='move'&&sectors.length>0&&<details className="dg-ai-sector-context" open><summary>Current public fleets</summary>{sectors.map(sector=><section key={sector.id}><h3>Sector {sector.tileId}</h3><SectorFleet view={view} sectorId={sector.id}/></section>)}</details>}
  {(presentation?.kind==='influence'||presentation?.kind==='colonize'||presentation?.kind==='explore')&&sectors.map(sector=><details className="dg-ai-sector-context" key={sector.id} open><summary>Sector {sector.tileId} · planets and population</summary><SectorPlanets sector={sector} view={view} candidates={[]}/></details>)}
  {entry.details.length>0&&<details className="dg-ai-action-notes" open={!presentation}><summary>Action details</summary><ul>{entry.details.map((detail,index)=><li key={index}>{detail}</li>)}</ul></details>}
 </section>;
}
