import type {Coordinate,PlayerView,SectorDrawOdds} from '../../shared/eclipse/types';
import {TradeResourceIcon} from './TradePanel';
import {NeutralShipSilhouette} from './BattleOverview';
import SectorFeatureIcon from './SectorFeatureIcon';
import './exploreOdds.css';

const features=[['science','Science'],['money','Money'],['materials','Materials'],['ancients','Ancients'],['artifacts','Artifact']] as const;
function FeatureIcon({feature}:{feature:typeof features[number][0]}){
 if(feature==='science'||feature==='money'||feature==='materials')return <TradeResourceIcon resource={feature}/>;
 if(feature==='ancients')return <NeutralShipSilhouette type="ancient"/>;
 return <SectorFeatureIcon kind="artifact"/>;
}

export default function ExploreOdds({view,position}:{view:PlayerView;position:Coordinate}){
 const distance=Math.max(Math.abs(position.q),Math.abs(position.r),Math.abs(position.q+position.r));
 const ring=distance===1?'inner':distance===2?'middle':'outer';
 const ringMark={inner:'I',middle:'II',outer:'III'}[ring];
 const odds:SectorDrawOdds|undefined=view.sectorDrawOdds?.[ring];
 return <section className="dg-explore-odds" role="group" aria-label={`Ring ${ringMark} next sector odds`}>
  <strong>Ring {ringMark} · next sector</strong>
  {!odds?<p>Feature odds unavailable for this game.</p>:odds.source==='exhausted'?<p>No sector tiles remain in this ring.</p>:<>
   <div className="dg-explore-odds-features">{features.map(([key,label])=>{const chance=Math.round(100*odds[key]/odds.total);return <span role="group" aria-label={`${label}: ${chance}%`} title={`${label}: ${chance}%`} key={key}><span aria-hidden="true" className="dg-explore-odds-icon"><FeatureIcon feature={key}/></span><b aria-hidden="true">{chance}%</b></span>;})}</div>
   <small>Chance this tile has each feature. Gray planets count for all three resources, and percentages can overlap.{odds.source==='reshuffle'?' Discards reshuffle before the next draw.':''}</small>
  </>}
 </section>;
}
