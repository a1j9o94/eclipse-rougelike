import {useCallback,useEffect,useRef,useState} from 'react';
import {onDiceImpact,prepareCosmeticAudio,preparedAudioBus} from '../dice3d/audio';
import {useGameEffectsEnabled,useGameEffectsVolume,useAmbientEnabled,useAmbientVolume} from '../presentationSettings';
import {playCosmeticCue} from './runtime';
import {synthesizeAmbient,type SoundHandle} from './synthesis';

/** Preview is explicitly requested, bounded to eight seconds, and never overlaps the match bed. */
export default function SoundSettingsControls(){
 const [effects,setEffects]=useGameEffectsEnabled(),[effectsVolume,setEffectsVolume]=useGameEffectsVolume();
 const [ambient,setAmbient]=useAmbientEnabled(),[ambientVolume,setAmbientVolume]=useAmbientVolume();
 const [previewing,setPreviewing]=useState(false);
 const preview=useRef<SoundHandle|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const previewToken=useRef(0);
 const cancelPending=useCallback(()=>{previewToken.current++;},[]);
 const stopPreview=useCallback(()=>{
  cancelPending();preview.current?.stop();preview.current=null;
  if(timer.current)clearTimeout(timer.current);
  timer.current=null;setPreviewing(false);
 },[cancelPending]);
 async function previewMusic(){
  if(preview.current){stopPreview();return;}
  const token=++previewToken.current,requestedAt=performance.now();
  await prepareCosmeticAudio();
  if(token!==previewToken.current||document.hidden||performance.now()-requestedAt>1000)return;
  const bus=preparedAudioBus();if(!bus)return;
  const output=bus.context.createGain();output.gain.value=ambientVolume;output.connect(bus.output);
  const unlisten=onDiceImpact(()=>{
   const now=bus.context.currentTime;
   output.gain.cancelScheduledValues(now);
   output.gain.setTargetAtTime(ambientVolume*.28,now,.025);
   output.gain.setTargetAtTime(ambientVolume,now+.3,.3);
  });
  try{
   preview.current=synthesizeAmbient(bus.context,output,()=>{unlisten();output.disconnect();});
   setPreviewing(true);timer.current=setTimeout(stopPreview,8000);
  }catch{unlisten();output.disconnect();}
 }
 useEffect(()=>{
  const hide=()=>{if(document.hidden)stopPreview();};
  document.addEventListener('visibilitychange',hide);window.addEventListener('hashchange',stopPreview);
  return()=>{
   cancelPending();preview.current?.stop();
   if(timer.current)clearTimeout(timer.current);
   document.removeEventListener('visibilitychange',hide);window.removeEventListener('hashchange',stopPreview);
  };
 },[stopPreview,cancelPending]);
 useEffect(()=>{stopPreview();},[ambient,ambientVolume,stopPreview]);
 return <>
  <label>
   <span><strong>Game effects</strong><small>Clicks, placed pieces, moving fleets, weapon fire and explosions.</small></span>
   <input type="checkbox" checked={effects} onChange={event=>{if(event.target.checked)void prepareCosmeticAudio();setEffects(event.target.checked);}}/>
  </label>
  <label className="dg-dice-volume">
   <span><strong>Game effects volume</strong><small>{Math.round(effectsVolume*100)}%</small></span>
   <input aria-label="Game effects volume" aria-valuetext={`${Math.round(effectsVolume*100)} percent`} type="range" min={0} max={100} step={5} value={Math.round(effectsVolume*100)} disabled={!effects} onChange={event=>setEffectsVolume(Number(event.target.value)/100)}/>
  </label>
  <button data-sound="silent" disabled={!effects||effectsVolume===0} onClick={()=>{const token=++previewToken.current,requestedAt=performance.now();void prepareCosmeticAudio().then(()=>{if(token===previewToken.current&&performance.now()-requestedAt<=1000)playCosmeticCue('tile');});}}>Preview game effects</button>
  <label>
   <span><strong>Ambient music</strong><small>A quiet, original space soundscape. Plays while you are in a match.</small></span>
   <input type="checkbox" checked={ambient} onChange={event=>{stopPreview();if(event.target.checked)void prepareCosmeticAudio();setAmbient(event.target.checked);}}/>
  </label>
  <label className="dg-dice-volume">
   <span><strong>Ambient music volume</strong><small>{Math.round(ambientVolume*100)}%</small></span>
   <input aria-label="Ambient music volume" aria-valuetext={`${Math.round(ambientVolume*100)} percent`} type="range" min={0} max={100} step={5} value={Math.round(ambientVolume*100)} disabled={!ambient} onChange={event=>{stopPreview();setAmbientVolume(Number(event.target.value)/100);}}/>
  </label>
  <button data-sound="silent" disabled={ambient||ambientVolume===0} onClick={previewMusic}>{previewing?'Stop music preview':'Preview ambient music'}</button>
  <p>{ambient?'Music is playing. Turn it off above to end the soundscape.':'Preview plays for eight seconds without enabling music.'}</p>
 </>;
}
