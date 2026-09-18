import {useCallback,useEffect,useRef,useState} from 'react';
import type {ActivityBoundary} from './useActivityRecap';
interface Props {key:string|null;connected:boolean;revision:number;refresh:()=>Promise<ActivityBoundary|null>;onResume:(boundary:ActivityBoundary)=>void}
interface Recovery {key:string|null;checking:boolean;minimumRevision:number;error:string|null}
/** Revalidate after a sleeping tab or socket recovery. This never queues commands. */
export function useForegroundMatch({key,connected,revision,refresh,onResume}:Props){
 const latest=useRef({key,connected,refresh,onResume});latest.current={key,connected,refresh,onResume};
 const [recovery,setRecovery]=useState<Recovery>({key:null,checking:false,minimumRevision:0,error:null});
 const generation=useRef(0);
 const invalidate=useCallback(()=>{generation.current++;},[]);
 const previous=useRef({key,connected});
 const check=useRef<()=>void>(()=>{});
 check.current=()=>{
  const request=latest.current;if(!request.key||!request.connected)return;
  const token=++generation.current;
  setRecovery({key:request.key,checking:true,minimumRevision:0,error:null});
  void request.refresh().then(boundary=>{
   if(token!==generation.current||latest.current.key!==request.key)return;
   if(!boundary)throw Error('This player cannot access the saved game.');
   setRecovery({key:request.key,checking:false,minimumRevision:boundary.revision,error:null});
   latest.current.onResume(boundary);
  }).catch(error=>{
   if(token!==generation.current||latest.current.key!==request.key)return;
   setRecovery({key:request.key,checking:false,minimumRevision:0,error:error instanceof Error?error.message:'Could not refresh the game.'});
  });
 };
 useEffect(()=>{
  const old=previous.current;previous.current={key,connected};
  if(old.key!==key){generation.current++;return;}
  if(key&&connected&&!old.connected)check.current();
 },[key,connected]);
 useEffect(()=>{
  let hidden=document.visibilityState==='hidden';
  const visibility=()=>{if(document.visibilityState==='hidden'){hidden=true;return;}if(hidden){hidden=false;check.current();}};
  document.addEventListener('visibilitychange',visibility);
  return()=>{invalidate();document.removeEventListener('visibilitychange',visibility);};
 },[invalidate]);
 const current=recovery.key===key?recovery:null;
 return {ready:connected&&!current?.checking&&!current?.error&&revision>=(current?.minimumRevision??0),checking:current?.checking??false,error:current?.error??null,retry:()=>check.current()};
}
