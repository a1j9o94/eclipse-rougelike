import {createContext, useContext} from 'react';

/** The visible commit always describes whether it submits now or saves a turn plan. */
export const CommitContext=createContext(false);
export function useCommitLabel() {
 const queued=useContext(CommitContext);
 return (label:string)=>queued?`Queue for my turn · ${label}`:label;
}
