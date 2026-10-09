import {useState} from 'react';
import GameSettingsPanel from './GameSettingsPanel';
import {useMotionEnabled,useFollowAiEnabled} from './presentationSettings';
import './menuSettings.css';

export default function MenuSettingsButton(){
 const [open,setOpen]=useState(false),[motion,setMotion]=useMotionEnabled(),[follow,setFollow]=useFollowAiEnabled();
 return <div className="dg-menu-settings">
  <button className="dg-settings-gear" type="button" data-sound="silent" aria-label="Settings" title="Settings" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}>
   <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9.6 3-.5 2.2-1.5.9-2.2-.7L3 9.6l1.7 1.5v1.8L3 14.4l2.4 4.2 2.2-.7 1.5.9.5 2.2h4.8l.5-2.2 1.5-.9 2.2.7 2.4-4.2-1.7-1.5v-1.8L21 9.6l-2.4-4.2-2.2.7-1.5-.9-.5-2.2Z"/><circle cx="12" cy="12" r="3"/></svg>
  </button>
  {open&&<GameSettingsPanel title="Settings" motionEnabled={motion} onMotionChange={setMotion} followAi={follow} onFollowAiChange={setFollow} onClose={()=>setOpen(false)}/>}
 </div>;
}
