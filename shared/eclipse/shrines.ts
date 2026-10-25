import type {Resource} from './types';
/** Printed Lyra Shrine board costs, shared by rules, legal choices and previews. */
export const SHRINE_COSTS:Readonly<Record<Resource,readonly [number,number,number]>>={science:[2,3,4],money:[3,4,5],materials:[4,5,6]};
