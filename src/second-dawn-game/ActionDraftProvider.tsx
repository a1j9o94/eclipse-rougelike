import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type SetStateAction } from 'react';
import type { GameCommand } from '../../shared/eclipse/types';
import { ActionDraftContext } from './actionDraftContext';
import { DRAFT_KEYS, emptyActionDrafts, isMeaningfulDraft, keysForCommand, readActionDrafts, setDraftValue, writeActionDrafts, type DraftKey, type DraftValues } from './actionDraftStorage';

export interface AcceptedDraftCommand { revision:number; type:GameCommand['type'] }
interface Props { matchId?:string; viewerSeatId:string; revision:number; lastAcceptedCommand?:AcceptedDraftCommand; children:ReactNode }
export function ActionDraftProvider(props:Props) {
  return <PartitionProvider key={`${props.matchId??'preview'}:${props.viewerSeatId}`} {...props}/>;
}
function PartitionProvider({matchId,viewerSeatId,revision,lastAcceptedCommand,children}:Props) {
  const partition=useMemo(()=>({matchId:matchId??'preview',viewerSeatId}),[matchId,viewerSeatId]);
  const [snapshot,setSnapshot]=useState(()=>{
    try{return matchId?readActionDrafts(localStorage,partition):emptyActionDrafts(partition);}catch{return emptyActionDrafts(partition);}
  });
  const [storageAvailable,setStorageAvailable]=useState(true);
  const submitted=useRef<{type:GameCommand['type'];acceptedBefore:AcceptedDraftCommand|undefined;values:Partial<Record<DraftKey,string>>}|null>(null);
  const acceptedRef=useRef(lastAcceptedCommand);acceptedRef.current=lastAcceptedCommand;
  const snapshotRef=useRef(snapshot);snapshotRef.current=snapshot;
  const stale=DRAFT_KEYS.some(key=>isMeaningfulDraft(key,snapshot.values)&&snapshot.values[key]!.revision!==revision);
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
  const review=useCallback(()=>setSnapshot(previous=>{
    const values={...previous.values};
    for(const key of DRAFT_KEYS){const entry=values[key];if(entry&&isMeaningfulDraft(key,values))Object.assign(values,{[key]:{...entry,revision}});}
    return {...previous,values};
  }),[revision]);
  const clear=useCallback((keys?:readonly DraftKey[])=>setSnapshot(previous=>{
    const values={...previous.values};for(const key of keys??DRAFT_KEYS.filter(key=>isMeaningfulDraft(key,values)))delete values[key];return {...previous,values};
  }),[]);
  const markSubmitted=useCallback((command:GameCommand)=>{
    const current=snapshotRef.current;const values:Partial<Record<DraftKey,string>>={};
    for(const key of keysForCommand(command)){
      const entry=current.values[key];
      if(key==='commandDraft'&&JSON.stringify(current.values.commandDraft?.value?.command)!==JSON.stringify(command))continue;
      if(entry)values[key]=JSON.stringify(entry);
    }
    submitted.current={type:command.type,acceptedBefore:acceptedRef.current,values};
  },[]);
  useEffect(()=>{
    const pending=submitted.current;
    // A duplicate receipt may precede the current board revision after a lost
    // response. Only the parent's fresh successful receipt object acknowledges it.
    if(!pending||!lastAcceptedCommand||lastAcceptedCommand===pending.acceptedBefore||lastAcceptedCommand.type!==pending.type)return;
    submitted.current=null;
    setSnapshot(previous=>{
      const values={...previous.values};
      for(const key of DRAFT_KEYS)if(pending.values[key]&&JSON.stringify(values[key])===pending.values[key])delete values[key];
      return {...previous,values};
    });
  },[lastAcceptedCommand]);
  const context=useMemo(()=>({entries:snapshot.values,setValue,stale,draftKeys,review,clear,markSubmitted,storageAvailable}),[snapshot.values,setValue,stale,draftKeys,review,clear,markSubmitted,storageAvailable]);
  return <ActionDraftContext.Provider value={context}>{children}</ActionDraftContext.Provider>;
}
