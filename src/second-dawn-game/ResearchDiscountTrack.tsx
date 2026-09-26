import type {MinorSpeciesTile} from '../../shared/eclipse/minorSpecies';
import {researchTrackVp} from '../../shared/eclipse/scoring';
import {researchSlotDiscount} from './researchSlotDiscount';
import './researchDiscountTrack.css';

export function ResearchSlotMarkers({index,minorSpecies=[]}:{index:number;minorSpecies?:readonly MinorSpeciesTile[]}){
 const discount=researchSlotDiscount(index,minorSpecies),vp=researchTrackVp(index+1);
 return <span className="dg-research-slot-markers"><span className="dg-research-slot-discount"><strong>{discount?`−${discount}`:'0'}</strong><small>science</small></span><span className="dg-research-slot-vp" title={`Track scores ${vp} VP with ${index+1} technologies`}><strong>{vp} VP</strong><small>track total</small></span></span>;
}

export function ResearchDiscountSlot({index,minorSpecies=[],className}:{index:number;minorSpecies?:readonly MinorSpeciesTile[];className:string}){
 const discount=researchSlotDiscount(index,minorSpecies),vp=researchTrackVp(index+1);
 return <span className={`${className} dg-discount-slot`} aria-label={`Empty technology slot ${index+1}: ${discount?`−${discount}`:'0'} science discount, ${vp} VP track total`}><ResearchSlotMarkers index={index} minorSpecies={minorSpecies}/></span>;
}
