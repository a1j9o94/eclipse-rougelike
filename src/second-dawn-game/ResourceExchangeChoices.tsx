import type {Resource,Resources} from '../../shared/eclipse/types';
import TradeResourceIcon from './TradeResourceIcon';
const resources:readonly Resource[]=['money','science','materials'];
interface Props {
 label:string;
 selected:Resource;
 onSelect:(resource:Resource)=>void;
 disabled:boolean;
 available?:(resource:Resource)=>boolean;
 balances?:Resources;
}
/** Bank conversion and posted Guild offers use the same resource choice vocabulary. */
export default function ResourceExchangeChoices({label,selected,onSelect,disabled,available,balances}:Props){
 return <fieldset><legend>{label}</legend><div className="dg-trade-choices">{resources.map(resource=><button key={resource} type="button" aria-label={`${label} ${resource}`} aria-pressed={selected===resource} disabled={disabled||!!available&&!available(resource)} onClick={()=>onSelect(resource)}><TradeResourceIcon resource={resource}/><span>{resource[0].toUpperCase()+resource.slice(1)}</span>{balances&&<small>{balances[resource]} held</small>}{selected===resource&&<small aria-hidden="true">✓</small>}</button>)}</div></fieldset>;
}
