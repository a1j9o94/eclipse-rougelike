import SectorFeatureIcon from './SectorFeatureIcon';
import {useLayoutEffect,useMemo,useRef,useState} from 'react';
import type {GameCommand,PendingDecision,PlayerView} from '../../shared/eclipse/types';
import {sectorDefinition} from '../../shared/eclipse/sectors';
import {getFaction} from '../../shared/eclipse/catalog';
import {galaxyPoint} from './galaxyGeometry';
import {createExplorationMapView,deriveExplorePreview,fitExplorationCamera} from './explorationPreview';
import type {GalaxyCamera} from './galaxyGestures';
import GalaxyBoard from './GalaxyBoard';
import SectorPlanets,{PlanetIcon} from './SectorPlanets';
import {StatIcon} from './ShipPartStats';
import {NeutralShipSilhouette} from './BattleOverview';
import SectorFleet from './SectorFleet';
import FactionSymbol from './FactionSymbol';
import {useMobileLayout} from './mobileLayout';
import './exploration.css';
interface Props {view:PlayerView;decision:Extract<PendingDecision,{kind:'exploration'}>;disabled:boolean;onSubmit:(command:GameCommand)=>void}
function RotateIcon({clockwise}:{clockwise:boolean}){
 return <svg viewBox="0 0 24 24" aria-hidden="true" style={{transform:clockwise?undefined:'scaleX(-1)'}}><path d="M20 10a8 8 0 1 0-1 8 M20 3v7h-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
export default function ExplorationDecision({view,decision,disabled,onSubmit}:Props){
 const compact=useMobileLayout();
 const [tileId,setTileId]=useState(decision.drawnTileIds[0]);
 const [rotation,setRotation]=useState(()=>decision.placements.find(p=>p.tileId===decision.drawnTileIds[0])?.rotation??0);
 const preview=deriveExplorePreview(view,decision,tileId,rotation);
 const mapped=createExplorationMapView(view,decision,tileId,rotation)!;
 const [selected,setSelected]=useState(mapped.sector.id);
 const inspector=useRef<HTMLElement>(null);
 const focusPositionKey=JSON.stringify([decision.position,...preview.neighbors.flatMap(neighbor=>neighbor.sector?[neighbor.position]:[])]);
 const focusPositions=useMemo(()=>JSON.parse(focusPositionKey) as {q:number;r:number}[],[focusPositionKey]);
 const focusPoints=[galaxyPoint(decision.position),...preview.neighbors.flatMap(neighbor=>neighbor.sector?[galaxyPoint(neighbor.position)]:[])];
 const nearbyCamera:GalaxyCamera={center:{x:(Math.min(...focusPoints.map(p=>p.x))+Math.max(...focusPoints.map(p=>p.x)))/2,y:(Math.min(...focusPoints.map(p=>p.y))+Math.max(...focusPoints.map(p=>p.y)))/2},zoom:3};
 const [camera,setCamera]=useState<GalaxyCamera>(nearbyCamera);
 const mapStage=useRef<HTMLDivElement>(null),focusCamera=useRef(nearbyCamera);
 useLayoutEffect(()=>{
  const svg=mapStage.current?.querySelector<SVGSVGElement>('.dg-galaxy>svg');if(!svg)return;
  let measured='';
  const fit=()=>{
   const box=svg.getBoundingClientRect(),bounds=svg.getAttribute('viewBox')?.split(' ').map(Number);
   if(!box.width||!box.height||!bounds||bounds.length!==4)return;
   const size=`${box.width}:${box.height}:${bounds.join(',')}`;if(size===measured)return;measured=size;
   focusCamera.current=fitExplorationCamera(focusPositions,{width:box.width,height:box.height,viewWidth:bounds[2],viewHeight:bounds[3]},compact);setCamera(focusCamera.current);
  };
  fit();const frame=requestAnimationFrame(fit);
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(fit);observer?.observe(svg);
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();};
 },[compact,focusPositions]);
 const inspected=mapped.view.sectors.find(sector=>sector.id===selected)??mapped.sector;
 const neighbors=preview.neighbors.filter(n=>n.sector);
 const factionFor=(owner:string|null)=>{const seat=view.seats.find(seat=>seat.id===owner);return seat?getFaction(seat.faction):null;};
 const inspect=(id:string)=>{setSelected(id);if(compact)inspector.current?.scrollIntoView({behavior:'auto',block:'start'});else if(inspector.current)inspector.current.scrollTop=0;};
 const resolve=(selectedTile:string|null,drawAnother=false)=>onSubmit({type:'resolve',decisionId:decision.id,choice:{kind:'exploration',tileId:selectedTile,rotation:selectedTile?rotation:0,...(drawAnother?{drawAnother:true}:{})}});
 const chooseTile=(id:string)=>{setTileId(id);setRotation(decision.placements.find(p=>p.tileId===id)?.rotation??0);setSelected(mapped.sector.id);};
 return <section className="dg-exploration-decision">
  <header className="dg-explore-heading"><div><h2>Exploration</h2><p>Rotate to align an exit with a neighboring exit. Solid gold edges connect; dotted edges are open but unmatched. Select any sector for its contents.</p></div><span>Drawn sector <strong>{tileId}</strong> · preview</span></header>
  {decision.drawnTileIds.length>1&&<nav className="dg-drawn-choices" aria-label="Drawn sectors">{decision.drawnTileIds.map(id=><button key={id} aria-pressed={tileId===id} onClick={()=>chooseTile(id)}>Sector {id}<small>{sectorDefinition(Number(id))!.victoryPoints} VP · {sectorDefinition(Number(id))!.population.length} planets</small></button>)}</nav>}
  <div className="dg-placement-verdict" data-legal={preview.legal} role="status"><strong>{preview.legal?'✓ Ready to place':'× Cannot place this orientation'}</strong><span>{preview.legal?`Connected exploration source: ${preview.connectedSourceIds.map(id=>{const source=view.sectors.find(sector=>sector.id===id)!;return `${factionFor(source.owner)?.name??'Uncontrolled'} · sector ${source.tileId}`;}).join('; ')}`:'Align a wormhole with an exploration source.'}</span></div>
  <div className="dg-explore-layout">
   <div ref={mapStage} className="dg-placement-stage" role="region" aria-label="Exploration placement preview" data-testid="drawn-exploration-tile" data-rotation={rotation}>
    <div className="dg-placement-map-caption"><span>New sector {tileId} · not yet placed</span><button onClick={()=>{setCamera(focusCamera.current);setSelected(mapped.sector.id);}}>Focus new sector</button></div>
    <div className="dg-drawn-feature-strip" role="group" aria-label="Drawn sector contents">
     <span title="Sector victory points" aria-label={`${preview.tile!.victoryPoints} victory points`}><strong>{preview.tile!.victoryPoints}</strong> VP</span>
     {preview.tile!.population.map((planet,index)=><span key={index} className="dg-drawn-planet" role="img" title={`${planet.advanced?'Advanced':'Standard'} ${planet.resource==='gray'?'any resource':planet.resource} planet`} aria-label={`${planet.advanced?'Advanced':'Standard'} ${planet.resource==='gray'?'any resource':planet.resource} planet`} style={{color:({money:'#e7bd67',science:'#b397da',materials:'#b89675',gray:'#b5c3cd'})[planet.resource]}}><svg viewBox="0 0 20 20" aria-hidden="true"><PlanetIcon resource={planet.resource}/></svg>{planet.advanced&&<svg className="dg-drawn-advanced" viewBox="0 0 16 16" aria-hidden="true"><path d="m8 1 2 4 5 1-3.5 3.5.8 5-4.3-2.4-4.3 2.4.8-5L1 6l5-1Z" fill="#e6ce91" stroke="#101c27"/></svg>}</span>)}
     {preview.tile!.ancients>0&&<span title="Ancient defenders" aria-label={`${preview.tile!.ancients} Ancient defenders`}><NeutralShipSilhouette type="ancient"/><strong>×{preview.tile!.ancients}</strong></span>}
     {preview.tile!.discovery&&<span title="Discovery tile" aria-label="Discovery tile"><SectorFeatureIcon kind="discovery"/></span>}
     {preview.tile!.artifacts>0&&<span title="Artifacts" aria-label={`${preview.tile!.artifacts} artifacts`}><SectorFeatureIcon kind="artifact"/><strong>{preview.tile!.artifacts}</strong></span>}
     {preview.tile!.warpPortal&&<span title="Warp portal" aria-label="Warp portal"><StatIcon kind="portal"/></span>}
    </div>
    <div className="dg-placement-edge-key" aria-label="Wormhole legend"><span><i className="dg-key-wormhole"/>Connected pair</span><span><i className="dg-key-opening"/>Open exit · unmatched</span></div>
    <GalaxyBoard showPrintedWormholes view={mapped.view} candidates={[]} selected={selected} legalTargetIds={[mapped.sector.id]} targetLabel="new sector preview" compact={compact} camera={camera} onCameraChange={setCamera} onSelect={inspect} onInspectFleet={inspect} onExplore={()=>{}}/>
   </div>
   <aside ref={inspector} className="dg-placement-notes" aria-label="Exploration sector inspection">
    <div className="dg-placement-inspector-heading"><h3>{inspected.id===mapped.sector.id?`New sector ${tileId}`:`Sector ${inspected.tileId}`}</h3>{inspected.id!==mapped.sector.id&&<button onClick={()=>inspect(mapped.sector.id)}>Inspect new sector</button>}</div>
    <p className="dg-explore-owner">{factionFor(inspected.owner)?<><FactionSymbol faction={factionFor(inspected.owner)!.id}/>{factionFor(inspected.owner)!.name}{inspected.owner===view.viewerSeatId?' · You':''}</>:'Uncontrolled'}</p>
    <h3>Fleet</h3><SectorFleet view={mapped.view} sectorId={inspected.id}/>
    {inspected.id===mapped.sector.id&&preview.tile!.ancients>0&&<p>These Ancient defenders arrive with the sector.</p>}
    <SectorPlanets view={mapped.view} sector={inspected} candidates={[]}/>
    <section className="dg-placement-connections" aria-label="Placement connections"><h3>New sector connections</h3><ul>{neighbors.map(n=>{
     const faction=factionFor(n.sector!.owner);
     return <li key={n.edge} data-connection={n.connection}><button onClick={()=>inspect(n.sector!.id)}><span className={n.connection==='closed'?'closed':'connected'} aria-hidden="true">{n.connection==='closed'?'×':'✓'}</span>{faction&&<FactionSymbol faction={faction.id}/>}<strong>{faction?.name??'Uncontrolled'}<small>Sector {n.sector!.tileId}</small></strong></button><p>{n.connection==='paired'?'Wormholes aligned':n.connection==='generator'?'Connected by your Wormhole Generator':n.connection==='warp'?'Connected by warp portals':'No matching connection'}{n.sourceEligible?' · exploration source':''}</p></li>;
    })}</ul><p>One connection to an exploration source is enough. Other edges may remain closed.</p>{preview.remotePortalSectorIds.length>0&&<p>Warp portal links: {preview.remotePortalSectorIds.map(id=>view.sectors.find(sector=>sector.id===id)?.tileId??id).join(', ')}.</p>}</section>
   </aside>
  </div>
  <footer className="dg-exploration-controls">
   <div className="dg-rotation-controls"><button data-sound="detent" aria-label="Rotate counterclockwise" onClick={()=>setRotation(r=>(r+1)%6)}><RotateIcon clockwise={false}/> Rotate left</button><span aria-label={`Orientation ${rotation+1} of 6`}>{Array.from({length:6},(_,i)=><i key={i} className={i===rotation?'active':''}/>)}</span><button data-sound="detent" aria-label="Rotate clockwise" onClick={()=>setRotation(r=>(r+5)%6)}>Rotate right <RotateIcon clockwise/></button></div>
   <div className="dg-placement-actions"><button className="sd-primary" disabled={disabled||!preview.legal} onClick={()=>resolve(tileId)}>Place sector</button><button disabled={disabled} onClick={()=>resolve(null)}>Discard sector</button>{decision.canDrawAnother&&<button disabled={disabled} onClick={()=>resolve(null,true)}>Draw second Draco sector</button>}</div>
   <p className="dg-exploration-save-note">Saved draw · placement does not spend an influence disc or colony ship.</p>
  </footer>
 </section>;
}
