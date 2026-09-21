import {gameRules} from '../../shared/eclipse/gameRules';
import {useId,useState} from 'react';
import {createLessRandomDiscoverySupply,createDiscoverySupply,getDiscovery,type DiscoveryEffect} from '../../shared/eclipse/discoveries';
import type {PlayerView} from '../../shared/eclipse/types';
import {describeShipPart} from './itemDescriptions';
import ShipPartStats,{StatIcon} from './ShipPartStats';
import './discoveryReference.css';

function describeReward(effect:DiscoveryEffect):string {
 switch(effect.kind){
  case 'resources': return `Gain ${(['money','science','materials'] as const).filter(resource=>effect.resources[resource]>0).map(resource=>`${effect.resources[resource]} ${resource}`).join(', ')} immediately.`;
  case 'choice-resources': return `${effect.money?`Gain ${effect.money} money, then choose`:'Choose'} ${effect.amount} resources of one type: money, science or materials.`;
  case 'end-game-bonus': return effect.bonus==='artifacts'?'At game end, score 1 VP for each artifact you control.':'At game end, score 1 VP for every 3 reputation VP you hold.';
  case 'free-technology': return 'Gain an unowned regular technology with the lowest printed cost in the market, for no science. Choose among ties; a legal track space is required.';
  case 'place-unbuilt-ship': return 'Place an unbuilt Cruiser in the discovery sector for free, using your Cruiser blueprint. If all four Cruisers are deployed, no ship is added.';
  case 'place-structure': return effect.structure==='orbital'?`Place an Orbital in the discovery sector and gain ${effect.bonusMaterials} materials. Colonize it separately with money or science population.`:'Place a Monolith in the discovery sector for free. Its final controller scores 3 VP.';
  case 'place-warp-portal': return `Place a Warp Portal in the discovery sector, connecting it to all other portals. Its final controller scores ${effect.controlledSectorVp} VP.`;
  case 'ancient-ship-part': return `Install immediately for free or store for a later Upgrade. ${effect.placement==='outside-grid'?'Installs permanently outside the grid and uses no slot.':'Uses a blueprint grid slot; removing it later removes the part from the game.'}`;
 }
}

function referenceOptions(view:PlayerView){return [...new Set(gameRules(view).discoveryVariant?createLessRandomDiscoverySupply():createDiscoverySupply(view.warpPortals??true,view.riftCannons??false))].map(id=>{
 const tile=getDiscovery(id),description=describeReward(tile.effect);
 return {...tile,description,searchText:`${tile.name} ${description} ${tile.effect.kind==='ancient-ship-part'?describeShipPart(tile.effect.part):''}`.toLowerCase()};
});}

export default function DiscoveryReference({view}:{view:PlayerView}) {
 const [open,setOpen]=useState(false),[search,setSearch]=useState('');
 const contentId=`discovery-options-${useId().replace(/[^a-zA-Z0-9_-]/g,'')}`;
 if(!gameRules(view).publicDiscoveries||!view.lessRandom)return null;
 const supply=view.lessRandom.discoverySupply;
 const counts=new Map<string,number>();
 for(const id of supply)counts.set(id,(counts.get(id)??0)+1);
 const options=referenceOptions(view).filter(tile=>tile.searchText.includes(search.trim().toLowerCase()));
 return <section className="eo-panel eo-discovery-reference" aria-label="Discovery tile options">
  <header><div><p className="sd-eyebrow">PUBLIC DISCOVERIES · SHARED SUPPLY</p><h2><StatIcon kind="discovery"/> Discovery tile options</h2><p className="eo-discovery-stock">{supply.length} {supply.length===1?'tile':'tiles'} remaining in the public supply</p></div><button type="button" aria-expanded={open} aria-controls={contentId} onClick={()=>setOpen(value=>!value)}>{open?'Hide':'Show'} discovery tile options</button></header>
  <div id={contentId} hidden={!open}>{open&&<>
   <p className="eo-discovery-intro">When you earn a discovery, choose a tile from the public supply. Keep a tile for 2 VP or use its reward. Availability here shows remaining copies; rewards may have additional requirements.</p>
   <label className="eo-discovery-search">Find a discovery<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search names or effects"/></label>
   <div className="eo-discovery-grid">{options.map(tile=>{
    const remaining=counts.get(tile.id)??0;
    return <article key={tile.id} aria-label={tile.name} className={`eo-discovery-card${remaining===0?' eo-discovery-unavailable':''}`}>
     <header><h3>{tile.name}</h3><span className="eo-discovery-count">{remaining?`${remaining} remaining`:'Unavailable'}</span></header>
     {tile.effect.kind==='ancient-ship-part'&&<ShipPartStats partId={tile.effect.part}/>}
     <p>{tile.description}</p>
    </article>;
   })}</div>
   {options.length===0&&<p role="status" className="eo-discovery-intro">No discoveries match “{search}”. Try another name or effect.</p>}
  </>}</div>
 </section>;
}
