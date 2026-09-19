import {useCallback,useEffect,useRef,useState} from 'react';
interface CombatResultNotice {visible:boolean;dismiss:()=>void}
interface VisibleResult {revision:number;screen:string}
/** A casualty result is brief feedback for its committed revision, never persistent history. */
export function useCombatResultNotice(playbackRevision:number|null,viewRevision:number,screen:string):CombatResultNotice {
 const highestSeenRevision=useRef(-1);
 const [notice,setNotice]=useState<VisibleResult|null>(null);
 useEffect(()=>{
  const isNew=playbackRevision!==null&&playbackRevision>highestSeenRevision.current;
  if(playbackRevision!==null)highestSeenRevision.current=Math.max(highestSeenRevision.current,playbackRevision);
  if(isNew&&playbackRevision===viewRevision){setNotice({revision:playbackRevision,screen});return;}
  setNotice(current=>current&&current.revision===playbackRevision&&current.revision===viewRevision&&current.screen===screen?current:null);
 },[playbackRevision,viewRevision,screen]);
 useEffect(()=>{
  if(!notice)return;
  const timeout=setTimeout(()=>setNotice(null),6000);
  return ()=>clearTimeout(timeout);
 },[notice]);
 const dismiss=useCallback(()=>setNotice(null),[]);
 return {visible:notice!==null&&notice.revision===playbackRevision&&notice.revision===viewRevision&&notice.screen===screen,dismiss};
}
