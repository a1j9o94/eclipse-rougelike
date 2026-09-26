import { useState } from 'react';
import { RESEARCH_TRACK_CAPACITY, TECHNOLOGIES, type TechnologyId, type TechnologyTrack } from '../../shared/eclipse/technologies';
import type { PlayerView, Seat } from '../../shared/eclipse/types';
import TechnologyStats from './TechnologyStats';
import AdvancedPopulationPreview from './AdvancedPopulationPreview';
import {ResearchDiscountSlot} from './ResearchDiscountTrack';
import {researchSlotDiscount} from './researchSlotDiscount';
import { describeTechnology } from './itemDescriptions';
import './researchedTechnologies.css';
export interface ResearchedTechnologiesProps {
  seat: Seat;
  view?: PlayerView;
  selectedId?: TechnologyId | null;
  onInspect?: (technologyId: TechnologyId) => void;
}
const TRACKS: readonly TechnologyTrack[] = ['military','grid','nano'];
/** Uses owned board placements, so rare tiles appear in the track where they were researched. */
export default function ResearchedTechnologies({seat,view,onInspect,selectedId}:ResearchedTechnologiesProps) {
  const [localSelected,setSelected] = useState<TechnologyId|null>(null);
  const selected = selectedId === undefined ? localSelected : selectedId;
  const count = TRACKS.reduce((sum,track)=>sum+seat.technologies[track].length,0);
  const detail = TECHNOLOGIES.find(technology=>technology.id===selected);
  return <section className="dg-owned-research">
    <details open>
      <summary><h2>Your researched technologies</h2><span>{count} researched · effects apply</span></summary>
      <div className="dg-owned-tracks">{TRACKS.map(track=> {
        const name=track[0].toUpperCase()+track.slice(1);
        const researched=seat.technologies[track].length;
        return <section key={track} role="group" aria-label={`${name} · ${seat.technologies[track].length} researched`}>
          <h3><span className="dg-research-track-heading">{name}<span className="dg-research-discount-label">{researched<RESEARCH_TRACK_CAPACITY?`Discount ${researchSlotDiscount(researched,seat.minorSpecies)}`:'Track full'}</span></span><span>{researched} / 7</span></h3>
          <div className="dg-owned-tiles" role="group" aria-label={`${name} technology slots`}>{seat.technologies[track].map(id=>{
            const technology=TECHNOLOGIES.find(candidate=>candidate.id===id);
            return technology ? <button className="dg-owned-tile" key={id} aria-label={`Inspect researched ${technology.name}`} aria-pressed={selected===id} onClick={()=>{setSelected(technology.id);onInspect?.(technology.id);}}><strong>{technology.name}</strong><TechnologyStats technology={technology}/>{view&&view.viewerSeatId===seat.id&&<AdvancedPopulationPreview view={view} technology={technology}/>}</button> : <p key={id}>Catalog entry unavailable: {id}</p>;
          })}{Array.from({length:Math.max(0,RESEARCH_TRACK_CAPACITY-researched)},(_,index)=><ResearchDiscountSlot className="dg-owned-slot" key={`empty-${index}`} index={researched+index} minorSpecies={seat.minorSpecies}/>)}</div>
        </section>;
      })}</div>
      <p className="dg-discount-explanation">Discounts reduce science costs on that track, never below a technology’s minimum price.</p>
      {!onInspect&&detail&&<div className="dg-owned-description"><strong>{detail.name}</strong><p>{describeTechnology(detail)}</p></div>}
    </details>
  </section>;
}
