import {createContext} from 'react';
import type {TargetProjection} from './combatAllocationPreview';
export interface BattlefieldAllocation {
 decisionId:string;
 targets:(TargetProjection&{label:string;hit:boolean|undefined;explanation:string})[];
 onTarget:(targetId:string)=>void;
 onClear:(targetId:string)=>void;
}
/** Ephemeral presentation only: decision ownership and saved dice remain authoritative. */
export const BattlefieldContext=createContext<{setAllocation:(allocation:BattlefieldAllocation|null)=>void}|null>(null);
