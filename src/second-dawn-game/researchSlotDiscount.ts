import {RESEARCH_DISCOUNTS} from '../../shared/eclipse/technologies';
import {getMinorSpecies,type MinorSpeciesTile} from '../../shared/eclipse/minorSpecies';

/** The value printed in an unoccupied technology space is the discount for the next purchase. */
export function researchSlotDiscount(index:number,minorSpecies:readonly MinorSpeciesTile[]=[]):number {
 const bonus=minorSpecies.reduce((sum,tile)=>{const effect=getMinorSpecies(tile.id).effect;return sum+(effect.kind==='research-discount'?effect.amount:0);},0);
 return RESEARCH_DISCOUNTS[index]+bonus;
}
