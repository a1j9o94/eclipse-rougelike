import type {MinorSpeciesTile} from '../../shared/eclipse/minorSpecies';
import {researchSlotDiscount} from './researchSlotDiscount';
import './researchDiscountTrack.css';

export function ResearchDiscountSlot({index,minorSpecies=[],className}:{index:number;minorSpecies?:readonly MinorSpeciesTile[];className:string}){
 const discount=researchSlotDiscount(index,minorSpecies);
 return <span className={`${className} dg-discount-slot`} aria-label={`Empty technology slot ${index+1}: ${discount?`−${discount}`:'0'} science discount`}><strong>{discount?`−${discount}`:'0'}</strong></span>;
}
