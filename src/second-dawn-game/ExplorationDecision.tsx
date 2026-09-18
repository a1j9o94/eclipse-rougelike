import { useState } from 'react';
import type { GameCommand, PendingDecision, PlayerView } from '../../shared/eclipse/types';
import { sectorDefinition } from '../../shared/eclipse/sectors';
import { mapSector } from '../../shared/eclipse/rulesState';
import { galaxyPoint, TILE_RADIUS, wormholePoint } from './galaxyGeometry';
import { deriveExplorePreview } from './explorationPreview';
import { PlanetIcon } from './SectorPlanets';
import { NeutralShipSilhouette } from './BattleOverview';
import './exploration.css';
interface Props {
 view: PlayerView;
 decision: Extract<PendingDecision,{kind:'exploration'}>;
 disabled: boolean;
 onSubmit: (command:GameCommand)=>void;
}
const hex=Array.from({length:6},(_,i)=>`${TILE_RADIUS*Math.cos((30+i*60)*Math.PI/180)},${TILE_RADIUS*Math.sin((30+i*60)*Math.PI/180)}`).join(' ');
const planetNames={money:'Money',science:'Science',materials:'Materials',gray:'Any resource'};
const planetColors={money:'#e7bd67',science:'#b397da',materials:'#b89675',gray:'#b5c3cd'};
function RotateIcon({clockwise}:{clockwise:boolean}){
 return <svg viewBox="0 0 24 24" aria-hidden="true" style={{transform:clockwise?undefined:'scaleX(-1)'}}><path d="M20 10a8 8 0 1 0-1 8 M20 3v7h-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
export default function ExplorationDecision({view,decision,disabled,onSubmit}:Props){
 const [tileId,setTileId]=useState(decision.drawnTileIds[0]);
 const [rotation,setRotation]=useState(()=>decision.placements.find(p=>p.tileId===decision.drawnTileIds[0])?.rotation??0);
 const preview=deriveExplorePreview(view,decision,tileId,rotation);
 const center=galaxyPoint(decision.position);
 const tile=preview.tile!;
 const neighbors=preview.neighbors.filter(n=>n.sector);
 const resolve=(selectedTile:string|null,drawAnother=false)=>onSubmit({type:'resolve',decisionId:decision.id,choice:{kind:'exploration',tileId:selectedTile,rotation:selectedTile?rotation:0,...(drawAnother?{drawAnother:true}:{})}});
 const chooseTile=(id:string)=>{setTileId(id);setRotation(decision.placements.find(p=>p.tileId===id)?.rotation??0);};
 return <section className="dg-exploration-decision">
  <header className="dg-explore-heading"><div><h2>Exploration</h2><p>Turn the new sector to line up its wormholes. This location stays in view through its follow-on choices.</p></div><span>At hex {decision.position.q}, {decision.position.r} · drawn sector <strong>{tileId}</strong></span></header>
  {decision.drawnTileIds.length>1&&<nav className="dg-drawn-choices" aria-label="Drawn sectors">{decision.drawnTileIds.map(id=><button key={id} aria-pressed={tileId===id} onClick={()=>chooseTile(id)}>Sector {id}<small>{sectorDefinition(Number(id))!.victoryPoints} VP · {sectorDefinition(Number(id))!.population.length} planets</small></button>)}</nav>}
  <div className="dg-explore-layout">
   <div className="dg-placement-stage">
    <svg viewBox="-172 -155 344 310" role="img" aria-label="Exploration placement preview">
     <title>New sector {tileId} with its actual neighboring sectors. Rotate to change the highlighted connections.</title>
     <defs><radialGradient id="explore-tile-surface"><stop stopColor="#3c423e"/><stop offset="1" stopColor="#15202a"/></radialGradient></defs>
     {preview.neighbors.map(n=>{const point=galaxyPoint(n.position),x=point.x-center.x,y=point.y-center.y;const mapped=n.sector?mapSector(n.sector):null;return <g key={n.edge} transform={`translate(${x} ${y})`}>
      <polygon points={hex} fill={mapped?'#101c29':'#0a141a60'} stroke={n.sourceEligible?'#9bbfae':'#58626a'} strokeWidth={n.sourceEligible?1.6:1} strokeDasharray={mapped?undefined:'3 5'}/>
      {mapped? <><text textAnchor="middle" y="-12" className="dg-placement-sector-name">{n.sector!.tileId}</text><text textAnchor="middle" y="7" className="dg-placement-owner">{mapped.controller===view.viewerSeatId?'Your sector':mapped.controller?`Player ${view.seats.findIndex(s=>s.id===mapped.controller)+1}`:'Uncontrolled'}</text>{n.sourceEligible&&<text textAnchor="middle" y="26" className="dg-placement-source">Explore from here</text>}{mapped.wormholes.map(edge=>{const p=wormholePoint(edge,mapped.rotation);return <circle key={edge} cx={p.x} cy={p.y} r="4" fill="#0c141c" stroke="#d8bd7d" strokeWidth="2"/>;})}</>:<text textAnchor="middle" y="4" className="dg-placement-empty">Unexplored</text>}
     </g>;})}
     <g data-testid="drawn-exploration-tile" data-rotation={rotation}>
      <polygon points={hex} fill="url(#explore-tile-surface)" stroke="#efce8e" strokeWidth="3"/>
      <text textAnchor="middle" y="-27" className="dg-placement-sector-name">{tileId}</text>
      <text textAnchor="middle" y="-8" className="dg-placement-new">NEW SECTOR</text>
      <text textAnchor="middle" y="12" className="dg-placement-vp">{tile.victoryPoints} VP{tile.ancients?` · ${tile.ancients} ancient${tile.ancients===1?'':'s'}`:''}</text>
      {tile.population.map((planet,index)=><g key={index} transform={`translate(${(index-(tile.population.length-1)/2)*13} 30)`} color={planetColors[planet.resource]}>{planet.advanced?<rect x="-5" y="-5" width="10" height="10" rx="1" fill="none" stroke="currentColor"/>:<circle r="5" fill="none" stroke="currentColor"/>}<g transform="translate(-4 -4) scale(.4)"><PlanetIcon resource={planet.resource}/></g></g>)}
      {tile.wormholes.map(edge=>{const p=wormholePoint(edge,rotation);return <circle key={edge} cx={p.x} cy={p.y} r="4.5" fill="#102028" stroke="#f1d48f" strokeWidth="2.5"/>;})}
     </g>
     {neighbors.map(n=>{const point=galaxyPoint(n.position),x=point.x-center.x,y=point.y-center.y;const a=wormholePoint(n.edge,0),b=wormholePoint(n.oppositeEdge,0);const mid={x:(a.x+x+b.x)/2,y:(a.y+y+b.y)/2};const connected=n.connection!=='closed';return <g key={n.edge} data-connection={n.connection}>
      <line x1={a.x} y1={a.y} x2={x+b.x} y2={y+b.y} stroke={connected?'#93e5ba':'#ec9a91'} strokeWidth={connected?6:2} strokeDasharray={n.connection==='generator'?'2 2':undefined}/>
      <g transform={`translate(${mid.x} ${mid.y})`}><circle r="8" fill="#0b151c" stroke={connected?'#93e5ba':'#ec9a91'} strokeWidth="1.2"/><path d={connected?'M-4 0 -1 3 4 -3':'M-3 -3 3 3 M-3 3 3 -3'} fill="none" stroke={connected?'#93e5ba':'#ec9a91'} strokeWidth="1.8"/></g>
     </g>;})}
    </svg>
    <div className="dg-rotation-controls"><button aria-label="Rotate counterclockwise" onClick={()=>setRotation(r=>(r+1)%6)}><RotateIcon clockwise={false}/> Rotate left</button><span aria-label={`Orientation ${rotation+1} of 6`}>{Array.from({length:6},(_,i)=><i key={i} className={i===rotation?'active':''}/>)}</span><button aria-label="Rotate clockwise" onClick={()=>setRotation(r=>(r+5)%6)}>Rotate right <RotateIcon clockwise/></button></div>
   </div>
   <aside className="dg-placement-notes" aria-label="Placement connections">
  <div className={`dg-placement-verdict ${preview.legal?'legal':'illegal'}`} role="status"><strong>{preview.legal?'✓ Ready to place':'× Cannot place this orientation'}</strong><span title={preview.explanation}>{preview.legal?"An exploration source connects to this sector.":"Align a wormhole with an exploration source."}</span></div>
  <div className="dg-placement-actions"><button className="sd-primary" disabled={disabled||!preview.legal} onClick={()=>resolve(tileId)}>Place sector</button><button disabled={disabled} onClick={()=>resolve(null)}>Discard sector</button>{decision.canDrawAnother&&<button disabled={disabled} onClick={()=>resolve(null,true)}>Draw second Draco sector</button>}</div>
  <p className="dg-exploration-save-note">The draw is saved. Rotation is a preview until you place the sector.</p>
    <div className="dg-connections-scroll">{tile.ancients>0&&<div className="dg-explore-ancients"><NeutralShipSilhouette type="ancient"/><div><strong>{tile.ancients} Ancient{tile.ancients===1?'':'s'} defend this sector</strong><small>Placing the tile also places these neutral ships.</small></div></div>}<h3>Connections</h3>
    <ul>{neighbors.map(n=><li key={n.edge} className={n.connection==='closed'?'closed':'connected'}><span aria-hidden="true">{n.connection==='closed'?'×':'✓'}</span><div><strong>Sector {n.sector!.tileId}</strong><small>{n.connection==='paired'?'Wormholes aligned':n.connection==='generator'?'Connected by your Wormhole Generator':n.connection==='warp'?'Connected by warp portals':'No matching connection'}{n.sourceEligible?' · exploration source':''}</small></div></li>)}</ul>
    <p className="dg-placement-rule">One connection to an exploration source is enough. Other edges may remain closed.</p>
    <p className="dg-placement-rule">After placement, control, discoveries, and colonization remain separate choices. Placing this tile never spends an influence disc or colony ship automatically.</p>
    {preview.remotePortalSectorIds.length>0&&<p>Warp portal links: {preview.remotePortalSectorIds.join(', ')}.</p>}
    <details className="dg-drawn-details"><summary>Planets & sector features</summary><ul>{tile.population.map((p,i)=><li key={i}>{planetNames[p.resource]}{p.advanced?' · Advanced':' · Standard'}</li>)}</ul><p>{tile.victoryPoints} VP · {tile.artifacts} artifacts{tile.discovery?' · Discovery':''}{tile.warpPortal?' · Warp portal':''}{tile.ancients?` · ${tile.ancients} Ancients`:''}</p></details>
    </div>
   </aside>
  </div>

 </section>;
}
