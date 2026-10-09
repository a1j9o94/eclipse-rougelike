import FactoryBadge from './FactoryBadge';
import {previewCommand} from '../../shared/eclipse/commandPreview';
import {paidActivationCost} from '../../shared/eclipse/rulesState';
import type {Action,GameCommand,PlayerView} from '../../shared/eclipse/types';
import type {LegalCommandCandidate} from '../../shared/eclipse/legal';
import {TradeResourceIcon} from './TradePanel';
import FactionSymbol from './FactionSymbol';
import './factionAbilities.css';
import {TECHNOLOGIES} from '../../shared/eclipse/technologies';
import {SHIP_PARTS} from '../../shared/eclipse/parts';
interface Props {view:PlayerView;candidates:readonly LegalCommandCandidate[];disabled:boolean;onSubmit:(command:GameCommand)=>void;onAction:(action:Action)=>void;onFinish?:()=>void}
const name=(value:string)=>value[0].toUpperCase()+value.slice(1);
export default function FactionAbilityControls({view,candidates,disabled,onSubmit,onAction,onFinish}:Props){
 const own=view.seats.find(s=>s.id===view.viewerSeatId)!;
 if(view.phase==='finished'||own.eliminated)return null;
 const conversions=candidates.flatMap(c=>c.command.type==='convert-colony-ship'?[c.command]:[]);
 const bonus=candidates.find(c=>c.command.type==='buy-activation');
 const progress=view.actionProgress?.owner===own.id?view.actionProgress:null;
 const canAct=view.phase==='action'&&view.activeSeatId===own.id&&!view.pendingDecision&&!view.waitingFor;
 const mixed=canAct&&own.faction==='ragnarok'&&progress?.budgets;
 const midas=canAct&&!own.passed&&own.faction==='midas'&&progress;
 const factories=candidates.flatMap(c=>c.command.type==='load-factory'?[c.command]:[]);
 const portals=candidates.flatMap(c=>c.command.type==='place-guild-portal'?[c.command]:[]);
 const projects=candidates.flatMap(c=>c.command.type==='reverse-engineer'?[c.command]:[]);
 if(!conversions.length&&!mixed&&!midas&&!factories.length&&!portals.length&&!own.scifi?.reverseEngineeringProject)return null;
 const cost=progress?paidActivationCost(own,progress.action):null;
 return <section className="dg-faction-ability-controls" aria-label="Faction abilities"><FactionSymbol faction={own.faction}/>
  {factories.length>0&&<div><strong>Autofactories · {own.colonyShipsAvailable} colony ships available</strong><small>Load a Materials cube onto an Interceptor in controlled territory. Production continues wherever it moves; its firing opponent can target it normally.</small><div className="dg-ability-options">{factories.map(command=>{const ship=view.ships.find(s=>s.id===command.shipId);const sector=view.sectors.find(s=>s.id===ship?.sectorId);return <button key={command.shipId} disabled={disabled} onClick={()=>onSubmit(command)}><FactoryBadge/>Load factory · {command.shipId} · sector {sector?.tileId}</button>;})}</div></div>}
  {portals.length>0&&<div><strong>Guild portals · {own.scifi?.guildPortalMarkers??0} markers left</strong><small>Permanent placement. Foreign portal users pay 1 Money per ship per Move action.</small><div className="dg-ability-options">{portals.map(command=><button key={command.sectorId} disabled={disabled} onClick={()=>onSubmit(command)}>Place portal · sector {view.sectors.find(s=>s.id===command.sectorId)?.tileId}</button>)}</div></div>}
  {own.scifi?.reverseEngineeringProject&&<div><strong>Reverse engineering · {TECHNOLOGIES.find(t=>t.id===own.scifi?.reverseEngineeringProject?.id)?.name??SHIP_PARTS.find(t=>t.id===own.scifi?.reverseEngineeringProject?.id)?.name??own.scifi.reverseEngineeringProject.id}</strong><small>Completing this project uses Science and one Research activation.</small><div className="dg-ability-options">{projects.map(command=><button key={command.track} disabled={disabled} onClick={()=>onSubmit(command)}>Complete project · {command.track} · {own.resources.science-previewCommand(view,command).resourcesAfter.science} Science</button>)}{!projects.length&&<small>Start Research with sufficient Science and an eligible track to complete this project.</small>}</div></div>}
  {conversions.length>0&&<div><strong>Use 1 colony ship</strong><small>Flip an unused ship for a resource; it cannot colonize this round.</small><div className="dg-ability-options">{conversions.map(command=><button type="button" key={command.resource} disabled={disabled} aria-label={`Gain 1 ${command.resource} · use 1 colony ship`} onClick={()=>onSubmit(command)}><TradeResourceIcon resource={command.resource}/><span>+1 {name(command.resource)}</span></button>)}</div></div>}
  {mixed&&<div><strong>Build & Move</strong><div className="dg-ability-options">{(['build','move']as const).map(action=><button type="button" key={action} disabled={disabled||(mixed[action]??0)===0} onClick={()=>onAction(action)}>{name(action)} · {mixed[action]??0} left</button>)}</div></div>}
  {midas&&<div><strong>{progress?.paidBonusUsed?'Extra activation purchased':'One more activation?'}</strong>{bonus?.command.type==='buy-activation'?<><button type="button" disabled={disabled} onClick={()=>{onSubmit(bonus.command);if(bonus.command.type==='buy-activation')onAction(bonus.command.action);}}>Extra {name(bonus.command.action)} · {cost} Money</button><small>{own.resources.money} Money held{own.influenceOnTrack<=6?' · includes +1 for six or fewer discs':''}. No additional influence disc.</small></>:<small>{progress?.paidBonusUsed?`${progress.remaining} ${name(progress.action)} activation${progress.remaining===1?'':'s'} remaining.`:`An extra activation costs ${cost} Money; ${own.resources.money} held.`}</small>}</div>}
  {(midas||mixed)&&candidates.some(c=>c.command.type==='end-action')&&<button type="button" disabled={disabled} onClick={()=>onFinish?onFinish():onSubmit({type:'end-action'})}>Finish action</button>}
 </section>;
}
