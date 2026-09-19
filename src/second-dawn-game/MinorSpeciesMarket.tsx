import {useState,type ReactNode} from 'react';
import {getMinorSpecies,minorSpeciesPurchaseIssue,minorSpeciesPurchaseOptions,type MinorSpeciesId} from '../../shared/eclipse/minorSpecies';
import {incomeForPopulationAway} from '../../shared/eclipse/tracks';
import {previewCommand} from '../../shared/eclipse/commandPreview';
import type {GameCommand,PlayerView,Resource,Seat} from '../../shared/eclipse/types';
import ShipSilhouette from './ShipSilhouette';
import {StatIcon} from './ShipPartStats';
import {TradeResourceIcon} from './TradePanel';
import './minorSpecies.css';

const resources:readonly Resource[]=['money','science','materials'];
const names:Record<Resource,string>={money:'Money',science:'Science',materials:'Materials'};
function minorSpeciesDescription(id:MinorSpeciesId):string {
 const effect=getMinorSpecies(id).effect;
 switch(effect.kind){
  case 'fixed-vp':return `${effect.points} victory points.`;
  case 'reputation-vp':return `+${effect.points} VP per retained reputation tile. Tile values stay private.`;
  case 'ambassador-vp':return `+${effect.points} VP per retained ambassador, including Minor Species tiles.`;
  case 'population':return 'Place one population cube on this tile, increasing that resource’s round income.';
  case 'construction-discount':return `Each ${effect.component} costs ${effect.amount} fewer materials to build.`;
  case 'research-discount':return `Technologies cost ${effect.amount} science cheaper, never below their minimum price.`;
 }
}
function MinorSpeciesIcon({id,seat}:{id:MinorSpeciesId;seat?:Seat}){
 const effect=getMinorSpecies(id).effect;
 if(effect.kind==='construction-discount')return effect.component==='cruiser'||effect.component==='dreadnought'?<ShipSilhouette type={effect.component} faction={seat?.faction}/>:<StatIcon kind={effect.component==='orbital'?'portal':'structure'}/>;
 return <StatIcon kind={effect.kind==='research-discount'?'computer':effect.kind==='population'?'population':effect.kind==='ambassador-vp'?'influence':'discovery'}/>;
}
export function MinorSpeciesCard({id,seat,resource,children}:{id:MinorSpeciesId;seat?:Seat;resource?:Resource;children?:ReactNode}){
 const definition=getMinorSpecies(id),effect=definition.effect;
 const badge=effect.kind==='fixed-vp'?`${effect.points} VP`:effect.kind==='reputation-vp'||effect.kind==='ambassador-vp'?`+${effect.points} VP`:effect.kind==='construction-discount'||effect.kind==='research-discount'?`−${effect.amount}`:'+1';
 return <article className="dg-minor-card" aria-label={definition.name}>
  <header><span className="dg-minor-emblem"><MinorSpeciesIcon id={id} seat={seat}/></span><div><small>MINOR SPECIES</small><h3>{definition.name}</h3></div><strong className="dg-minor-bonus">{badge}</strong></header>
  <p>{minorSpeciesDescription(id)}</p>
  {effect.kind!=='fixed-vp'&&effect.kind!=='reputation-vp'&&effect.kind!=='ambassador-vp'&&<span className="dg-minor-vp">1 VP</span>}
  {resource&&<span className="dg-minor-population"><TradeResourceIcon resource={resource}/>{names[resource]} population</span>}
  {children}
 </article>;
}
export function AcquiredMinorSpecies({seat}:{seat:Seat}){
 if(!seat.minorSpecies?.length)return null;
 return <section className="dg-minor-acquired" aria-label="Acquired Minor Species"><h2>Minor Species</h2><div className="dg-minor-grid">{seat.minorSpecies.map(tile=><MinorSpeciesCard key={tile.id} id={tile.id} seat={seat} resource={tile.resource}/>)}</div></section>;
}
export default function MinorSpeciesMarket({view,disabled,onSubmit}:{view:PlayerView;disabled:boolean;onSubmit:(command:GameCommand)=>void}){
 const [chosenResources,setChosenResources]=useState<Partial<Record<MinorSpeciesId,Resource>>>({});
 const [acknowledged,setAcknowledged]=useState<Record<string,boolean>>({});
 if(!view.minorSpecies)return null;
 const own=view.seats.find(seat=>seat.id===view.viewerSeatId)!;
 const options=minorSpeciesPurchaseOptions(view);
 return <section className="dg-minor-market" aria-label="Minor Species market">
  <header><p className="sd-eyebrow">MINOR SPECIES</p><h2>Recruit an ally</h2><p>Buy with money during your action turn. Recruiting uses no influence disc or action activation.</p></header>
  {!view.minorSpecies.market.length?<p>All Minor Species have been recruited.</p>:<div className="dg-minor-grid">{view.minorSpecies.market.map(id=>{
   const definition=getMinorSpecies(id),population=definition.effect.kind==='population',resource=chosenResources[id];
   const choices=options.filter(option=>option.minorSpeciesId===id);
   const command=choices.find(option=>!population||option.resource===resource);
   const preview=command?previewCommand(view,command):null;
   const returns=command?.returnReputation??[],returnKey=`${id}:${returns.join(',')}:${view.revision}`;
   const issue=minorSpeciesPurchaseIssue(view,id);
   const reason=issue?(own.resources.money<definition.cost&&issue===`Requires ${definition.cost} money.`?`Need ${definition.cost-own.resources.money} more money.`:issue):population&&!resource?'Choose a population cube.':!command?'No diplomatic track space or legal purchase is available.':null;
   const blocked=disabled||!!reason||returns.length>0&&!acknowledged[returnKey];
   return <MinorSpeciesCard key={id} id={id} seat={own}>
    {population&&<div className="dg-minor-cubes" role="group" aria-label="Minor Species population cube">{resources.map(choice=>{
     const before=incomeForPopulationAway(own.populationTracks[choice]),available=own.populationTracks[choice]<11;
     return <button key={choice} aria-label={`${names[choice]} population`} aria-pressed={resource===choice} disabled={disabled||!available} onClick={()=>setChosenResources(current=>({...current,[id]:choice}))}><TradeResourceIcon resource={choice}/><strong>{names[choice]}</strong><small>{available?`Income ${before} → ${incomeForPopulationAway(own.populationTracks[choice]+1)}`:'No cubes'}</small></button>;
    })}</div>}
    {returns.length>0&&<label className="dg-minor-return"><input type="checkbox" checked={!!acknowledged[returnKey]} disabled={disabled} onChange={event=>setAcknowledged(current=>({...current,[returnKey]:event.target.checked}))}/><span>Return {returns.join(' + ')} VP reputation to free a slot. Those points are lost.</span></label>}
    {reason&&<p className="dg-minor-blocker">{reason}</p>}
    {preview&&<p className="dg-minor-balance">{preview.resourcesAfter.money} money remaining</p>}
    {preview&&preview.moneyBalanceAfter<0&&<p className="dg-danger" role="alert">{Math.abs(preview.moneyBalanceAfter)} money short at upkeep</p>}
    <button className="sd-primary dg-minor-buy" disabled={blocked} onClick={()=>{if(command&&!blocked)onSubmit(command);}} aria-label={`Buy ${definition.name} for ${definition.cost} money`}><span>Buy</span><TradeResourceIcon resource="money"/><strong>{definition.cost}</strong></button>
   </MinorSpeciesCard>;
  })}</div>}
 </section>;
}
