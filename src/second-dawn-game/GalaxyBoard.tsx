import {seatColor} from './factionColors';
import {displayedWormholes} from './visibleConnections';
import type {BuildOrderItem} from './buildPlanning';
import type {MovementRoutePreview} from './movementPlanning';
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PlayerView, Ship } from "../../shared/eclipse/types";
import { getFaction } from "../../shared/eclipse/catalog";
import { sectorDefinition } from "../../shared/eclipse/sectors";
import { connectionBetween } from "../../shared/eclipse/geometry";
import { mapSector,movementAbilities } from "../../shared/eclipse/rulesState";
import type { CommandCandidate } from "./SecondDawnBoard";
import { galaxyPoint, TILE_RADIUS, wormholePoint } from "./galaxyGeometry";
import "./galaxy.css";
import { PlanetIcon } from "./SectorPlanets";
import ShipSilhouette from './ShipSilhouette';
import {NeutralShipSilhouette} from './BattleOverview';
import FactionSymbol from './FactionSymbol';
import type {GalaxyActivity} from './galaxyActivity';
import {useGalaxyGestures} from './useGalaxyGestures';
import type {GalaxyCamera} from './galaxyGestures';
interface Props {
  showPrintedWormholes?:boolean;
  plannedBuilds?:readonly BuildOrderItem[];
  plannedMoves?:readonly MovementRoutePreview[];
  onSelectBuildItem?:(id:string)=>void;
  onInspectFleet?:(sectorId:string)=>void;
  view: PlayerView;
  candidates: CommandCandidate[];
  selected: string | null;
  legalTargetIds?: string[];
  targetLabel?: string;
  initialFit?: boolean;
  activity?: GalaxyActivity;
  fitRequest?: number;
  compact?: boolean;
  camera?: GalaxyCamera;
  onCameraChange?: (camera:GalaxyCamera)=>void;
  onSelect: (id: string) => void;
  onExplore: (candidate: CommandCandidate) => void;
}
const territoryTones = {
  red: ["#553039", "#291c28"],
  blue: ["#204958", "#142a3a"],
  green: ["#285044", "#162f29"],
  yellow: ["#554b28", "#30291c"],
  white: ["#424b56", "#252d36"],
  black: ["#302d40", "#181923"],
};
const resources = {
  money: "#e7bd67",
  science: "#b397da",
  materials: "#aa825f",
  gray: "#a8b4c0",
};
const hex = Array.from(
  { length: 6 },
  (_, i) =>
    `${TILE_RADIUS * Math.cos(((30 + i * 60) * Math.PI) / 180)},${TILE_RADIUS * Math.sin(((30 + i * 60) * Math.PI) / 180)}`,
).join(" ");
export default function GalaxyBoard({
  view,
  showPrintedWormholes=false,
  plannedBuilds=[],plannedMoves=[],onSelectBuildItem,onInspectFleet,
  candidates,
  selected,
  legalTargetIds = [],
  targetLabel = 'legal move destination',
  initialFit = false,
  activity,
  fitRequest=0,
  compact:compactProp,
  camera:controlledCamera,
  onCameraChange,
  onSelect,
  onExplore,
}: Props) {
  const viewer=view.seats.find(seat=>seat.id===view.viewerSeatId);
  const hasGenerator=viewer?movementAbilities(viewer).wormholeGenerator:false;
  const [smallScreen,setSmallScreen]=useState(()=>window.matchMedia?.('(max-width: 760px)').matches??false);
  useEffect(()=>{const query=window.matchMedia?.('(max-width: 760px)');if(!query)return;const changed=()=>setSmallScreen(query.matches);query.addEventListener('change',changed);return()=>query.removeEventListener('change',changed);},[]);
  const compact=compactProp??smallScreen;
  const [sectorListOpen,setSectorListOpen]=useState(false);
  const [hoveredSector,setHoveredSector]=useState<string|null>(null);
  const [focusedSector,setFocusedSector]=useState<string|null>(null);
  const listRef=useRef<HTMLElement>(null),listToggleRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(sectorListOpen)listRef.current?.focus();},[sectorListOpen]);
  const svgRef=useRef<SVGSVGElement>(null);
  const [mapSize,setMapSize]=useState({width:0,height:0});
  useLayoutEffect(()=>{const svg=svgRef.current;if(!svg)return;const measure=()=>{const rect=svg.getBoundingClientRect();setMapSize({width:rect.width,height:rect.height});};measure();if(typeof ResizeObserver==='undefined')return;const observer=new ResizeObserver(measure);observer.observe(svg);return()=>observer.disconnect();},[]);
  const frontiers = candidates.filter((c) => c.command.type === "explore");
  const points = [
    ...view.sectors.map((s) => s.position),
    ...frontiers.flatMap((c) =>
      c.command.type === "explore" ? [c.command.position] : [],
    ),
  ].map(galaxyPoint);
  const minX = Math.min(...points.map((p) => p.x)) - 68,
    maxX = Math.max(...points.map((p) => p.x)) + 68;
  const minY = Math.min(...points.map((p) => p.y)) - 68,
    maxY = Math.max(...points.map((p) => p.y)) + 68;
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const owned = view.sectors
    .filter((s) => s.owner === view.viewerSeatId)
    .map((s) => galaxyPoint(s.position));
  const [localCamera,setLocalCamera]=useState<GalaxyCamera>(()=>controlledCamera??{zoom:initialFit||compact?1:view.sectors.length>20?1.4:1.6,center:initialFit||compact||!owned.length?center:{x:owned.reduce((n,p)=>n+p.x,0)/owned.length,y:owned.reduce((n,p)=>n+p.y,0)/owned.length}});
  const camera=controlledCamera??localCamera,zoom=camera.zoom;
  const updateCamera=(next:GalaxyCamera)=>{setLocalCamera(next);onCameraChange?.(next);};
  const appliedFit=useRef(controlledCamera?fitRequest:0);
  useEffect(()=>{if(appliedFit.current===fitRequest)return;appliedFit.current=fitRequest;const next={zoom:1,center:{x:center.x,y:center.y}};setLocalCamera(next);onCameraChange?.(next);},[fitRequest,center.x,center.y,onCameraChange]);
  const tilePixels=TILE_RADIUS*2*zoom*Math.min(mapSize.width/(maxX-minX),mapSize.height/(maxY-minY));
  const detail=compact?tilePixels>=115:view.sectors.length<15||zoom>=1.6;
  const maximumZoom=compact?5:3;
  const gestures=useGalaxyGestures({svgRef,camera,viewport:{x:minX,y:minY,width:maxX-minX,height:maxY-minY},maxZoom:maximumZoom,onCameraChange:updateCamera,onTap:target=>{
    if(target.startsWith('build:'))onSelectBuildItem?.(target.slice(6));
    else if(target.startsWith('fleet:'))onInspectFleet?.(target.slice(6));
    else if(target.startsWith('sector:'))onSelect(target.slice(7));
    else if(target.startsWith('frontier:')){const candidate=frontiers[Number(target.slice(9))];if(candidate)onExplore(candidate);}
  }});
  const ownerInfo = (id: string | null) => {
    const index = view.seats.findIndex((s) => s.id === id);
    const seat=view.seats[index];
    const faction=seat?getFaction(seat.faction):undefined;
    return {
      faction,
      color: seat ? seatColor(seat) : "#a0aab7",
      territory: seat ? `url(#dg-sector-owner-${seat.pieceColor??faction!.color})` : "url(#dg-sector-space)",
      mark:
        index >= 0
          ? String(index + 1)
          : id === "ancient"
            ? "A"
            : id === "guardian"
              ? "G"
              : "C",
      name: faction?.name ?? (id === "ancient" ? "Ancients" : id === "guardian" ? "Guardians" : id === "gcds" ? "Galactic Center Defense System" : "uncontrolled"),
    };
  };
  return (
    <div className={`sd-map dg-galaxy${compact?' dg-galaxy-compact':''}${compact&&!detail?' dg-mobile-overview':''}`}>
      <svg
        ref={svgRef}
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        role="group"
        aria-label="Galaxy map"
        {...gestures}
      >
        <defs>
          <pattern
            id="dg-sector-nebula"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            <image
              href="/second-dawn/galaxy-atmosphere.png"
              x="-55"
              y="-55"
              width="250"
              height="166"
              opacity=".17"
            />
          </pattern>
          {["#d5b27a", "#6fa9be", "#b59080", "#9bad7e"].map((tone, i) => (
            <radialGradient key={tone} id={`dg-world-${i}`} cx="30%" cy="25%">
              <stop stopColor="#f1e5be" />
              <stop offset=".3" stopColor={tone} />
              <stop offset=".8" stopColor="#26313a" />
              <stop offset="1" stopColor="#07101a" />
            </radialGradient>
          ))}
          {Object.entries(territoryTones).map(([color, tones]) => (
            <radialGradient id={`dg-sector-owner-${color}`} key={color}>
              <stop stopColor={tones[0]} />
              <stop offset="1" stopColor={tones[1]} />
            </radialGradient>
          ))}
          <radialGradient id="dg-sector-space">
            <stop stopColor="#25394a" />
            <stop offset="1" stopColor="#10202d" />
          </radialGradient>
          <radialGradient id="dg-planet">
            <stop stopColor="#ece0b0" />
            <stop offset=".5" stopColor="#ad8c54" />
            <stop offset="1" stopColor="#4a4030" />
          </radialGradient>
        </defs>
        <g
          data-galaxy-camera="true"
          transform={`translate(${center.x} ${center.y}) scale(${zoom}) translate(${-camera.center.x} ${-camera.center.y})`}
        >
          {view.sectors.flatMap((from, i) =>
            view.sectors.slice(i + 1).map((to) => {
              const connection=connectionBetween({...mapSector(from),warpPortal:false},{...mapSector(to),warpPortal:false},hasGenerator);
              if(connection!=='wormhole'&&connection!=='generator')return null;
              const a = galaxyPoint(from.position),
                b = galaxyPoint(to.position);
              return (
                <line
                  key={`${from.id}-${to.id}`}
                  data-connection={connection}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={connection==='generator'?'#8cd8e5':'#e8c881'}
                  strokeDasharray={connection==='generator'?'3 2':undefined}
                  strokeWidth="7"
                >
                  <title>
                    {connection==='generator'?'Your Wormhole Generator':'Paired wormholes'}: sector {from.tileId} to {to.tileId}
                  </title>
                </line>
              );
            }),
          )}
          {view.sectors.map((s) => {
            const { x, y } = galaxyPoint(s.position),
              owner = ownerInfo(s.owner),
              definition = sectorDefinition(Number(s.tileId))!;
            const fleets = view.ships.filter((ship) => ship.sectorId === s.id);
            const groups: {owner:string;type:Ship['type'];count:number}[]=[];
            for(const ship of fleets){
              const group=groups.find(item=>item.owner===ship.owner&&item.type===ship.type);
              if(group)group.count++;else groups.push({owner:ship.owner,type:ship.type,count:1});
            }
            const visibleGroups=compact&&!detail?[]:groups.slice(0,groups.length>4?3:4);
            const portal = s.portalVp !== undefined || definition.warpPortal;
            return (
              <g
                key={s.id}
                transform={`translate(${x} ${y})`}
                role="button"
                tabIndex={0}
                data-galaxy-target={`sector:${s.id}`}
                onPointerEnter={event=>{if(event.pointerType!=='touch')setHoveredSector(s.id);}}
                onPointerLeave={()=>setHoveredSector(null)}
                onFocus={()=>setFocusedSector(s.id)}
                onBlur={()=>setFocusedSector(null)}
                className={`sd-sector dg-tile ${detail ? "dg-tile-detailed" : "dg-tile-overview"} ${selected === s.id ? "is-selected" : ""} ${activity?.affectedSectorIds.includes(s.id) ? "dg-tile-activity" : ""}`}
                aria-label={`Inspect sector ${s.tileId}, ${owner.name}, ${fleets.length} ships${legalTargetIds.includes(s.id) ? `, ${targetLabel}` : ""}`}
                onClick={() => {
                  onSelect(s.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(s.id);
                  }
                }}
              >
                <polygon
                  className="dg-tile-face"
                  points={hex}
                  fill={s.owner ? owner.territory : "url(#dg-sector-space)"}
                  stroke={
                    selected === s.id
                      ? "#fff1c8"
                      : s.owner
                        ? owner.color
                        : "#526271"
                  }
                  strokeWidth={selected === s.id ? 3.5 : s.owner ? 2.4 : 1.2}
                />
                <polygon
                  points={hex}
                  fill="url(#dg-sector-nebula)"
                  pointerEvents="none"
                />
                <polygon
                  points={hex}
                  transform="scale(.93)"
                  fill="none"
                  stroke={owner.color}
                  strokeOpacity={s.owner ? ".36" : ".14"}
                />
                {legalTargetIds.includes(s.id) && (
                  <polygon className="dg-move-target-ring" points={hex} transform="scale(.88)" fill="none" stroke="#a1ebee" strokeWidth="2.5" strokeDasharray="6 4" pointerEvents="none"><title>{targetLabel}</title></polygon>
                )}
                {displayedWormholes(view,s,showPrintedWormholes||selected===s.id||hoveredSector===s.id||focusedSector===s.id).map(({edge,kind}) => {
                  const p = wormholePoint(edge, 0);
                  return (
                    <circle
                      key={edge}
                      data-wormhole-edge={edge}
                      data-wormhole-kind={kind}
                      cx={p.x}
                      cy={p.y}
                      r="5"
                      fill="#11222f"
                      stroke={kind==='printed'?'#d5e0e7':kind==='generator'?'#8cd8e5':'#e8c881'}
                      strokeDasharray={kind==='printed'?'2 2':undefined}
                      strokeWidth="2"
                    >
                      <title>
                        {kind==='printed'?'Printed wormhole opening; no usable connection to a placed neighbor.':kind==='generator'?'Connection enabled by your Wormhole Generator.':'Connected wormholes.'}
                      </title>
                    </circle>
                  );
                })}
                <text
                  x="0"
                  y="-33"
                  textAnchor="middle"
                  className="dg-sector-id"
                >
                  {s.tileId}
                </text>
                {owner.faction && (
                  <g transform="translate(-30 -24)" color={owner.color}>
                    <circle r="11" fill="#08121b" stroke={owner.color}/>
                    <g transform="translate(-8 -8) scale(.667)"><FactionSymbol faction={owner.faction.id}/></g>
                  </g>
                )}
                <circle
                  className="dg-sector-world"
                  cx="4"
                  cy="-23"
                  r={definition.gcds ? 10 : 9}
                  fill={`url(#dg-world-${Number(s.tileId) % 4})`}
                  opacity=".85"
                />
                <text
                  x="30"
                  y="-21"
                  textAnchor="middle"
                  className="dg-sector-vp"
                  opacity={detail ? 1 : 0}
                >
                  {definition.victoryPoints}
                  <title>
                    {definition.victoryPoints} victory points for controlling
                    this sector
                  </title>
                </text>
                {visibleGroups.map((group,index)=>{
                  const info=ownerInfo(group.owner), two=groups.length>1;
                  const fx=two?(index%2?21:-21):0,fy=Math.floor(index/2)*20;
                  const name=group.type[0].toUpperCase()+group.type.slice(1);
                  return <g key={`${group.owner}-${group.type}`} data-fleet-card={group.type} data-galaxy-target={onInspectFleet?`fleet:${s.id}`:undefined} role={onInspectFleet?"button":"img"} tabIndex={onInspectFleet?0:undefined} onClick={onInspectFleet?e=>{e.stopPropagation();onInspectFleet(s.id);}:undefined} onKeyDown={onInspectFleet?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onInspectFleet(s.id);}}:undefined} aria-label={`${info.name}: ${group.count} ${name}${group.count>1?'s':''}`} transform={`translate(${fx} ${fy})`} color={info.color} className="dg-map-fleet-card">
                    <rect x="-20" y="-9" width="40" height="18" rx="3" fill="#08121b" stroke={info.color} strokeWidth=".8"/>
                    <rect x="-20" y="-9" width="40" height="18" rx="3" fill={info.color} opacity=".13"/>
                    <svg x="-20" y="-9" width="22" height="18" viewBox="0 0 24 24">
                      {group.type==='ancient'||group.type==='guardian'||group.type==='gcds'?<NeutralShipSilhouette type={group.type}/>:<ShipSilhouette type={group.type} faction={view.seats.find(seat=>seat.id===group.owner)?.faction}/>}
                    </svg>
                    <text x="9" y="3.5" textAnchor="middle" fill={info.color} className="dg-fleet-label">×{group.count}</text>
                    <title>{info.name}: {group.count} {name}{group.count>1?'s':''}. Select sector to inspect fleet.</title>
                  </g>;
                })}
                {compact&&!detail&&fleets.length>0&&<g className="dg-mobile-fleet" transform="translate(0 8)" role="img" aria-label={`${fleets.length} ships; select sector for ship types`}><rect x="-29" y="-14" width="58" height="28" rx="6" fill="#07111d" stroke={ownerInfo(groups[0].owner).color} strokeWidth="2"/><path d="M-24 7 -17 -7 -10 7 -17 3Z M-13 3 -6 -11 1 3 -6 -1Z" fill={ownerInfo(groups[0].owner).color}/>{tilePixels>=40?<text x="14" y="7" textAnchor="middle" fill="#f0e3bc" fontSize="23" fontWeight="700">{fleets.length}</text>:<circle cx="15" r="6" fill="#f0e3bc"/>}</g>}
                {(!compact||detail)&&groups.length>4&&<g transform="translate(21 20)" className="dg-map-fleet-overflow"><rect x="-20" y="-9" width="40" height="18" rx="3" fill="#152331" stroke="#93a7b8"/><text y="3" textAnchor="middle" fill="#e9dcc2" fontSize="8">+{groups.length-3} types</text><title>Select sector to inspect all {groups.length} fleet groups</title></g>}
                {detail &&
                  definition.population.map((square, index) => (
                    <g
                      key={index}
                      transform={`translate(${(index - (definition.population.length - 1) / 2) * 10} 39)`}
                      data-component="population-square"
                    >
                      <circle
                        r="5"
                        fill={resources[square.resource]}
                        opacity=".85"
                      />
                      <g transform="translate(-4 -4) scale(.4)" color="#12202b">
                        <PlanetIcon resource={square.resource} />
                      </g>
                      {s.population.some((p) => p.squareId === `p${index}`) && (
                        <rect
                          x="2"
                          y="1"
                          width="4"
                          height="4"
                          fill={owner.color}
                          stroke="#fff"
                          strokeWidth=".7"
                        />
                      )}
                      {square.advanced && (
                        <rect
                          x="-6.5"
                          y="-6.5"
                          width="13"
                          height="13"
                          rx="2"
                          fill="none"
                          stroke={resources[square.resource]}
                          strokeWidth="1.2"
                        />
                      )}
                      <title>
                        {square.advanced ? "Advanced " : ""}
                        {square.resource} population square
                        {square.advanced
                          ? "; requires matching advanced technology or Metasynthesis"
                          : ""}
                      </title>
                    </g>
                  ))}
                {portal && (
                  <g transform="translate(30 -10)">
                    <circle
                      r="6"
                      fill="#122f42"
                      stroke="#96dfef"
                      strokeWidth="2"
                    />
                    <circle r="2" fill="#96dfef" />
                    <title>
                      Warp portal: connects to every other warp portal,
                      regardless of distance.
                    </title>
                  </g>
                )}
                {s.discovery && (
                  <g transform="translate(-30 -10)">
                    <path d="M0 -5 L5 0 L0 5 L-5 0 Z" fill="#e8c881" />
                    <title>
                      Discovery tile: explore its reward after clearing
                      defending ships.
                    </title>
                  </g>
                )}
                {s.orbital && (
                  <ellipse
                    cx="-29"
                    cy="29"
                    rx="6"
                    ry="3"
                    fill="none"
                    stroke="#dcd2bb"
                    strokeWidth="2"
                  >
                    <title>
                      Orbital: one money or science population square
                    </title>
                  </ellipse>
                )}
                {s.monolith && (
                  <path d="M26 26 H31 V34 H26 Z" fill="#dcd2bb">
                    <title>Monolith: 3 victory points</title>
                  </path>
                )}
              </g>
            );
          })}
          {activity?.moves.map((move,index)=>{
            const from=view.sectors.find(sector=>sector.id===move.from),to=view.sectors.find(sector=>sector.id===move.to);
            if(!from||!to)return null;
            const a=galaxyPoint(from.position),b=galaxyPoint(to.position);
            return <g key={`${move.from}-${move.to}-${index}`} className="dg-activity-move" pointerEvents="none" aria-hidden="true"><path d={`M${a.x} ${a.y} L${b.x} ${b.y}`} fill="none" stroke="#f3dc96" strokeWidth="3" strokeDasharray="7 6"/><circle cx={b.x} cy={b.y} r="11" fill="none" stroke="#f3dc96" strokeWidth="2"/></g>;
          })}
          <g className="dg-draft-routes" aria-label="Planned routes" pointerEvents="none">{plannedMoves.map((route,index)=>route.status==='valid'?route.draft.shipIds.map(shipId=>{const ids=[route.draft.sourceSectorId,...route.paths.filter(move=>move.shipId===shipId).flatMap(move=>move.path)];const points=ids.flatMap(id=>{const sector=view.sectors.find(s=>s.id===id);return sector?[galaxyPoint(sector.position)]:[];});const last=points.at(-1);return <g key={`${index}-${shipId}`}><polyline points={points.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#f2d486" strokeWidth="3" strokeDasharray="7 4"/><title>Planned route {index+1}, {ids.map(id=>view.sectors.find(s=>s.id===id)?.tileId??id).join(' to ')}</title>{last&&<g transform={`translate(${last.x} ${last.y-33})`}><circle r="10" fill="#111e2acc" stroke="#f2d486"/><text textAnchor="middle" y="4" fill="#ffe4a4" fontSize="11">{index+1}</text></g>}</g>;}):null)}</g>
          {plannedBuilds.filter(item=>item.sectorId).map((item,index)=>{const sector=view.sectors.find(s=>s.id===item.sectorId);if(!sector)return null;const p=galaxyPoint(sector.position);const peers=plannedBuilds.filter(other=>other.sectorId===item.sectorId);const offset=(peers.indexOf(item)-(peers.length-1)/2)*20;return <g key={item.id} transform={`translate(${p.x+offset} ${p.y+27})`} className="dg-draft-piece" role="button" tabIndex={0} data-galaxy-target={`build:${item.id}`} aria-label={`Relocate planned ${item.component} ${index+1} in sector ${sector.tileId}`} onClick={e=>{e.stopPropagation();onSelectBuildItem?.(item.id);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onSelectBuildItem?.(item.id);}}}><rect x="-10" y="-12" width="20" height="24" rx="4" fill="#143949cc" stroke="#92e5d5" strokeDasharray="3 2"/><path d="M0 -8 7 7 0 3 -7 7Z" fill="#9fe1d2" opacity=".7"/><title>{item.component} · planned, not built</title></g>;})}
          {frontiers.map((candidate, index) => {
            if (candidate.command.type !== "explore") return null;
            const p = galaxyPoint(candidate.command.position);
            return (
              <g
                key={index}
                transform={`translate(${p.x} ${p.y})`}
                role="button"
                tabIndex={0}
                className="sd-frontier"
                data-galaxy-target={`frontier:${index}`}
                aria-label={candidate.label}
                onClick={() => {
                  onExplore(candidate);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onExplore(candidate);
                  }
                }}
              >
                <polygon
                  points={hex}
                  fill="#142923"
                  fillOpacity=".4"
                  stroke="#82b9a0"
                  strokeDasharray="3 7"
                />
                <text textAnchor="middle" y="4" fill="#b7d5c4" fontSize="20">
                  +
                </text>
                <text textAnchor="middle" y="20" fill="#b7d5c4" fontSize="9">
                  EXPLORE
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      {zoom > 1 && (
        <div className="dg-galaxy-overview">
          <span>Your territory</span>
          <svg
            viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
            role="img"
            aria-label="Whole galaxy overview; outlined area is the current view"
          >
            <g>
              {view.sectors.map((s) => {
                const p = galaxyPoint(s.position);
                return (
                  <polygon
                    key={s.id}
                    points={hex}
                    transform={`translate(${p.x} ${p.y})`}
                    fill={ownerInfo(s.owner).color}
                    opacity={s.owner === view.viewerSeatId ? 1 : 0.4}
                  />
                );
              })}
            </g>
            <rect
              x={camera.center.x + (minX - center.x) / zoom}
              y={camera.center.y + (minY - center.y) / zoom}
              width={(maxX - minX) / zoom}
              height={(maxY - minY) / zoom}
              fill="none"
              stroke="#f3daa3"
              strokeWidth="8"
            />
          </svg>
          <span>Fit: whole galaxy</span>
        </div>
      )}
      <div className="dg-map-key">
        <span>
          <i className="dg-key-wormhole" />
          {hasGenerator?'Connections · dashed: your Generator':'Connected wormholes'}
        </span>
        <span>
          <i className="dg-key-portal" />
          Warp portal
        </span>
        {(showPrintedWormholes||selected||hoveredSector||focusedSector)&&<span>Dashed: unconnected printed openings</span>}
        <span>Fleet: ship class × count · select for details</span>
        <span>
          {detail
            ? "Outlined planets are advanced · Fit shows whole galaxy"
            : "Fit shows whole galaxy"}{" "}
          · Drag to pan
        </span>
      </div>
      <div className="sd-map-controls">
        <button
          aria-label="Zoom out"
          onClick={() => updateCamera({...camera,zoom:Math.max(.6,+(zoom-.2).toFixed(1))})}
        >
          −
        </button>
        <span aria-live="off" aria-label="Galaxy zoom">{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Zoom in"
          onClick={() => updateCamera({...camera,zoom:Math.min(maximumZoom,+(zoom+.2).toFixed(1))})}
        >
          +
        </button>
        <button
          onClick={() => {
            updateCamera({zoom:1,center});
          }}
        >
          Fit
        </button>
        <button ref={listToggleRef} className="dg-sector-list-toggle" aria-expanded={sectorListOpen} onClick={()=>setSectorListOpen(open=>!open)}>Sectors</button>
        {[
          { label: "left", x: -70, y: 0, symbol: "←" },
          { label: "right", x: 70, y: 0, symbol: "→" },
          { label: "up", x: 0, y: -70, symbol: "↑" },
          { label: "down", x: 0, y: 70, symbol: "↓" },
        ].map((p) => (
          <button
            key={p.label}
            aria-label={`Pan ${p.label}`}
            className="dg-pan-button"
            onClick={() => updateCamera({...camera,center:{x:camera.center.x-p.x/zoom,y:camera.center.y-p.y/zoom}})}
          >
            {p.symbol}
          </button>
        ))}
      </div>
      {sectorListOpen&&<section ref={listRef} tabIndex={-1} className="dg-map-sector-list" aria-label="Galaxy sector list" onKeyDown={event=>{if(event.key==='Escape'){setSectorListOpen(false);listToggleRef.current?.focus();}}}><header><strong>Select a sector</strong><button onClick={()=>{setSectorListOpen(false);listToggleRef.current?.focus();}} aria-label="Close sector list">Close</button></header><div>{frontiers.map((candidate,index)=><button key={`frontier-${index}`} onClick={()=>{setSectorListOpen(false);onExplore(candidate);}}><strong>Explore</strong><span>{candidate.label}</span></button>)}{view.sectors.map(sector=><button key={sector.id} aria-pressed={selected===sector.id} onClick={()=>{setSectorListOpen(false);onSelect(sector.id);}}><strong>Sector {sector.tileId}{legalTargetIds.includes(sector.id)?` · ${targetLabel}`:''}</strong><span>{ownerInfo(sector.owner).name} · {view.ships.filter(ship=>ship.sectorId===sector.id).length} ships</span></button>)}</div></section>}
    </div>
  );
}
