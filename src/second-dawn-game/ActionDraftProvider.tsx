import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type SetStateAction } from 'react';
import type { GameCommand } from '../../shared/eclipse/types';
import { ActionDraftContext } from './actionDraftContext';
import { DRAFT_KEYS, emptyActionDrafts, isMeaningfulDraft, keysForCommand, readActionDrafts, setDraftValue, writeActionDrafts, type DraftKey, type DraftValues } from './actionDraftStorage';

export interface AcceptedDraftCommand { revision:number; type:GameCommand['type'] }
export interface SavedQueuedActionReceipt {commandId:string;type:GameCommand['type']}
interface Props { matchId?:string; viewerSeatId:string; revision:number; lastAcceptedCommand?:AcceptedDraftCommand; lastQueuedCommand?:SavedQueuedActionReceipt; children:ReactNode }
export function ActionDraftProvider(props:Props) {
  return <PartitionProvider key={`${props.matchId??'preview'}:${props.viewerSeatId}`} {...props}/>;
}
function PartitionProvider({matchId,viewerSeatId,revision,lastAcceptedCommand,lastQueuedCommand,children}:Props) {
  const partition=useMemo(()=>({matchId:matchId??'preview',viewerSeatId}),[matchId,viewerSeatId]);
  const [snapshot,setSnapshot]=useState(()=>{
    try{return matchId?readActionDrafts(localStorage,partition):emptyActionDrafts(partition);}catch{return emptyActionDrafts(partition);}
  });
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
    setSnapshot(previous=>{
      const entry=previous.values[key];
      const current=entry?entry.value as DraftValues[K]:initial;
      const next=typeof value==='function'?(value as (state:DraftValues[K])=>DraftValues[K])(current):value;
      return setDraftValue(previous,key,next,revision);
    });
  },[revision]);
  const clear=useCallback((keys?:readonly DraftKey[])=>setSnapshot(previous=>{
    const values={...previous.values};for(const key of keys??DRAFT_KEYS.filter(key=>isMeaningfulDraft(key,values)))delete values[key];return {...previous,values};
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
    setSnapshot(previous=>{
      const values={...previous.values};
      for(const key of DRAFT_KEYS)if(pending.values[key]&&JSON.stringify(values[key])===pending.values[key])delete values[key];
      return {...previous,values};
    });
  },[lastAcceptedCommand]);
  useEffect(()=>{
    const pending=submitted.current;
    if(!pending||pending.receiptKind!=='queued'||!lastQueuedCommand||lastQueuedCommand.commandId===pending.queuedBefore?.commandId||lastQueuedCommand.type!==pending.type)return;
    submitted.current=null;
    setSnapshot(previous=>{
      const values={...previous.values};
      for(const key of DRAFT_KEYS)if(pending.values[key]&&JSON.stringify(values[key])===pending.values[key])delete values[key];
      return {...previous,values};
    });
  },[lastQueuedCommand]);
  const context=useMemo(()=>({entries:snapshot.values,setValue,stale,draftKeys,clear,markSubmitted,storageAvailable}),[snapshot.values,setValue,stale,draftKeys,clear,markSubmitted,storageAvailable]);
  return <ActionDraftContext.Provider value={context}>{children}</ActionDraftContext.Provider>;
}
