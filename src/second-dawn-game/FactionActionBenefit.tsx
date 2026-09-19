import {getFaction,type FactionId} from '../../shared/eclipse/catalog';
import type {GameCommand} from '../../shared/eclipse/types';
import FactionSymbol from './FactionSymbol';
import './factionActionBenefit.css';
interface Benefit {value:string;label:string;detail:string}
function benefit(factionId:FactionId,action:GameCommand['type']):Benefit|null {
 const faction=getFaction(factionId);
 if(action==='trade'&&faction.tradeRatio!==3)return {value:`${faction.tradeRatio}:1`,label:faction.species==='terran'?'Terran trade':'Faction trade rate',detail:`Spend ${faction.tradeRatio} resources for one of another type.`};
 if(action==='build'&&factionId==='mechanema')return {value:String(faction.activations.build),label:'base builds / action',detail:'Reduced construction prices are already included. Technology bonuses add to this capacity.'};
 if(action==='upgrade'&&factionId==='mechanema')return {value:String(faction.activations.upgrade),label:'base installs / action',detail:'Technology bonuses add to this capacity. Removals are free.'};
 if(action==='research'&&factionId==='hydran')return {value:String(faction.activations.research),label:'researches / action',detail:'Your faction can acquire two technologies using one action disc.'};
 if(action==='explore'&&factionId==='planta')return {value:String(faction.activations.explore),label:'explorations / action',detail:'Your faction can explore twice using one action disc.'};
 if(action==='colonize'&&factionId==='planta')return {value:String(faction.colonyShips),label:'colony ship capacity',detail:'Your faction has an extra colony ship. Available ships are shown in the colony plan.'};
 if(action==='move'&&faction.species==='terran')return {value:String(faction.activations.move),label:'base moves / action',detail:'Technology bonuses add to this capacity.'};
 if(action==='move'&&factionId==='draco')return {value:'◇',label:'Ancient affinity',detail:'Ancients do not pin your ships. Other opponents still do.'};
 if(action==='explore'&&factionId==='draco')return {value:'2 → 1',label:'sector choice',detail:'Choose one of two drawn sectors, or discard both.'};
 return null;
}
export default function FactionActionBenefit({factionId,action}:{factionId:FactionId;action:GameCommand['type']}){
 const effect=benefit(factionId,action);if(!effect)return null;
 return <div className="dg-faction-action-benefit" aria-label={`${getFaction(factionId).name} faction effect`}><FactionSymbol faction={factionId}/><b>{effect.value}</b><span>{effect.label}<small>{effect.detail}</small></span></div>;
}
