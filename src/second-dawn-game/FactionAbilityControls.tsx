import CommitBar from './CommitBar';
import ActionEconomy from './ActionEconomy';
import {useContext} from 'react';
import {canQueueCommand} from '../../shared/eclipse/queuedActions';
import {useActionDraftState} from './actionDraftContext';
import {CommitContext,useCommitLabel} from './commitContext';
import ShipSilhouette from './ShipSilhouette';
import {shipClassName} from './shipLabels';
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
interface Props {view:PlayerView;candidates:readonly LegalCommandCandidate[];disabled:boolean;onSubmit:(command:GameCommand)=>void;onAction:(action:Action)=>void;onFinish?:()=>void;objectSectorId?:string;objectActions?:boolean;globalActions?:boolean;onPreview?:()=>void}
const name=(value:string)=>value[0].toUpperCase()+value.slice(1);
export default function FactionAbilityControls({view,candidates,disabled,onSubmit,onAction,onFinish,objectSectorId,objectActions=true,globalActions=true,onPreview}:Props){
 const [savedSelection,setSavedSelection]=useActionDraftState('factionDraft',null);
 const queued=useContext(CommitContext);
 const objectSelection=savedSelection?.type==='load-factory'||savedSelection?.type==='place-guild-portal';
 const selectedSector=savedSelection?.type==='load-factory'?view.ships.find(ship=>ship.id===savedSelection.shipId)?.sectorId:savedSelection?.type==='place-guild-portal'?view.sectors.find(sector=>sector.id===savedSelection.sectorId)?.id:undefined;
 const selected=savedSelection&&(objectSelection?objectActions&&(!objectSectorId||selectedSector===objectSectorId)||globalActions&&!selectedSector:globalActions)?savedSelection:null;
 const setSelected=(command:typeof savedSelection)=>{setSavedSelection(command);if(command)onPreview?.();};
 const commitLabel=useCommitLabel();
 const own=view.seats.find(s=>s.id===view.viewerSeatId)!;
 if(view.phase==='finished'||own.eliminated)return null;
 const conversions=candidates.flatMap(c=>globalActions&&c.command.type==='convert-colony-ship'?[c.command]:[]);
 const bonus=candidates.find(c=>c.command.type==='buy-activation');
 const progress=view.actionProgress?.owner===own.id?view.actionProgress:null;
 const canAct=view.phase==='action'&&view.activeSeatId===own.id&&!view.pendingDecision&&!view.waitingFor;
 const mixed=globalActions&&canAct&&own.faction==='ragnarok'&&progress?.budgets;
 const midas=globalActions&&canAct&&!own.passed&&own.faction==='midas'&&progress;
 const factories=candidates.flatMap(c=>objectActions&&c.command.type==='load-factory'&&(!objectSectorId||view.ships.some(ship=>ship.id===(c.command.type==='load-factory'?c.command.shipId:'')&&ship.sectorId===objectSectorId))?[c.command]:[]);
 const portals=candidates.flatMap(c=>objectActions&&c.command.type==='place-guild-portal'&&(!objectSectorId||c.command.sectorId===objectSectorId)?[c.command]:[]);
 const projects=candidates.flatMap(c=>globalActions&&c.command.type==='reverse-engineer'?[c.command]:[]);
 if(!selected&&!conversions.length&&!mixed&&!midas&&!factories.length&&!portals.length&&!(globalActions&&own.scifi?.reverseEngineeringProject))return null;
 const queueBlocked=queued&&selected&&!canQueueCommand(selected);
 const queueReason=selected?.type==='load-factory'?'Loading a factory':selected?.type==='place-guild-portal'?'Placing a portal':selected?.type==='reverse-engineer'?'Completing a reverse-engineering project':'Buying an extra activation';
 const selectedLegal=!!selected&&candidates.some(candidate=>JSON.stringify(candidate.command)===JSON.stringify(selected));
 const preview=selected?previewCommand(view,selected):null;
 const selectionLabel=selected?.type==='convert-colony-ship'?`Convert colony ship · gain 1 ${selected.resource}`:selected?.type==='load-factory'?'Load selected factory':selected?.type==='place-guild-portal'?'Place selected portal':selected?.type==='reverse-engineer'?'Complete selected project':selected?.type==='buy-activation'?`Buy extra ${name(selected.action)} activation`:'Confirm ability';
 const cost=progress?paidActivationCost(own,progress.action):null;
 return <section className="dg-faction-ability-controls" aria-label="Faction abilities"><FactionSymbol faction={own.faction}/>
  {factories.length>0&&<div><strong>Autofactories · {own.colonyShipsAvailable} colony ships available</strong><div className="dg-ability-options">{factories.map(command=>{const ship=view.ships.find(s=>s.id===command.shipId);const sector=view.sectors.find(s=>s.id===ship?.sectorId);return <button key={command.shipId} disabled={disabled} aria-pressed={JSON.stringify(selected)===JSON.stringify(command)} onClick={()=>setSelected(command)}>{ship&&<ShipSilhouette type="interceptor" faction={own.faction}/>}<FactoryBadge/>Load factory · {ship?shipClassName(ship.type,own.faction):'Ship'} {view.ships.filter(s=>s.owner===own.id&&s.type===ship?.type).findIndex(s=>s.id===ship?.id)+1} · sector {sector?.tileId}</button>;})}</div></div>}
  {portals.length>0&&<div><strong>Guild portals · {own.scifi?.guildPortalMarkers??0} markers left</strong><small>Permanent placement. Foreign portal users pay 1 Money per ship per Move action.</small><div className="dg-ability-options">{portals.map(command=><button key={command.sectorId} disabled={disabled} aria-pressed={JSON.stringify(selected)===JSON.stringify(command)} onClick={()=>setSelected(command)}>Place portal · sector {view.sectors.find(s=>s.id===command.sectorId)?.tileId}</button>)}</div></div>}
  {globalActions&&own.scifi?.reverseEngineeringProject&&<div><strong>Reverse engineering · {TECHNOLOGIES.find(t=>t.id===own.scifi?.reverseEngineeringProject?.id)?.name??SHIP_PARTS.find(t=>t.id===own.scifi?.reverseEngineeringProject?.id)?.name??own.scifi.reverseEngineeringProject.id}</strong><div className="dg-ability-options">{projects.map(command=><button key={command.track} disabled={disabled} aria-pressed={JSON.stringify(selected)===JSON.stringify(command)} onClick={()=>setSelected(command)}>Complete project · {command.track} · {own.resources.science-previewCommand(view,command).resourcesAfter.science} Science</button>)}{!projects.length&&<small>Start Research with sufficient Science and an eligible track to complete this project.</small>}</div></div>}
  {conversions.length>0&&<div><strong>Use 1 colony ship</strong><div className="dg-ability-options">{conversions.map(command=><button type="button" key={command.resource} disabled={disabled} aria-label={`Gain 1 ${command.resource} · use 1 colony ship`} aria-pressed={JSON.stringify(selected)===JSON.stringify(command)} onClick={()=>setSelected(command)}><TradeResourceIcon resource={command.resource}/><span>+1 {name(command.resource)}</span></button>)}</div></div>}
  {mixed&&<div><strong>Build & Move</strong><div className="dg-ability-options">{(['build','move']as const).map(action=><button type="button" key={action} disabled={disabled||(mixed[action]??0)===0} onClick={()=>onAction(action)}>{name(action)} · {mixed[action]??0} left</button>)}</div></div>}
  {midas&&<div><strong>{progress?.paidBonusUsed?'Extra activation purchased':'One more activation?'}</strong>{bonus?.command.type==='buy-activation'?<><button type="button" disabled={disabled} aria-pressed={JSON.stringify(selected)===JSON.stringify(bonus.command)} onClick={()=>{if(bonus.command.type==='buy-activation')setSelected(bonus.command);}}>Extra {name(bonus.command.action)} · {cost} Money</button><small>{own.resources.money} Money held{own.influenceOnTrack<=6?' · includes +1 for six or fewer discs':''}. No additional influence disc.</small></>:<small>{progress?.paidBonusUsed?`${progress.remaining} ${name(progress.action)} activation${progress.remaining===1?'':'s'} remaining.`:`An extra activation costs ${cost} Money; ${own.resources.money} held.`}</small>}</div>}
  {selected&&<section className="dg-faction-preview" aria-label="Faction action preview">

    {selected.type==='load-factory'&&<p>Use 1 colony ship and 1 Materials population cube. The selected Interceptor becomes a factory.</p>}
    {selected.type==='convert-colony-ship'&&<p>Colony ships ready: {own.colonyShipsAvailable} → {Math.max(0,own.colonyShipsAvailable-1)}</p>}
    {selected.type==='place-guild-portal'&&<p>Permanent portal in sector {view.sectors.find(sector=>sector.id===selected.sectorId)?.tileId}. Uses 1 portal marker.</p>}
    {queueBlocked&&<p role="status">{queueReason} cannot be queued. Use this ability during your turn.</p>}
    {!selectedLegal&&<p role="status">This ability is no longer available for the selected object. Choose another object or reset the draft.</p>}
    <CommitBar summary={<ActionEconomy view={view} action={selected.type} preview={preview}/>}><button type="button" className="sd-primary" disabled={disabled||!selectedLegal||!!queueBlocked} onClick={()=>{if(!disabled&&selectedLegal&&!queueBlocked){onSubmit(selected);if(selected.type==='buy-activation')onAction(selected.action);}}}>{commitLabel(selectionLabel)}</button></CommitBar>

  </section>}
  {(midas||mixed)&&candidates.some(c=>c.command.type==='end-action')&&<button type="button" disabled={disabled} onClick={()=>onFinish?onFinish():onSubmit({type:'end-action'})}>Finish action</button>}
 </section>;
}
