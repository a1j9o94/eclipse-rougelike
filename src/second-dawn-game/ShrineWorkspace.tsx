import {useState} from 'react';
import type {GameCommand,PlayerView,Resource} from '../../shared/eclipse/types';
import type {LegalCommandCandidate} from '../../shared/eclipse/legal';
import StructureSilhouette from './StructureSilhouette';
import SectorPlanets from './SectorPlanets';
import TradeResourceIcon from './TradeResourceIcon';
import './shrineWorkspace.css';
type ShrineCommand=Extract<GameCommand,{type:'place-shrine'}>;
interface Props {view:PlayerView;candidates:readonly LegalCommandCandidate[];draft:LegalCommandCandidate|null;disabled:boolean;onDraft:(draft:LegalCommandCandidate|null)=>void}
const rows:readonly Resource[]=['science','money','materials'];
const prices:Record<Resource,readonly [number,number,number]>={science:[2,3,4],money:[3,4,5],materials:[4,5,6]};
const rewards:Record<Resource,string>={science:'Wormhole Generator',money:'Discovery',materials:'Influence disc'};
const name=(value:string)=>value[0].toUpperCase()+value.slice(1);
/** Choose a physical Shrine from its track, then a compatible planet in controlled territory. */
export default function ShrineWorkspace({view,candidates,draft,disabled,onDraft}:Props){
 const seat=view.seats.find(candidate=>candidate.id===view.viewerSeatId)!;
 const commands=candidates.flatMap(candidate=>candidate.command.type==='place-shrine'?[candidate.command]:[]);
 const planned=draft?.command.type==='place-shrine'?draft.command:null;
 const [slot,setSlot]=useState<{row:Resource;column:0|1|2}|null>(planned?{row:planned.row,column:planned.column}:null);
 const [inspectedSector,setInspectedSector]=useState<string|null>(planned?.sectorId??null);
 const selectedSlot=slot??(planned?{row:planned.row,column:planned.column}:null);
 const options=selectedSlot?commands.filter(command=>command.row===selectedSlot.row&&command.column===selectedSlot.column):[];
 const sectorIds=[...new Set(options.map(command=>command.sectorId))];
 const sectorId=inspectedSector&&sectorIds.includes(inspectedSector)?inspectedSector:planned&&sectorIds.includes(planned.sectorId)?planned.sectorId:sectorIds[0];
 const sector=view.sectors.find(candidate=>candidate.id===sectorId);
 const stage=(command:ShrineCommand)=>onDraft({command,label:`Place ${command.row} Shrine · ${prices[command.row][command.column]} ${command.row}`,description:`Sector ${view.sectors.find(sector=>sector.id===command.sectorId)?.tileId??command.sectorId} · planet ${command.planetIndex+1}. ${((seat.shrines??[]).filter(shrine=>shrine.row===command.row).length)+1}/3 toward ${rewards[command.row]}.`});
 const chooseSlot=(row:Resource,column:0|1|2)=>{
  setSlot({row,column});
  const available=commands.filter(command=>command.row===row&&command.column===column);
  if(planned){stage({...planned,row,column});}
  else if(available.length===1){setInspectedSector(available[0].sectorId);stage(available[0]);}
  else onDraft(null);
 };
 const chooseSector=(id:string)=>{
  setInspectedSector(id);
  const available=options.filter(command=>command.sectorId===id);
  if(planned&&selectedSlot)stage({...planned,sectorId:id,...selectedSlot});
  else if(available.length===1)stage(available[0]);
 };
 return <section className="dg-shrine-workspace" aria-label="Lyra Shrines"><header><h2><StructureSilhouette kind="shrine"/>Shrines</h2><span>{seat.shrines?.length??0}/9 placed</span></header><div className="dg-shrine-tracks" aria-label="Shrine tracks">{rows.map(row=>{
  const placed=(seat.shrines??[]).filter(shrine=>shrine.row===row);
  return <section key={row} aria-label={`${name(row)} Shrine track`}><header><TradeResourceIcon resource={row}/><strong>{name(row)}</strong><small>{placed.length}/3 · {rewards[row]}</small></header><div>{([0,1,2] as const).map(column=>{
   const existing=placed.find(shrine=>shrine.column===column),available=commands.some(command=>command.row===row&&command.column===column);
   return <button key={column} type="button" aria-label={`Select ${name(row)} Shrine ${column+1}`} aria-pressed={selectedSlot?.row===row&&selectedSlot.column===column} disabled={disabled||!!existing} onClick={()=>chooseSlot(row,column)}><StructureSilhouette kind="shrine"/><strong>{existing?'Placed':`${prices[row][column]} ${row}`}</strong>{existing?<small>Sector {view.sectors.find(sector=>sector.id===existing.sectorId)?.tileId}</small>:!available?<small>{seat.resources[row]<prices[row][column]?`Need ${prices[row][column]-seat.resources[row]} more ${row}`:view.actionProgress?.shrinePlaced?'Placed this action':'No eligible planet now'}</small>:null}</button>;
  })}</div></section>;
 })}</div>{selectedSlot&&<section className="dg-shrine-planets" aria-label="Shrine planet placement"><h3>Place {name(selectedSlot.row)} Shrine {selectedSlot.column+1}</h3>{sectorIds.length>1&&<nav aria-label="Shrine sectors">{sectorIds.map(id=><button key={id} type="button" aria-pressed={sectorId===id} disabled={disabled} onClick={()=>chooseSector(id)}>Sector {view.sectors.find(sector=>sector.id===id)?.tileId}</button>)}</nav>}{sector?<><h4>Sector {sector.tileId}</h4><SectorPlanets sector={sector} view={view} candidates={[]} selection={{label:'Place Shrine on',disabled,eligibleSquareIds:options.filter(command=>command.sectorId===sector.id).map(command=>`p${command.planetIndex}`),selectedSquareId:planned?.sectorId===sector.id?`p${planned.planetIndex}`:null,ghost:'shrine',onSelect:squareId=>{const command=options.find(command=>command.sectorId===sector.id&&`p${command.planetIndex}`===squareId);if(command)stage(command);}}}/></>:<p role="status">{seat.resources[selectedSlot.row]<prices[selectedSlot.row][selectedSlot.column]?`Need ${prices[selectedSlot.row][selectedSlot.column]} ${selectedSlot.row}; ${seat.resources[selectedSlot.row]} available.`:'No matching planet is available for this Shrine during the current action.'}</p>}</section>}</section>;
}
