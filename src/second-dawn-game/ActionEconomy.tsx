import type {GameCommand,PlayerView} from '../../shared/eclipse/types';
import type {CommandPreview} from '../../shared/eclipse/commandPreview';
import {upkeepForecast} from './upkeepForecast';
import {PlanetIcon} from './SectorPlanets';
export default function ActionEconomy({view,action,preview}:{view:PlayerView;action:GameCommand['type'];preview:CommandPreview|null}){
 const own=view.seats.find(s=>s.id===view.viewerSeatId)!;const base=upkeepForecast(view);
 const ongoing=view.actionProgress?.owner===own.id&&view.actionProgress.action===action;
 const consumesDisc=['explore','influence','research','upgrade','build','move'].includes(action)&&!ongoing;
 const bill=preview?.upkeepAfter??(consumesDisc?base.nextUpkeep:base.upkeep);
 const income=preview?.moneyIncomeAfter??base.income,money=preview?.resourcesAfter.money??base.money;
 const balance=bill===null?null:money+income-bill;
 return <section className="dg-action-economy" aria-label="Action cost preview"><strong>{consumesDisc?'New action · 1 influence disc':ongoing?'Continue this action · no extra disc':'No action disc needed'}</strong><p>{bill===null?'No influence discs remain.':`Round-end upkeep: ${base.upkeep} → ${bill} money`}</p>{balance!==null&&<p className={balance<0?'dg-danger':''}>{money} money + {income} income − {bill} upkeep = <b>{balance<0?`${-balance} short`:`${balance} left`}</b></p>}{preview&&(['money','science','materials'] as const).filter(r=>preview.resourcesAfter[r]!==own.resources[r]).map(r=><p className="dg-action-resourcecost" key={r}><svg viewBox="0 0 20 20" aria-hidden="true"><PlanetIcon resource={r}/></svg>{r}: {own.resources[r]} → {preview.resourcesAfter[r]} now</p>)}{preview?.populationChoiceMayChangeIncome&&<p>Population return choices may change this income.</p>}</section>;
}
