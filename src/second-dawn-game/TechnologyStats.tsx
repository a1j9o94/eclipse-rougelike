import type { Technology } from '../../shared/eclipse/technologies';
import { describeTechnology } from './itemDescriptions';
import ShipPartStats, { StatBadge, type StatBadgeProps } from './ShipPartStats';

/** Icon-first catalog presentation; selection reveals the full rule explanation. */
export default function TechnologyStats({ technology }: { technology: Technology }) {
 const effect=technology.effect;
 if(effect.kind==='ship-part') return <ShipPartStats partId={effect.part}/>;
 const explanation=describeTechnology(technology);
 const badge=(props:Omit<StatBadgeProps,'explanation'>)=><StatBadge {...props} explanation={explanation}/>;
 switch(effect.kind){
 case 'construct': return <div className="dg-part-stats">{badge({icon:'structure',value:effect.piece==='monolith'?'3 VP':'+',label:effect.piece})}{effect.piece==='orbital'&&badge({icon:'population',value:'+1',label:'money / science'})}</div>;
 case 'colonize-advanced': return <div className="dg-part-stats">{badge({icon:'population',value:'+',label:`advanced ${effect.resource==='all'?'planets':effect.resource}`})}</div>;
 case 'automatic-population-bombardment': return <div className="dg-part-stats">{badge({icon:'cannon',value:'ALL',label:'enemy population'})}</div>;
 case 'extra-activation': return <div className="dg-part-stats">{badge({icon:effect.action==='move'?'drive':effect.action==='build'?'structure':'hull',value:`+${effect.amount}`,label:effect.action})}</div>;
 case 'gain-influence': return <div className="dg-part-stats">{badge({icon:'influence',value:`+${effect.amount}`,label:'influence'})}</div>;
 case 'wormhole-generator': return <div className="dg-part-stats">{badge({icon:'portal',value:'1',label:'opening needed'})}</div>;
 case 'artifact-resources': return <div className="dg-part-stats">{badge({icon:'discovery',value:'+5',label:'per artifact'})}</div>;
 case 'split-antimatter-damage': return <div className="dg-part-stats">{badge({icon:'cannon',value:'4 →',label:'split damage'})}</div>;
 case 'ignore-neutron-bombs': return <div className="dg-part-stats">{badge({icon:'shield',value:'✓',label:'population'})}</div>;
 case 'cloaking': return <div className="dg-part-stats">{badge({icon:'drive',value:'2:1',label:'ships to pin'})}</div>;
 case 'place-warp-portal': return <div className="dg-part-stats">{badge({icon:'portal',value:'+1',label:'warp portal'})}{badge({icon:'discovery',value:'+1',label:'sector VP'})}</div>;
 case 'draw-discovery': return <div className="dg-part-stats">{badge({icon:'discovery',value:'+1',label:'discovery'})}</div>;
 }
}
