import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type SetStateAction } from 'react';
import type { GameCommand } from '../../shared/eclipse/types';
import { ActionDraftContext } from './actionDraftContext';
import { DRAFT_KEYS, emptyActionDrafts, isMeaningfulDraft, keysForCommand, readActionDrafts, setDraftValue, writeActionDrafts, type DraftEntries, type DraftSnapshot, type DraftKey, type DraftValues } from './actionDraftStorage';

export interface AcceptedDraftCommand { revision:number; type:GameCommand['type'] }
export interface SavedQueuedActionReceipt {commandId:string;type:GameCommand['type']}
interface Props { matchId?:string; viewerSeatId:string; revision:number; lastAcceptedCommand?:AcceptedDraftCommand; lastQueuedCommand?:SavedQueuedActionReceipt; children:ReactNode }
export function ActionDraftProvider(props:Props) {
  return <PartitionProvider key={`${props.matchId??'preview'}:${props.viewerSeatId}`} {...props}/>;
}
function PartitionProvider({matchId,viewerSeatId,revision,lastAcceptedCommand,lastQueuedCommand,children}:Props) {
  const partition=useMemo(()=>({matchId:matchId??'preview',viewerSeatId}),[matchId,viewerSeatId]);
  const [draftState,setDraftState]=useState<{snapshot:DraftSnapshot;undo:{keys:readonly DraftKey[];values:DraftEntries}[]}>(()=>{
    let snapshot=emptyActionDrafts(partition);
    try{if(matchId)snapshot=readActionDrafts(localStorage,partition);}catch{/* In-memory editing remains available. */}
    return {snapshot,undo:[]};
  });
  const snapshot=draftState.snapshot;
  const canUndo=draftState.undo.length>0;
  const [storageAvailable,setStorageAvailable]=useState(true);
  const submitted=useRef<{type:GameCommand['type'];receiptKind:'accepted'|'queued';acceptedBefore:AcceptedDraftCommand|undefined;queuedBefore:SavedQueuedActionReceipt|undefined;values:Partial<Record<DraftKey,string>>}|null>(null);
  const acceptedRef=useRef(lastAcceptedCommand);acceptedRef.current=lastAcceptedCommand;
  const queuedRef=useRef(lastQueuedCommand);queuedRef.current=lastQueuedCommand;
  const snapshotRef=useRef(snapshot);snapshotRef.current=snapshot;
  // Saved choices are always revalidated by their planner and the server.
  // A newer revision must never add an acknowledgement before ordinary play.
  const stale=false;
  const draftKeys=useMemo(()=>DRAFT_KEYS.filter(key=>isMeaningfulDraft(key,snapshot.values)),[snapshot.values]);
  useEffect(()=>{
    if(!matchId)return;
    try{setStorageAvailable(writeActionDrafts(localStorage,snapshot));}catch{setStorageAvailable(false);}
  },[matchId,snapshot]);
  const setValue=useCallback(<K extends DraftKey>(key:K,value:SetStateAction<DraftValues[K]>,initial:DraftValues[K])=>{
    setDraftState(state=>{
      const previous=state.snapshot;
      const entry=previous.values[key];
      const current=entry?entry.value as DraftValues[K]:initial;
      const next=typeof value==='function'?(value as (state:DraftValues[K])=>DraftValues[K])(current):value;
      const updated=setDraftValue(previous,key,next,revision);
      if(updated!==previous&&(isMeaningfulDraft(key,previous.values)||isMeaningfulDraft(key,updated.values))){
        return {snapshot:updated,undo:[...state.undo.slice(-29),{keys:[key],values:previous.values}]};
      }
      return {...state,snapshot:updated};
    });
  },[revision]);
  const clear=useCallback((keys?:readonly DraftKey[])=>setDraftState(state=>{
    const previous=state.snapshot,values={...previous.values};
    const cleared=keys??DRAFT_KEYS.filter(key=>isMeaningfulDraft(key,values));
    for(const key of cleared)delete values[key];
    return {snapshot:{...previous,values},undo:[...state.undo.slice(-29),{keys:cleared,values:previous.values}]};
  }),[]);
  const canUndoFor=useCallback((keys:readonly DraftKey[])=>draftState.undo.some(entry=>entry.keys.some(key=>keys.includes(key))),[draftState.undo]);
  const undo=useCallback((keys?:readonly DraftKey[])=>setDraftState(state=>{
    let index=state.undo.length-1;
    while(index>=0&&keys&&!state.undo[index].keys.some(key=>keys.includes(key)))index--;
    if(index<0)return state;
    const entry=state.undo[index],values={...state.snapshot.values};
    const restored=entry.keys.filter(key=>!keys||keys.includes(key));
    for(const key of restored){delete values[key];if(entry.values[key])Object.assign(values,{[key]:entry.values[key]});}
    const remaining=entry.keys.filter(key=>!restored.includes(key));
    const history=state.undo.flatMap((item,i)=>i!==index?[item]:remaining.length?[{...item,keys:remaining}]:[]);
    return {snapshot:{...state.snapshot,values},undo:history};
  }),[]);
  const markSubmitted=useCallback((command:GameCommand,receiptKind:'accepted'|'queued'='accepted')=>{
    const current=snapshotRef.current;const values:Partial<Record<DraftKey,string>>={};
    for(const key of keysForCommand(command)){
      const entry=current.values[key];
      if(key==='commandDraft'&&JSON.stringify(current.values.commandDraft?.value?.command)!==JSON.stringify(command))continue;
      if(entry)values[key]=JSON.stringify(entry);
    }
    submitted.current={type:command.type,receiptKind,acceptedBefore:acceptedRef.current,queuedBefore:queuedRef.current,values};
  },[]);
  useEffect(()=>{
    const pending=submitted.current;
    // A duplicate receipt may precede the current board revision after a lost
    // response. Only the parent's fresh successful receipt object acknowledges it.
    if(!pending||pending.receiptKind!=='accepted'||!lastAcceptedCommand||lastAcceptedCommand===pending.acceptedBefore||lastAcceptedCommand.type!==pending.type)return;
    submitted.current=null;
    setDraftState(state=>{
      const previous=state.snapshot;
      const values={...previous.values};
      for(const key of DRAFT_KEYS)if(pending.values[key]&&JSON.stringify(values[key])===pending.values[key])delete values[key];
      return {snapshot:{...previous,values},undo:[]};
    });
  },[lastAcceptedCommand]);
  useEffect(()=>{
    const pending=submitted.current;
    if(!pending||pending.receiptKind!=='queued'||!lastQueuedCommand||lastQueuedCommand.commandId===pending.queuedBefore?.commandId||lastQueuedCommand.type!==pending.type)return;
    submitted.current=null;
    setDraftState(state=>{
      const previous=state.snapshot;
      const values={...previous.values};
      for(const key of DRAFT_KEYS)if(pending.values[key]&&JSON.stringify(values[key])===pending.values[key])delete values[key];
      return {snapshot:{...previous,values},undo:[]};
    });
  },[lastQueuedCommand]);
  const context=useMemo(()=>({entries:snapshot.values,setValue,stale,draftKeys,clear,markSubmitted,storageAvailable,canUndo,canUndoFor,undo}),[snapshot.values,setValue,stale,draftKeys,clear,markSubmitted,storageAvailable,canUndo,canUndoFor,undo]);
  return <ActionDraftContext.Provider value={context}>{children}</ActionDraftContext.Provider>;
}
