import {useEffect,useRef} from 'react';
import type {GameCommand,PlayerView} from '../../shared/eclipse/types';
/** Old saves may still contain a reputation choice; settle it through the normal command path. */
export function useAutomaticReputation(view:PlayerView,connected:boolean,busy:boolean,submit:(command:GameCommand)=>void):void{
 const submitRef=useRef(submit);submitRef.current=submit;
 const attempted=useRef<string|null>(null);
 const decisionId=view.pendingDecision?.kind==='reputation'?view.pendingDecision.id:null;
 const key=decisionId?`${decisionId}:${view.revision}`:null;
 useEffect(()=>{
  if(!connected||!key){attempted.current=null;return;}
  if(busy||attempted.current===key||!decisionId)return;
  attempted.current=key;
  submitRef.current({type:'resolve',decisionId,choice:{kind:'reputation'}});
 },[key,decisionId,connected,busy]);
}
