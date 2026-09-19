import {useEffect,useRef} from 'react';
import {useDice3dEnabled,useDiceSoundEnabled,useDiceSoundVolume} from './presentationSettings';
import './presentationSettings.css';
import SoundSettingsControls from './sound/SoundSettingsControls';
export interface GameSettingsPanelProps {
 motionEnabled:boolean;onMotionChange:(enabled:boolean)=>void;onClose:()=>void;
 onHistory?:()=>void;onGameMenu?:()=>void;
 followAi?:boolean;onFollowAiChange?:(enabled:boolean)=>void;
 autoPass?:{enabled:boolean;paused:boolean;disabled:boolean;disabledReason?:string;onChange:(enabled:boolean)=>void};
}
export default function GameSettingsPanel({motionEnabled,onMotionChange,onClose,followAi,onFollowAiChange,autoPass,onHistory,onGameMenu}:GameSettingsPanelProps){
 const [dice3d,setDice3d]=useDice3dEnabled();
 const [diceSound,setDiceSound]=useDiceSoundEnabled();
 const [diceVolume,setDiceVolume]=useDiceSoundVolume();
 const ref=useRef<HTMLElement>(null);
 useEffect(()=>{const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;ref.current?.focus();return()=>previous?.focus();},[]);
 return <div className="dg-settings-backdrop" onClick={event=>{if(event.target===event.currentTarget)onClose();}}><section className="dg-presentation-settings" role="dialog" aria-modal="true" aria-label="Game settings" tabIndex={-1} ref={ref} onKeyDown={event=>{
  if(event.key==='Escape'){event.stopPropagation();onClose();}
  if(event.key==='Tab'){const elements=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')??[]);const first=elements[0],last=elements.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
 }}><header><div><small>MAKE YOURSELF AT HOME</small><h2>Game settings</h2></div><button onClick={onClose} aria-label="Close settings">×</button></header>
 <div className="dg-settings-game-actions">{onHistory&&<button onClick={onHistory}>History &amp; undo</button>}{onGameMenu&&<button onClick={onGameMenu}>Leave or resign game</button>}</div>
 <label><span><strong>3D combat dice</strong><small>Dice tumble across the game screen. Turn off for instant results.</small></span><input type="checkbox" checked={dice3d} onChange={event=>setDice3d(event.target.checked)}/></label>
 <label><span><strong>Animations</strong><small>Movement, combat and action effects.</small></span><input type="checkbox" checked={motionEnabled} onChange={event=>onMotionChange(event.target.checked)}/></label>
 <label><span><strong>Dice sounds</strong><small>Hear the dice tumble and settle, even with animations off.</small></span><input type="checkbox" checked={diceSound} onChange={event=>setDiceSound(event.target.checked)}/></label>
 <label className="dg-dice-volume"><span><strong>Dice volume</strong><small>{Math.round(diceVolume*100)}%</small></span><input aria-label="Dice volume" aria-valuetext={`${Math.round(diceVolume*100)} percent`} type="range" min={0} max={100} step={5} value={Math.round(diceVolume*100)} disabled={!diceSound} onChange={event=>setDiceVolume(Number(event.target.value)/100)}/></label>
 <SoundSettingsControls/>
 {onFollowAiChange&&<label><span><strong>Follow AI</strong><small>Follow opponents’ actions as they play.</small></span><input type="checkbox" checked={followAi??true} onChange={event=>onFollowAiChange(event.target.checked)}/></label>}
 {autoPass&&<><label><span><strong>Auto-pass unless attacked</strong><small>After passing, skip reaction turns until an opponent attacks. Saved for your seat across devices.</small></span><input type="checkbox" checked={autoPass.enabled} disabled={autoPass.disabled} onChange={event=>autoPass.onChange(event.target.checked)}/></label>
 {autoPass.disabled&&autoPass.disabledReason&&<p>{autoPass.disabledReason}</p>}
 {autoPass.enabled&&autoPass.paused&&<div className="dg-settings-auto-pass-status"><p role="status">Attacked · reactions restored</p><button disabled={autoPass.disabled} onClick={()=>autoPass.onChange(true)}>Resume auto-pass</button></div>}</>}
 {dice3d&&!motionEnabled&&<p>Animations are off. Dice results appear instantly.</p>}
 <p>Sound and display preferences save automatically in this browser. Reduced-motion settings are respected.</p>
 </section></div>;
}
