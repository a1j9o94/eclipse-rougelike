import {combatAutomationPauseReason, type CombatAutomationStatus, type CombatAutomationPauseReason} from '../../shared/eclipse/combatAutomation';
import type {PlayerView} from '../../shared/eclipse/types';
import './combatAutomation.css';

const reasons:Record<CombatAutomationPauseReason,string>={
 manual:'Paused',
 'ship-loss':'Ship lost · review your fleet',
 'forced-retreat':'Retreat required',
 'special-decision':'Your choice is needed',
 complete:'Battle complete',
 error:'Auto fight stopped · review the current choice',
 timeout:'Turn timer expired',
 undo:'Paused for undo',
};
/** A server-owned preference; navigation and connection loss do not drive it. */
export default function CombatAutomationControl({view,status,disabled,onChange}:{
 view:PlayerView;
 status?:CombatAutomationStatus|null;
 disabled:boolean;
 onChange:(enabled:boolean)=>void;
}) {
 const battle=view.battle;
 if(!battle?.id||![battle.attacker,battle.defender].includes(view.viewerSeatId))return null;
 const current=status?.battleId===battle.id?status:null;
 const running=current?.status==='running';
 const ships=view.ships.filter(ship=>ship.owner===view.viewerSeatId&&ship.sectorId===battle.sectorId).map(ship=>ship.id);
 const blocker=combatAutomationPauseReason(view,battle.id,ships);
 const available=ships.length>0&&!blocker&&current?.status!=='finished';
 const text=running?'Auto fight running':current?.reason?reasons[current.reason]:'Manual combat';
 return <section className="dg-combat-automation" aria-label="Battle automation">
  <div><strong role="status">{text}</strong></div>
  <button type="button" disabled={disabled||(!running&&!available)} aria-describedby="combat-auto-help" onClick={()=>onChange(!running)}>
   {running?'Pause Auto fight':current?.status==='paused'?'Resume Auto fight':'Auto fight'}
  </button>
  <details id="combat-auto-help"><summary aria-label="How Auto fight works">?</summary><p>Fires and assigns damage while you are away. It stops for your ship losses, retreat, special choices, errors, or the end of this battle. Resume explicitly after reviewing the fleet. Consumables and rewards stay yours to choose. Pausing stops future orders; accepted orders remain committed.</p></details>
 </section>;
}
