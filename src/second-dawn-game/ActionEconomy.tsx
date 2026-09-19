import FactionActionBenefit from './FactionActionBenefit';
import type {GameCommand,PlayerView} from '../../shared/eclipse/types';
import type {CommandPreview} from '../../shared/eclipse/commandPreview';
import {affordableActionCapacity,upkeepForecast,upkeepForecastAfter} from './upkeepForecast';
import {PlanetIcon} from './SectorPlanets';
export default function ActionEconomy({view,action,preview}:{view:PlayerView;action:GameCommand['type'];preview:CommandPreview|null}){
 const own=view.seats.find(s=>s.id===view.viewerSeatId)!;const base=upkeepForecast(view);
 const reactionsOnly=view.phase==='action'&&own.passed&&!own.eliminated;
 const reaction=reactionsOnly&&['upgrade','build','move'].includes(action);
 const ongoing=view.actionProgress?.owner===own.id&&view.actionProgress.action===action;
 const consumesDisc=['explore','influence','research','upgrade','build','move'].includes(action)&&!ongoing;
 const bill=preview?.upkeepAfter??(consumesDisc?base.nextUpkeep:base.upkeep);
 const income=preview?.moneyIncomeAfter??base.income,money=preview?.resourcesAfter.money??base.money;
 const balance=bill===null?null:money+income-bill;
 const projected=preview?upkeepForecastAfter({money,income,influenceDiscs:preview.influenceAfter,passed:own.passed,eliminated:own.eliminated}):base;
 const capacity=affordableActionCapacity(projected);
 const forecastLead=preview?'After this':'Current forecast';
 const capacityLabel=capacity.status==='affordable'?`${forecastLead}: ${capacity.actions} affordable ${capacity.actions===1?'action':'actions'}`:capacity.status==='unfunded'?`${forecastLead}: ${capacity.shortfall} money short at round end`:capacity.status==='no-discs'?`${forecastLead}: no discs for another ordinary action`:capacity.status==='passed'?(reactionsOnly?'Reactions only · Upgrade, Build or Move':'Passed · no ordinary actions remain'):'Eliminated · no ordinary actions remain';
 const upkeepLabel=bill===null?'No influence discs remain.':preview||!consumesDisc?`Round-end upkeep: ${base.upkeep} → ${bill} money`:<><span>If started: </span><span>Round-end upkeep: {base.upkeep} → {bill} money</span></>;
 return <section className="dg-action-economy" aria-label="Action cost preview"><strong>{reaction?(ongoing?'Continue this reaction · no extra disc':'New reaction · 1 activation · 1 influence disc'):consumesDisc?'New action · 1 influence disc':ongoing?'Continue this action · no extra disc':'No action disc needed'}</strong>{reaction&&<p>Resource costs, available pieces and blueprint slots still apply.</p>}<p>{upkeepLabel}</p>{balance!==null&&<p className={balance<0?'dg-danger':''}>{money} money + {income} income − {bill} upkeep = <b>{balance<0?`${-balance} short`:`${balance} left`}</b></p>}<p className={capacity.status==='unfunded'?'dg-danger':''}>{capacityLabel}{preview?.populationChoiceMayChangeIncome?' · conditional on population choice':''}</p>{preview&&(['money','science','materials'] as const).filter(r=>preview.resourcesAfter[r]!==own.resources[r]).map(r=><p className="dg-action-resourcecost" key={r}><svg viewBox="0 0 20 20" aria-hidden="true"><PlanetIcon resource={r}/></svg>{r}: {own.resources[r]} → {preview.resourcesAfter[r]} now</p>)}{preview?.populationChoiceMayChangeIncome&&<p>Population return choices may change this income.</p>}{!reaction&&<FactionActionBenefit factionId={own.faction} action={action}/>}</section>;
}
