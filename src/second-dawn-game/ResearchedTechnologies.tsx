import { useState } from 'react';
import { TECHNOLOGIES, type TechnologyId, type TechnologyTrack } from '../../shared/eclipse/technologies';
import type { PlayerView, Seat } from '../../shared/eclipse/types';
import TechnologyStats from './TechnologyStats';
import AdvancedPopulationPreview from './AdvancedPopulationPreview';
import ResearchDiscountTrack from './ResearchDiscountTrack';
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
        return <section key={track} role="group" aria-label={`${name} · ${seat.technologies[track].length} researched`}>
          <h3>{name}<span>{seat.technologies[track].length} / 7</span></h3>
          <div className="dg-owned-tiles" role="group" aria-label={`${name} technology slots`}><ResearchDiscountTrack track={track} count={seat.technologies[track].length} minorSpecies={seat.minorSpecies}/>{seat.technologies[track].map(id=>{
            const technology=TECHNOLOGIES.find(candidate=>candidate.id===id);
            return technology ? <button className="dg-owned-tile" key={id} aria-label={`Inspect researched ${technology.name}`} aria-pressed={selected===id} onClick={()=>{setSelected(technology.id);onInspect?.(technology.id);}}><strong>{technology.name}</strong><TechnologyStats technology={technology}/>{view&&view.viewerSeatId===seat.id&&<AdvancedPopulationPreview view={view} technology={technology}/>}</button> : <p key={id}>Catalog entry unavailable: {id}</p>;
          })}{Array.from({length:Math.max(0,7-seat.technologies[track].length)},(_,index)=><span className="dg-owned-slot" key={`empty-${index}`} aria-label={`Empty technology slot ${seat.technologies[track].length+index+1}`}><small>Slot {seat.technologies[track].length+index+1} / 7</small>Empty technology slot</span>)}</div>
        </section>;
      })}</div>
      <p className="dg-discount-explanation">Discounts reduce science costs on that track, never below a technology’s minimum price.</p>
      {!onInspect&&detail&&<div className="dg-owned-description"><strong>{detail.name}</strong><p>{describeTechnology(detail)}</p></div>}
    </details>
  </section>;
}
