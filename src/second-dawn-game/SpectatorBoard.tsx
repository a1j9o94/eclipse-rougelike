import {useState} from 'react';
import TurnClock,{type TurnClockTimer} from './TurnClock';
import '../second-dawn/second-dawn.css';
import type {SpectatorView} from '../../shared/eclipse/types';
import {getFaction} from '../../shared/eclipse/catalog';
import {sectorDefinition} from '../../shared/eclipse/sectors';
import {TECHNOLOGIES} from '../../shared/eclipse/technologies';
import {publicBlueprint} from '../../shared/eclipse/legal';
import {deriveBlueprintStats,type BlueprintShipType} from '../../shared/eclipse/blueprints';
import type {HistoryFeed} from '../second-dawn-session/useMatchHistory';
import GalaxyBoard from './GalaxyBoard';
import type {GalaxyCamera} from './galaxyGestures';
import {galaxyPoint} from './galaxyGeometry';
import EmpireOverview from './EmpireOverview';
import SectorPlanets from './SectorPlanets';
import SectorFleet from './SectorFleet';
import BlueprintLoadout,{ShipCapabilities} from './BlueprintLoadout';
import TechnologyStats from './TechnologyStats';
import {describeTechnology} from './itemDescriptions';
import HistoryPanel from './HistoryPanel';
import AiActionPanel from './AiActionPanel';
import ScoreWorkspace from './ScoreWorkspace';
import {runningScore} from './runningScore';
import {historySectorIds} from './publicInspection';
import {PublicInspectionProvider,usePublicInspection} from './PublicInspectionContext';
import PublicInspectionModal from './PublicInspectionModal';
import './spectatorBoard.css';

export interface SpectatorBoardProps {
 view:SpectatorView;history:HistoryFeed;connected:boolean;
 onHome:()=>void;onRoom:()=>void;playerNames?:Record<string,string>;
 lifecycle?:'active'|'abandoned';
 timer?:TurnClockTimer|null;
}
type Screen='Galaxy'|'Command centers'|'Technologies'|'Blueprints'|'Standings'|'History';
const screens:Screen[]=['Galaxy','Command centers','Technologies','Standings','History'];
const noExplore=()=>{};
const emptyNames:Record<string,string>={};
export default function SpectatorBoard(props:SpectatorBoardProps){return <PublicInspectionProvider><SpectatorBoardContent {...props}/></PublicInspectionProvider>;}
function SpectatorBoardContent({view,history,connected,onHome,onRoom,playerNames=emptyNames,timer,lifecycle='active'}:SpectatorBoardProps){
 const [screen,setScreen]=useState<Screen>('Galaxy');
 const [following,setFollowing]=useState(true);
 const [selected,setSelected]=useState<string|null>(null);
 const [inspectedSeat,setInspectedSeat]=useState(view.seats[0]?.id??'');
 const [blueprintType,setBlueprintType]=useState<BlueprintShipType>('interceptor');
 const [manualCamera,setManualCamera]=useState<GalaxyCamera>();
 const inspection=usePublicInspection();
 const owner=view.waitingFor?.owner??view.activeSeatId;
 const actor=view.seats.find(seat=>seat.id===owner);
 const latest=history.entries.find(entry=>entry.revision<=view.revision);
 // A turn handoff follows the new actor instead of an old spatial action.
 const focusIds=latest?.actorSeatId===owner?historySectorIds(latest):[];
 const focus=view.sectors.filter(sector=>focusIds.includes(sector.id));
 const followed=focus.length?focus:view.sectors.filter(sector=>sector.owner===owner);
 const points=(followed.length?followed:view.sectors).map(sector=>galaxyPoint(sector.position));
 const followCamera:GalaxyCamera={zoom:followed.length?1.5:1,center:{x:points.reduce((sum,point)=>sum+point.x,0)/Math.max(1,points.length),y:points.reduce((sum,point)=>sum+point.y,0)/Math.max(1,points.length)}};
 const camera=following?followCamera:manualCamera??followCamera;
 const pause=()=>{setManualCamera(camera);setFollowing(false);};
 const navigate=(next:Screen)=>{pause();setScreen(next);};
 const inspectSector=(id:string)=>{pause();setSelected(id);setScreen('Galaxy');};
 const inspectEmpire=(id:string)=>{pause();setInspectedSeat(id);setScreen('Command centers');};
 const resume=()=>{setFollowing(true);setSelected(null);setScreen('Galaxy');inspection?.dismiss();};
 const sector=view.sectors.find(item=>item.id===selected);
 const sectorOwner=view.seats.find(seat=>seat.id===sector?.owner);
 const empire=view.seats.find(seat=>seat.id===inspectedSeat)??view.seats[0];
 const blueprint=empire?.blueprints.find(item=>item.shipType===blueprintType);
 const ended=view.phase==='finished'||lifecycle==='abandoned';
 const turn=lifecycle==='abandoned'?'Game abandoned':view.phase==='finished'?'Game finished':actor?`${playerNames[actor.id]??getFaction(actor.faction).name}${actor.controller==='ai'?' · AI':''} · ${view.waitingFor?'resolving a choice':view.phase==='upkeep'?'preparing upkeep':'taking a turn'}`:`${view.phase} phase`;
 return <main className="sd-app sp-board">
  <header className="sp-header"><div><p className="sd-eyebrow">Spectating</p><h1>Second Dawn</h1></div><div className="sp-turn" role="status"><strong>{turn}</strong><span>Round {view.round} · {ended?'Public board archive':connected?'Live public board':'Reconnecting · showing the last public update'}</span>{timer&&!ended&&<TurnClock timer={timer} actorName={actor?playerNames[actor.id]??getFaction(actor.faction).name:'Current player'}/>}</div><div className="sp-header-actions"><button onClick={onRoom}>Room</button><button onClick={onHome}>Home</button></div></header>
  <div className="sp-follow"><span>{ended?'Final public board':following?'Following every player':'Exploring the public board · live updates continue'}</span>{ended?null:following?<button onClick={pause}>Pause following</button>:<button className="sd-primary" onClick={resume}>Resume following</button>}</div>
  <nav className="sp-navigation" aria-label="Spectator views">{screens.map(item=><button key={item} aria-pressed={screen===item} onClick={()=>navigate(item)}>{item}</button>)}</nav>
  <nav className="sp-empires" aria-label="Public command centers">{view.seats.map(seat=><button key={seat.id} aria-label={`Inspect ${getFaction(seat.faction).name} command center`} aria-pressed={screen==='Command centers'&&seat.id===empire?.id} onClick={()=>inspectEmpire(seat.id)}><strong>{getFaction(seat.faction).name}</strong><span>{playerNames[seat.id]??(seat.controller==='ai'?'AI':'Player')} · {runningScore(view,seat.id).breakdown.total} VP{seat.eliminated?' · eliminated':seat.passed?' · passed':''}</span></button>)}</nav>
  {screen==='Galaxy'&&<div className="sp-galaxy-layout"><GalaxyBoard initialFit view={view} candidates={[]} selected={selected} camera={camera} onCameraChange={next=>{setManualCamera(next);setFollowing(false);}} onSelect={inspectSector} onInspectFleet={inspectSector} onExplore={noExplore}/><aside className="sp-inspector">
   {sector?<section aria-label={`Sector ${sector.tileId} details`}><header><h2>Sector {sector.tileId}</h2><button onClick={()=>setSelected(null)}>Close sector details</button></header><p>{sectorOwner?getFaction(sectorOwner.faction).name:'Uncontrolled'} · {sectorDefinition(Number(sector.tileId))?.victoryPoints??0} printed VP</p><SectorFleet view={view} sectorId={sector.id}/><SectorPlanets sector={sector} view={view} candidates={[]}/></section>:<section aria-label="Current public action"><p className="sd-eyebrow">{view.phase==='finished'?'FINAL PUBLIC BOARD':'LATEST PUBLIC ACTION'}</p>{latest?<AiActionPanel view={view} entry={latest} onInspectSector={inspectSector}/>:<><h2>Watch the galaxy unfold</h2><p>Human and AI actions appear here as they happen. Select a sector or command center to explore.</p></>}</section>}
  </aside></div>}
  {screen==='Command centers'&&empire&&<section className="sp-workspace" aria-label="Public empire"><EmpireOverview view={view} seatId={empire.id} onSector={inspectSector} onBlueprints={type=>{setBlueprintType(type??'interceptor');navigate('Blueprints');}} onNavigate={destination=>{if(destination==='Scoring')navigate('Standings');else if(destination==='Research')navigate('Technologies');else document.querySelector('.eo-diplomacy')?.scrollIntoView({behavior:'smooth',block:'center'});}}/></section>}
  {screen==='Blueprints'&&empire&&<section className="sp-workspace" aria-label="Public blueprints"><h1>{getFaction(empire.faction).name} blueprints</h1><nav className="sp-navigation" aria-label="Blueprint classes">{empire.blueprints.map(item=><button key={item.shipType} aria-pressed={blueprintType===item.shipType} onClick={()=>setBlueprintType(item.shipType)}>{item.shipType}</button>)}</nav>{blueprint&&<><ShipCapabilities stats={deriveBlueprintStats(empire.faction,publicBlueprint(blueprint))} showWeapons/><BlueprintLoadout faction={empire.faction} blueprint={publicBlueprint(blueprint)}/></>}</section>}
  {screen==='Technologies'&&<section className="sp-workspace"><h1>Available technologies</h1><p>Public technology market. Inspect a command center to compare science income and research discounts.</p><div className="sp-technologies">{TECHNOLOGIES.filter(tech=>view.technologyMarket.includes(tech.id)).map(tech=><details key={tech.id}><summary><strong>{tech.name}</strong><span>{tech.track} · base {tech.baseCost} science · {view.technologyMarket.filter(id=>id===tech.id).length} available</span></summary><TechnologyStats technology={tech}/><p>{describeTechnology(tech)}</p></details>)}</div></section>}
  {screen==='History'&&<section className="sp-workspace"><HistoryPanel feed={history}/></section>}
  {screen==='Standings'&&<ScoreWorkspace view={view} scores={view.seats.map(seat=>runningScore(view,seat.id).breakdown)} playerNames={playerNames} onInspect={(seatId,category)=>{pause();inspection?.request({kind:'score',seatId,category});}} onHome={onHome} onGalaxy={()=>navigate('Galaxy')}/>}
  <PublicInspectionModal view={view}/>
 </main>;
}
