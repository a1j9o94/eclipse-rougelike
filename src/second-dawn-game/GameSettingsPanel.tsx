import {useEffect,useRef} from 'react';
import {useDice3dEnabled} from './presentationSettings';
import './presentationSettings.css';
export default function GameSettingsPanel({motionEnabled,onMotionChange,onClose}:{motionEnabled:boolean;onMotionChange:(enabled:boolean)=>void;onClose:()=>void}){
 const [dice3d,setDice3d]=useDice3dEnabled();
 const ref=useRef<HTMLElement>(null);
 useEffect(()=>{const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;ref.current?.focus();return()=>previous?.focus();},[]);
 return <div className="dg-settings-backdrop" onClick={event=>{if(event.target===event.currentTarget)onClose();}}><section className="dg-presentation-settings" role="dialog" aria-modal="true" aria-label="Game settings" tabIndex={-1} ref={ref} onKeyDown={event=>{
  if(event.key==='Escape'){event.stopPropagation();onClose();}
  if(event.key==='Tab'){const elements=Array.from(ref.current?.querySelectorAll<HTMLElement>('button,input')??[]);const first=elements[0],last=elements.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
 }}><header><div><small>MAKE YOURSELF AT HOME</small><h2>Game settings</h2></div><button onClick={onClose} aria-label="Close settings">×</button></header>
 <label><span><strong>3D combat dice</strong><small>Dice tumble across the game screen. Turn off for instant results.</small></span><input type="checkbox" checked={dice3d} onChange={event=>setDice3d(event.target.checked)}/></label>
 <label><span><strong>Animations</strong><small>Movement, combat and action effects.</small></span><input type="checkbox" checked={motionEnabled} onChange={event=>onMotionChange(event.target.checked)}/></label>
 {dice3d&&!motionEnabled&&<p>Animations are off. Dice results appear instantly.</p>}
 <p>Preferences save automatically in this browser. Reduced-motion settings are respected.</p>
 <button className="sd-primary" onClick={onClose}>Back to game</button>
 </section></div>;
}
