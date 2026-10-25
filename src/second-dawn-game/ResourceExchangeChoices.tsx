import type {Resource,Resources} from '../../shared/eclipse/types';
import {useState} from 'react';
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
 const [inspected,setInspected]=useState<Resource|null>(null);
 return <fieldset><legend>{label}</legend><div className="dg-trade-choices">{resources.map(resource=>{const blocked=!!available&&!available(resource);return <button key={resource} type="button" aria-label={`${label} ${resource}`} aria-pressed={selected===resource} aria-disabled={blocked||undefined} disabled={disabled} onClick={()=>{if(blocked){setInspected(resource);return;}setInspected(null);onSelect(resource);}}><TradeResourceIcon resource={resource}/><span>{resource[0].toUpperCase()+resource.slice(1)}</span>{balances&&<small>{balances[resource]} held</small>}{selected===resource&&<small aria-hidden="true">✓</small>}{blocked&&<small aria-hidden="true">Unavailable</small>}</button>;})}</div>{inspected&&available&&!available(inspected)&&<p className="dg-resource-blocker" role="status">{inspected[0].toUpperCase()+inspected.slice(1)} is unavailable for this exchange.</p>}</fieldset>;
}
