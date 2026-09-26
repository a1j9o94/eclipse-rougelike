import {useState} from 'react';
import type {GameCommand,PlayerView} from '../../shared/eclipse/types';
import {projectQueuedSteps,type ActionQueueStep,type ActionQueueView,type QueuedGameCommand,type QueueSectorTarget,type QueueShipTarget} from '../../shared/eclipse/queue';
import {TECHNOLOGIES} from '../../shared/eclipse/technologies';
import GameDialog from './GameDialog';
import './actionQueue.css';

interface Candidate {command:GameCommand;label:string;description:string}
interface Props {
 queue:ActionQueueView|null|undefined;
 view?:PlayerView;
 candidates:readonly Candidate[];
 disabled:boolean;
 onClose:()=>void;
 onSave:(steps:ActionQueueStep[])=>void;
 onStart:()=>void;
 onPause:()=>void;
 onResume:()=>void;
}
const title=(command:QueuedGameCommand)=>{
 const action=command.type==='trade-and-act'?command.action:command;
 switch(action.type){
  case 'research': return `Research ${action.tileId.replaceAll('-',' ')} · ${action.track}`;
  case 'quantum-research': return `Quantum research ${action.tileId.replaceAll('-',' ')}`;
  case 'research-development': return `Acquire ${action.developmentId.replaceAll('-',' ')}`;
  case 'upgrade': return `Upgrade ${action.blueprints.map(item=>item.shipType).join(', ')}`;
  case 'build': return `Build ${action.builds.map(item=>item.component).join(', ')}`;
  case 'move': return `Move ${action.moves.length} ${action.moves.length===1?'route':'routes'}`;
  case 'colonize': return `Colonize ${action.placements.length} ${action.placements.length===1?'planet':'planets'}`;
  default: return action.type.replaceAll('-',' ').replace(/^./,letter=>letter.toUpperCase());
 }
};
const targetKey=(target:QueueSectorTarget)=>typeof target==='string'?target:`coordinate:${target.position.q},${target.position.r}`;
const targetFromKey=(value:string):QueueSectorTarget=>value.startsWith('coordinate:')?{kind:'sector-coordinate',position:{q:Number(value.slice(11).split(',')[0]),r:Number(value.slice(11).split(',')[1])}}:value;
const shipKey=(target:QueueShipTarget)=>typeof target==='string'?target:`built:${target.stepId}:${target.buildIndex}`;
const shipFromKey=(value:string):QueueShipTarget=>value.startsWith('built:')?{kind:'built-ship',stepId:value.split(':')[1],buildIndex:Number(value.split(':')[2])}:value;

export default function ActionQueuePanel({queue,view,candidates,disabled,onClose,onSave,onStart,onPause,onResume}:Props){
 const [selection,setSelection]=useState('');
 const [editing,setEditing]=useState<string|null>(null);
 const [plannedTech,setPlannedTech]=useState('');
 const [plannedTrack,setPlannedTrack]=useState<'military'|'grid'|'nano'>('military');
 const [futureShip,setFutureShip]=useState('');
 const [futureDestination,setFutureDestination]=useState('');
 const steps=queue?.steps??[];
 const choices=candidates.filter(item=>item.command.type!=='resolve'&&item.command.type!=='set-auto-pass');
 const pending=steps.slice(queue?.currentIndex??0);
 const projections=view?projectQueuedSteps(view,pending):[];
 const canEdit=!disabled&&queue?.status!=='running';
 const sectorChoices:[string,string][]=[...(view?.sectors.map(sector=>[sector.id,`Sector ${sector.tileId}`] as [string,string])??[]),...steps.flatMap(step=>step.command.type==='explore'?[[targetKey({kind:'sector-coordinate',position:step.command.position}),`Explored hex ${step.command.position.q}, ${step.command.position.r}`] as [string,string]]:[])];
 const builtChoices=steps.flatMap((step,stepIndex)=>{const action=step.command.type==='trade-and-act'?step.command.action:step.command;return action.type==='build'?action.builds.flatMap((build,index)=>build.component==='orbital'||build.component==='monolith'?[]:[{key:`built:${step.id}:${index}`,label:`${build.component} from Build step ${stepIndex+1}`,stepIndex}]):[];});
 const futureShipChoices=[...(view?.ships.filter(ship=>ship.owner===view.viewerSeatId).map(ship=>({key:ship.id,label:`${ship.type} in sector ${view.sectors.find(sector=>sector.id===ship.sectorId)?.tileId??ship.sectorId}`}))??[]),...builtChoices];
 const change=(next:ActionQueueStep[])=>{if(canEdit)onSave(next);};
 const replace=(index:number,command:QueuedGameCommand)=>change(steps.map((step,itemIndex)=>itemIndex===index?{...step,command}:step));
 const editSector=(index:number,field:'build'|'move'|'influence-add'|'influence-remove'|'colonize'|'shrine',itemIndex:number,value:string)=>{
  const command=structuredClone(steps[index].command),target=targetFromKey(value);
  const action=command.type==='trade-and-act'?command.action:command;
  if(field==='build'&&action.type==='build')action.builds[itemIndex].sectorId=target;
  if(field==='move'&&action.type==='move')action.moves[itemIndex].path=[...action.moves[itemIndex].path.slice(0,-1),target];
  if(field==='influence-add'&&action.type==='influence')action.addSectorIds[itemIndex]=target;
  if(field==='influence-remove'&&action.type==='influence')action.removeSectorIds[itemIndex]=target;
  if(field==='colonize'&&action.type==='colonize')action.placements[itemIndex].sectorId=target;
  if(field==='shrine'&&action.type==='place-shrine')action.sectorId=target;
  replace(index,command);
 };
 const add=()=>{const candidate=choices[Number(selection)];if(!candidate)return;change([...steps,{id:crypto.randomUUID(),command:candidate.command as QueuedGameCommand}]);setSelection('');};
 const reorder=(index:number,direction:-1|1)=>{const target=index+direction;if(target<0||target>=steps.length)return;const next=[...steps];[next[index],next[target]]=[next[target],next[index]];change(next);};
 const sectorSelect=(index:number,field:'build'|'move'|'influence-add'|'influence-remove'|'colonize'|'shrine',itemIndex:number,target:QueueSectorTarget)=>{const priorCoordinates=new Set(steps.slice(0,index).flatMap(step=>step.command.type==='explore'?[targetKey({kind:'sector-coordinate',position:step.command.position})]:[]));const options=sectorChoices.filter(([key])=>!key.startsWith('coordinate:')||priorCoordinates.has(key));return <label key={`${field}-${itemIndex}`}>Target {itemIndex+1}<select aria-label={`Target ${itemIndex+1} for step ${index+1}`} value={targetKey(target)} disabled={!canEdit} onChange={event=>editSector(index,field,itemIndex,event.target.value)}>{!options.some(([key])=>key===targetKey(target))&&<option value={targetKey(target)}>{targetKey(target)}</option>}{options.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>;};
 const stepEditor=(step:ActionQueueStep,index:number)=>{const action=step.command.type==='trade-and-act'?step.command.action:step.command;return <div className="dg-action-queue-editor"><label>Replace command<select aria-label={`Replace step ${index+1}`} value="" disabled={!canEdit} onChange={event=>{const candidate=choices[Number(event.target.value)];if(candidate){replace(index,candidate.command as QueuedGameCommand);setEditing(null);}}}><option value="">Choose a current action…</option>{choices.map((candidate,choiceIndex)=><option key={choiceIndex} value={choiceIndex}>{candidate.label}</option>)}</select></label>{action.type==='build'&&action.builds.map((build,itemIndex)=>sectorSelect(index,'build',itemIndex,build.sectorId))}{action.type==='move'&&action.moves.map((move,itemIndex)=><div key={itemIndex}><label>Ship {itemIndex+1}<select value={shipKey(move.shipId)} disabled={!canEdit} onChange={event=>{const command=structuredClone(step.command);if(command.type==='move'){command.moves[itemIndex].shipId=shipFromKey(event.target.value);replace(index,command);}}}>{typeof move.shipId==='string'&&<option value={move.shipId}>{move.shipId}</option>}{builtChoices.filter(ship=>ship.stepIndex<index).map(ship=><option key={ship.key} value={ship.key}>{ship.label}</option>)}</select></label>{sectorSelect(index,'move',itemIndex,move.path.at(-1)??'')}</div>)}{action.type==='influence'&&<>{action.addSectorIds.map((target,itemIndex)=>sectorSelect(index,'influence-add',itemIndex,target))}{action.removeSectorIds.map((target,itemIndex)=>sectorSelect(index,'influence-remove',itemIndex,target))}</>}{action.type==='colonize'&&action.placements.map((placement,itemIndex)=>sectorSelect(index,'colonize',itemIndex,placement.sectorId))}{action.type==='place-shrine'&&sectorSelect(index,'shrine',0,action.sectorId)}<button type="button" onClick={()=>setEditing(null)}>Done editing</button></div>;};
 return <GameDialog title="Action queue" onClose={onClose} className="dg-action-queue-dialog">
  <p>Plan exact actions in order. The server checks each one when your turn arrives and pauses if the game has changed or a decision needs you.</p>
  {queue?.pauseReason&&<p className="dg-action-queue-alert" role="alert"><strong>Queue paused.</strong> {queue.pauseReason}</p>}
  <p className="dg-action-queue-status" role="status">{queue?.status==='running'?'Running while you are away':queue?.status==='paused'?'Paused for review':queue?.status==='finished'?'All planned actions completed':'Ready to plan'} · {pending.length} remaining</p>
  {steps.some((step,index)=>step.command.type==='pass'&&steps.slice(index+1).some(later=>['research','upgrade','build','move','explore','influence'].includes(later.command.type)))&&<p role="status">A Pass waits for the next round. Queue Finish upkeep after it if you want later actions to run unattended; otherwise the queue will wait for upkeep.</p>}
  {steps.length?<ol className="dg-action-queue-steps">{steps.map((step,index)=>{const projection=projections[index-(queue?.currentIndex??0)];return <li key={step.id} className={index<(queue?.currentIndex??0)?'is-complete':index===(queue?.currentIndex??0)&&queue?.status==='paused'?'is-paused':''}><div><strong>{title(step.command)}</strong><small>{index<(queue?.currentIndex??0)?'Done':index===(queue?.currentIndex??0)&&queue?.status==='paused'?'Needs review':index===(queue?.currentIndex??0)&&queue?.status==='running'?'Next':'Planned'}{projection?` · ${projection.status==='known'?'Projected':projection.status==='blocked'?'Likely blocked':'Outcome uncertain'}`:''}</small>{projection?.reason&&<small role="status">{projection.reason}</small>}{projection&&<small>After: {projection.resourcesAfter.money} money · {projection.resourcesAfter.science} science · {projection.resourcesAfter.materials} materials</small>}{editing===step.id&&stepEditor(step,index)}</div>{index>=(queue?.currentIndex??0)&&<div className="dg-action-queue-step-buttons"><button type="button" aria-label={`Edit step ${index+1}`} disabled={!canEdit} onClick={()=>setEditing(current=>current===step.id?null:step.id)}>Edit</button><button type="button" aria-label={`Move step ${index+1} earlier`} disabled={!canEdit||index<1||index-1<(queue?.currentIndex??0)} onClick={()=>reorder(index,-1)}>↑</button><button type="button" aria-label={`Move step ${index+1} later`} disabled={!canEdit||index===steps.length-1} onClick={()=>reorder(index,1)}>↓</button><button type="button" aria-label={`Remove ${title(step.command)}`} disabled={!canEdit} onClick={()=>change(steps.filter(item=>item.id!==step.id))}>Remove</button></div>}</li>;})}</ol>:<p>No actions queued yet. Choose a legal action below or use “Queue action” while reviewing a plan.</p>}
  <div className="dg-action-queue-add"><label htmlFor="dg-action-queue-choice">Add a currently available action</label><div><select id="dg-action-queue-choice" value={selection} disabled={!canEdit} onChange={event=>setSelection(event.target.value)}><option value="">Choose action…</option>{choices.map((candidate,index)=><option key={`${index}:${candidate.label}`} value={index}>{candidate.label}</option>)}</select><button type="button" disabled={!canEdit||selection===''} onClick={add}>Add</button></div><small>For ship designs, builds, movement routes and funding, use the action planner first.</small></div>
  {view&&<div className="dg-action-queue-add"><strong>Plan future actions</strong><div><select aria-label="Future technology" value={plannedTech} disabled={!canEdit} onChange={event=>setPlannedTech(event.target.value)}><option value="">Choose technology…</option>{TECHNOLOGIES.filter(tech=>view.technologyMarket.includes(tech.id)).map(tech=><option value={tech.id} key={tech.id}>{tech.name}</option>)}</select><select aria-label="Future research track" value={plannedTrack} disabled={!canEdit} onChange={event=>setPlannedTrack(event.target.value as typeof plannedTrack)}><option value="military">Military</option><option value="grid">Grid</option><option value="nano">Nano</option></select><button type="button" disabled={!canEdit||!plannedTech} onClick={()=>{change([...steps,{id:crypto.randomUUID(),command:{type:'research',tileId:plannedTech,track:plannedTrack}}]);setPlannedTech('');}}>Add Research</button></div>{futureShipChoices.length>0&&<div><select aria-label="Future built ship" value={futureShip} disabled={!canEdit} onChange={event=>setFutureShip(event.target.value)}><option value="">Choose ship…</option>{futureShipChoices.map(ship=><option key={ship.key} value={ship.key}>{ship.label}</option>)}</select><select aria-label="Future move destination" value={futureDestination} disabled={!canEdit} onChange={event=>setFutureDestination(event.target.value)}><option value="">Choose destination…</option>{sectorChoices.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><button type="button" disabled={!canEdit||!futureShip||!futureDestination} onClick={()=>{change([...steps,{id:crypto.randomUUID(),command:{type:'move',moves:[{shipId:shipFromKey(futureShip),path:[targetFromKey(futureDestination)]}]}}]);setFutureShip('');setFutureDestination('');}}>Add Move</button></div>}<div><button type="button" disabled={!canEdit} onClick={()=>change([...steps,{id:crypto.randomUUID(),command:{type:'pass'}}])}>Add Pass</button><button type="button" disabled={!canEdit} onClick={()=>change([...steps,{id:crypto.randomUUID(),command:{type:'finish-upkeep'}}])}>Add Finish upkeep</button></div><small>Future commands are projections. A hidden draw or changed board can pause the queue when execution reaches them.</small></div>}
  <div className="dg-action-queue-controls">{queue?.status==='running'?<button type="button" disabled={disabled} onClick={onPause}>Pause queue</button>:queue?.status==='paused'?<button className="sd-primary" type="button" disabled={disabled} onClick={onResume}>Resume queue</button>:<button className="sd-primary" type="button" disabled={disabled||!pending.length} onClick={onStart}>Start queue</button>}<button type="button" onClick={onClose}>Close</button></div>
 </GameDialog>;
}
