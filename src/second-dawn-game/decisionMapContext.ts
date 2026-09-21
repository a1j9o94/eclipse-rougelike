import {createContext} from 'react';
import type {PlayerView} from '../../shared/eclipse/types';
/** A decision publishes preview data to the one shared galaxy; commands remain explicit. */
export interface DecisionMapPresentation {
 view:PlayerView;
 legalTargetIds:string[];
 targetLabel:string;
 showPrintedWormholes?:boolean;
}
export interface DecisionMapControls {
 selectedSectorId:string|null;
 selectSector:(id:string)=>void;
 focusSector:(id:string)=>void;
 setPresentation:(presentation:DecisionMapPresentation|null)=>void;
}
export const DecisionMapContext=createContext<DecisionMapControls|null>(null);
