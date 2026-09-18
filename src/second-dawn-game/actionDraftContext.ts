import { createContext, useCallback, useContext, useState, type Dispatch, type SetStateAction } from 'react';
import type { GameCommand } from '../../shared/eclipse/types';
import type { DraftEntries, DraftKey, DraftValues } from './actionDraftStorage';

export interface ActionDraftGuard {
  stale: boolean;
  draftKeys: readonly DraftKey[];
  review: () => void;
  clear: (keys?: readonly DraftKey[]) => void;
  markSubmitted: (command: GameCommand) => void;
  storageAvailable: boolean;
}
export interface ActionDraftContextValue extends ActionDraftGuard {
  entries: DraftEntries;
  setValue: <K extends DraftKey>(key: K, value: SetStateAction<DraftValues[K]>, initial: DraftValues[K]) => void;
}
const fallback:ActionDraftContextValue={entries:{},stale:false,draftKeys:[],review:()=>{},clear:()=>{},markSubmitted:()=>{},storageAvailable:true,setValue:()=>{}};
export const ActionDraftContext=createContext<ActionDraftContextValue|null>(null);
export function useActionDraftGuard(): ActionDraftGuard { return useContext(ActionDraftContext)??fallback; }
/** The same component works standalone; pending decisions explicitly opt out of browser storage. */
export function useActionDraftState<K extends DraftKey>(key:K,initial:DraftValues[K]|(()=>DraftValues[K]),options?:{enabled?:boolean}):[DraftValues[K],Dispatch<SetStateAction<DraftValues[K]>>] {
  const context=useContext(ActionDraftContext);
  const [local,setLocal]=useState(initial);
  const active=options?.enabled!==false?context:null;
  const activeSetValue=active?.setValue;
  const entry=active?.entries[key];
  const value=entry?entry.value as DraftValues[K]:local;
  const setValue=useCallback<Dispatch<SetStateAction<DraftValues[K]>>>(next=>{
    if(activeSetValue)activeSetValue(key,next,local);else setLocal(next);
  },[activeSetValue,key,local]);
  return [value,setValue];
}
