import {useCallback,useEffect,useRef} from 'react';
import {useDiceSoundEnabled,useDiceSoundVolume} from '../presentationSettings';
import {prepareDiceAudio,playDiceImpact,type DiceSoundHandle} from './audio';
import {diceImpactCues,impactsBetween,DICE_SETTLED_MS} from './timing';
const played=new Set<string>();
function remember(key:string):void {played.add(key);if(played.size>256)played.delete(played.values().next().value!);}
/** Arm audio from ordinary game interaction, before an asynchronous combat roll arrives. */
export function useDiceAudioActivation():void {
 const [enabled]=useDiceSoundEnabled();
 useEffect(()=>{
  if(!enabled)return;
  const unlock=()=>prepareDiceAudio();
  window.addEventListener('pointerdown',unlock,{capture:true});
  window.addEventListener('keydown',unlock,{capture:true});
  window.addEventListener('touchend',unlock,{capture:true,passive:true});
  return()=>{window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);window.removeEventListener('touchend',unlock,true);};
 },[enabled]);
}
export interface DiceRollSoundController {start:()=>void;stop:()=>void}
/** Independent of motion preferences; animated throws supply their actual start cue. */
export function useDiceRollSound(key:string,count:number,animated:boolean,visible=true):DiceRollSoundController {
 const [enabled]=useDiceSoundEnabled(),[volume]=useDiceSoundVolume();
 const preferences=useRef({enabled,volume,visible});preferences.current={enabled,volume,visible};
 const previouslyVisible=useRef(visible);
 const runningKey=useRef<string|null>(null);
 const stopPlayback=useRef<()=>void>(()=>{});
 const stop=useCallback(()=>{stopPlayback.current();remember(key);},[key]);
 const start=useCallback(()=>{
  if(!preferences.current.visible||played.has(key)||runningKey.current===key)return;
  if(!preferences.current.enabled||preferences.current.volume<=0||document.hidden||count===0){remember(key);return;}
  runningKey.current=key;
  const cues=diceImpactCues(count),voices:DiceSoundHandle[]=[];
  let frame=0,started:number|null=null,previous=-1,stopped=false;
  const cancel=()=>{stopped=true;runningKey.current=null;cancelAnimationFrame(frame);voices.forEach(voice=>voice.stop());};
  stopPlayback.current=cancel;
  const tick=(now:number)=>{
   if(stopped)return;
   if(!preferences.current.visible||document.hidden||!preferences.current.enabled||preferences.current.volume<=0){cancel();return;}
   if(started===null){started=now;remember(key);}const elapsed=now-started;
   for(const impact of impactsBetween(cues,previous,elapsed)){
    const voice=playDiceImpact(impact.strength,impact.pan,preferences.current.volume);if(voice)voices.push(voice);
   }
   previous=elapsed;
   if(elapsed<DICE_SETTLED_MS)frame=requestAnimationFrame(tick);else cancel();
  };
  frame=requestAnimationFrame(tick);
 },[key,count]);
 useEffect(()=>{if(!animated&&visible)start();},[animated,visible,start]);
 useEffect(()=>{if(!visible&&previouslyVisible.current)stop();previouslyVisible.current=visible;},[visible,stop]);
 useEffect(()=>()=>stopPlayback.current(),[key]);
 useEffect(()=>{if(!enabled||volume<=0)stopPlayback.current();},[enabled,volume]);
 useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[stop]);
 return {start,stop};
}
