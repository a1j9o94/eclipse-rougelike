import {useEffect,useRef} from 'react';
import {onDiceImpact,prepareCosmeticAudio,preparedAudioBus,stopAllDiceAudio} from '../dice3d/audio';
import {useAmbientEnabled,useAmbientVolume,useDiceSoundEnabled,useGameEffectsEnabled,useGameEffectsVolume} from '../presentationSettings';
import {synthesizeAmbient,type SoundHandle} from './synthesis';
import {stopCosmeticCues} from './runtime';
/** Match-scoped lifecycle, also used by the local playable preview. */
export function useSoundscape():void{
 const [dice]=useDiceSoundEnabled(),[effects]=useGameEffectsEnabled(),[effectsVolume]=useGameEffectsVolume(),[ambient]=useAmbientEnabled(),[volume]=useAmbientVolume();
 const preferences=useRef({dice,effects,ambient,volume});preferences.current={dice,effects,ambient,volume};
 const gain=useRef<GainNode|null>(null),music=useRef<SoundHandle|null>(null);
 const sync=useRef<()=>void>(()=>{});
 useEffect(()=>{
  let disposed=false,routeActive=true;
  const routeKind=()=>/^#second-dawn-(preview|review)$/.test(window.location.hash)?'preview':'game';
  const initialRoute=routeKind();
  const stop=(fade=0)=>{const oldGain=gain.current;gain.current=null;const oldMusic=music.current;music.current=null;oldMusic?.stop(fade);if(!fade)oldGain?.disconnect();};
  const start=()=>{try{
   if(disposed||!routeActive||document.hidden||!preferences.current.ambient||preferences.current.volume<=0){stop();return;}
   const bus=preparedAudioBus();if(!bus)return;
   if(gain.current){gain.current.gain.setTargetAtTime(preferences.current.volume,bus.context.currentTime,.15);return;}
   const output=bus.context.createGain();output.gain.value=preferences.current.volume;output.connect(bus.output);gain.current=output;
   const next=()=>{if(disposed||!routeActive||gain.current!==output||document.hidden){output.disconnect();return;}try{music.current=synthesizeAmbient(bus.context,output,next);}catch{output.disconnect();gain.current=null;music.current=null;}};next();
  }catch{stop();}};
  sync.current=start;
  const unlock=()=>{if(!routeActive)return;if(!preferences.current.dice&&!preferences.current.effects&&!preferences.current.ambient)return;void prepareCosmeticAudio().then(()=>start());};
  const routeChange=()=>{routeActive=routeKind()===initialRoute;if(routeActive)start();else{stop(.25);stopCosmeticCues();stopAllDiceAudio();}};
  const visibility=()=>{stopCosmeticCues();stopAllDiceAudio();if(document.hidden)stop();else start();};
  const unlisten=onDiceImpact(()=>{const bus=preparedAudioBus(),output=gain.current;if(!bus||!output)return;const now=bus.context.currentTime;output.gain.cancelScheduledValues(now);output.gain.setTargetAtTime(preferences.current.volume*.28,now,.025);output.gain.setTargetAtTime(preferences.current.volume,now+.3,.3);});
  window.addEventListener('eclipse-audio-ready',start);window.addEventListener('hashchange',routeChange);window.addEventListener('pointerdown',unlock,true);window.addEventListener('keydown',unlock,true);window.addEventListener('touchend',unlock,{capture:true,passive:true});document.addEventListener('visibilitychange',visibility);
  start();
  return()=>{disposed=true;sync.current=()=>{};stop(.25);stopCosmeticCues();stopAllDiceAudio();unlisten();window.removeEventListener('eclipse-audio-ready',start);window.removeEventListener('hashchange',routeChange);window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);window.removeEventListener('touchend',unlock,true);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{sync.current();},[ambient,volume]);
 useEffect(()=>{if(!effects||effectsVolume<=0)stopCosmeticCues();},[effects,effectsVolume]);
}
