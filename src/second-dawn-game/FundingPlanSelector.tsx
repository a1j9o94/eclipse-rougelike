import {previewCommand} from '../../shared/eclipse/commandPreview';
import {getFaction} from '../../shared/eclipse/catalog';
import {fundingOptions} from '../../shared/eclipse/funding';
import type {GameCommand,PlayerView} from '../../shared/eclipse/types';
import {TradeResourceIcon} from './TradePanel';
import './funding.css';
type FundedCommand=Extract<GameCommand,{type:'trade-and-act'}>;
export default function FundingPlanSelector({view,command,disabled,onChange}:{view:PlayerView;command:FundedCommand;disabled:boolean;onChange:(command:FundedCommand)=>void}){
 const seat=view.seats.find(s=>s.id===view.viewerSeatId)!;
 const ratio=getFaction(seat.faction).tradeRatio,options=fundingOptions(view,command.action);
 const preview=previewCommand(view,command),balance=preview.resourcesAfter.money+preview.moneyIncomeAfter-preview.upkeepAfter;
 const label=(option:FundedCommand)=>'Pay '+option.trades.map(t=>`${t.amount*ratio} ${t.from}`).join(' + ');
 return <section className="dg-funding" aria-label="Purchase conversion">
  <strong>Conversion required</strong><p>Choose what to spend. Conversion and purchase happen together when you confirm.</p>
  {options.length>1&&<div className="dg-funding-options" aria-label="Conversion input options">{options.map(option=><button key={JSON.stringify(option.trades)} disabled={disabled} aria-label={label(option.command)} aria-pressed={JSON.stringify(command.trades)===JSON.stringify(option.trades)} onClick={()=>onChange(option.command)}>{option.trades.map(trade=><span key={trade.from}><TradeResourceIcon resource={trade.from}/>{trade.amount*ratio}</span>)}</button>)}</div>}
  <div className="dg-funding-exchange">{command.trades.map(trade=><span key={trade.from} role="img" aria-label={`Spend ${trade.amount*ratio} ${trade.from}`}><TradeResourceIcon resource={trade.from}/><b>−{trade.amount*ratio}</b></span>)}<span aria-hidden="true">→</span><span role="img" aria-label={`Receive ${command.trades.reduce((n,t)=>n+t.amount,0)} ${command.trades[0].to}`}><TradeResourceIcon resource={command.trades[0].to}/><b>+{command.trades.reduce((n,t)=>n+t.amount,0)}</b></span></div>
  <small>{ratio} : 1 exchange</small><p className={balance<0?"dg-danger":""}><b>{balance<0?`${-balance} money short at upkeep`:`${balance} money left after upkeep`}</b></p>
 </section>;
}
