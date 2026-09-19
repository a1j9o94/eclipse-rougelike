import {RESEARCH_DISCOUNTS,RESEARCH_TRACK_CAPACITY,type TechnologyTrack} from '../../shared/eclipse/technologies';
import {getMinorSpecies,type MinorSpeciesTile} from '../../shared/eclipse/minorSpecies';
import './researchDiscountTrack.css';

export default function ResearchDiscountTrack({track,count,minorSpecies=[]}:{track:TechnologyTrack;count:number;minorSpecies?:readonly MinorSpeciesTile[]}){
 const name=track[0].toUpperCase()+track.slice(1),full=count>=RESEARCH_TRACK_CAPACITY;
 const bonus=minorSpecies.reduce((sum,tile)=>{const effect=getMinorSpecies(tile.id).effect;return sum+(effect.kind==='research-discount'?effect.amount:0);},0);
 const discounts=RESEARCH_DISCOUNTS.map(discount=>discount+bonus);
 return <div className="dg-research-discounts" role="group" aria-label={`${name} research discounts`}>
  <p><strong>{full?'Track full · no research slots remaining':`Current discount: ${discounts[count]} science`}</strong></p>
  <ol aria-label="Science discount progression">{discounts.map((discount,index)=><li key={index} aria-current={!full&&count===index?'step':undefined} aria-label={`${index} researched: ${discount} science discount${!full&&count===index?', current':''}`} className={index<count?'is-used':undefined}><strong>{discount?`−${discount}`:'0'}</strong><small>{!full&&count===index?'Now':`${index+1}/7`}</small></li>)}</ol>
  {!full&&<p className="dg-discount-next">{count+1<RESEARCH_TRACK_CAPACITY?`After next research: ${discounts[count+1]} science discount`:'Next research fills this track'}</p>}
  {bonus>0&&<p className="dg-discount-next">Includes {bonus} Minor Species discount</p>}
 </div>;
}
