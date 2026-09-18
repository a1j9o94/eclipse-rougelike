import {useEffect,useRef,useState} from 'react';
import type {PlayerView,Seat} from '../../shared/eclipse/types';
import type {PublicHistoryEntry} from '../../shared/eclipse/history';
import type {GalaxyActivity} from './galaxyActivity';

/** Compare only the already-authorized public board; never access AI simulation state. */
export function galaxyChanges(before:PlayerView,after:PlayerView):GalaxyActivity{
 const affected=new Set<string>();const moves:GalaxyActivity['moves']=[];
 const oldSectors=new Map(before.sectors.map(s=>[s.id,s]));
 for(const sector of after.sectors)if(JSON.stringify(oldSectors.get(sector.id))!==JSON.stringify(sector))affected.add(sector.id);
 const oldShips=new Map(before.ships.map(s=>[s.id,s]));
 for(const ship of after.ships){const old=oldShips.get(ship.id);if(!old||old.damage!==ship.damage||old.sectorId!==ship.sectorId)affected.add(ship.sectorId);if(old&&old.sectorId!==ship.sectorId){affected.add(old.sectorId);if(!moves.some(m=>m.from===old.sectorId&&m.to===ship.sectorId))moves.push({from:old.sectorId,to:ship.sectorId});}oldShips.delete(ship.id);}
 for(const ship of oldShips.values())affected.add(ship.sectorId);
 return {affectedSectorIds:[...affected],moves};
}
export interface AiPresentation {actor:Seat|null;recent:PublicHistoryEntry|null;action:PublicHistoryEntry|null;activity:GalaxyActivity|undefined}
export function useAiPresentation(view:PlayerView,entries:readonly PublicHistoryEntry[],motionEnabled:boolean):AiPresentation{
 const previous=useRef(view),mountedRevision=useRef(view.revision),announcedRevision=useRef(view.revision);
 const [activity,setActivity]=useState<GalaxyActivity>();
 const [action,setAction]=useState<PublicHistoryEntry|null>(null);
 const [recent,setRecent]=useState<PublicHistoryEntry|null>(null);
 const owner=view.waitingFor?.owner??view.pendingDecision?.owner??view.activeSeatId;
 const actor=view.phase==='finished'?null:view.seats.find(s=>s.id===owner&&s.id!==view.viewerSeatId&&s.controller==='ai')??null;
 const newest=entries.find(entry=>entry.revision>mountedRevision.current&&entry.revision<=view.revision&&(view.seats.some(s=>s.id===entry.actorSeatId&&s.controller==='ai')||entry.summary.startsWith('AI takeover · ')));
 const newestAction=entries.find(entry=>entry.presentation&&entry.revision>mountedRevision.current&&entry.revision<=view.revision&&(view.seats.some(s=>s.id===entry.actorSeatId&&s.controller==='ai')||entry.summary.startsWith('AI takeover · ')));
 useEffect(()=>{if(newestAction)setAction(current=>current&&current.revision>=newestAction.revision?current:newestAction);},[newestAction]);
 useEffect(()=>{
  if(!newest||newest.revision<=announcedRevision.current)return;
  announcedRevision.current=newest.revision;setRecent(newest);
 },[newest]);
 useEffect(()=>{
  if(!recent)return;
  const timer=window.setTimeout(()=>setRecent(null),6000);
  return()=>window.clearTimeout(timer);
 },[recent]);
 useEffect(()=>{
  const before=previous.current;previous.current=view;
  if(!motionEnabled){setActivity(undefined);return;}
  if(view.revision<=before.revision)return;
  setActivity(undefined);
  const priorOwner=before.waitingFor?.owner??before.pendingDecision?.owner??before.activeSeatId;
  if(!before.seats.some(s=>s.id===priorOwner&&s.id!==view.viewerSeatId&&s.controller==='ai'))return;
  const changed=galaxyChanges(before,view);
  if(!changed.affectedSectorIds.length)return;
  setActivity(changed);
 },[view,motionEnabled]);
 useEffect(()=>{
  if(!activity)return;
  const timer=window.setTimeout(()=>setActivity(undefined),1050);
  return()=>window.clearTimeout(timer);
 },[activity]);
 return {actor,recent,action,activity};
}
