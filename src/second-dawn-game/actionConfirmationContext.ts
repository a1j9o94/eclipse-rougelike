import {createContext} from 'react';
/** Session-only acknowledgments survive workspace navigation; no game or draft data changes. */
export const ActionConfirmationContext=createContext<{key?:string;acknowledged:Set<string>;suppressed:boolean}|null>(null);
