/** Public map changes presented during a computer turn; no hidden engine state. */
export interface GalaxyActivity {
 affectedSectorIds:string[];
 moves:{from:string;to:string}[];
}
