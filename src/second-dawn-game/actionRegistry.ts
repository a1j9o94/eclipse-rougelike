import type {GameCommand} from '../../shared/eclipse/types';
export type ActionEntryType=Extract<GameCommand['type'],'explore'|'influence'|'research'|'upgrade'|'build'|'move'|'colonize'|'trade'|'offer-diplomacy'|'buy-minor-species'>;
export interface ActionEntry {type:ActionEntryType;label:string;group:'ordinary'|'other';cue:string}
export const ACTION_ENTRIES:readonly ActionEntry[]=[
 {type:'explore',label:'Explore',group:'ordinary',cue:'Discover a sector'},
 {type:'influence',label:'Influence',group:'ordinary',cue:'Control territory'},
 {type:'research',label:'Research',group:'ordinary',cue:'Gain a capability'},
 {type:'upgrade',label:'Upgrade',group:'ordinary',cue:'Fit your ships'},
 {type:'build',label:'Build',group:'ordinary',cue:'Place new pieces'},
 {type:'move',label:'Move',group:'ordinary',cue:'Plan a route'},
 {type:'colonize',label:'Colonize',group:'other',cue:'Populate planets'},
 {type:'trade',label:'Trade',group:'other',cue:'Exchange resources'},
 {type:'offer-diplomacy',label:'Diplomacy',group:'other',cue:'Exchange ambassadors'},
 {type:'buy-minor-species',label:'Recruit allies',group:'other',cue:'Gain an ally'},
];
