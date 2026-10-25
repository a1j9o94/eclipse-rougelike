import {createContext} from 'react';
import type {GameCommand,PlayerView} from '../../shared/eclipse/types';
/** A decision publishes preview data to the one shared galaxy; commands remain explicit. */
export interface DecisionMapPresentation {
 view:PlayerView;
 legalTargetIds:string[];
 targetLabel:string;
 showPrintedWormholes?:boolean;
 plannedColonies?:Extract<GameCommand,{type:'colonize'}>['placements'];
}
export interface DecisionMapControls {
 selectedSectorId:string|null;
 selectSector:(id:string)=>void;
 focusSector:(id:string)=>void;
 setPresentation:(presentation:DecisionMapPresentation|null)=>void;
}
export const DecisionMapContext=createContext<DecisionMapControls|null>(null);
