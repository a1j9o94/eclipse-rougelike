import {preparedAudioBus} from '../dice3d/audio';
import {readGameEffectsEnabled,readGameEffectsVolume} from '../presentationSettings';
import {synthesizeCue,type CosmeticCue,type SoundHandle} from './synthesis';
const voices=new Set<SoundHandle>();let lastDetent=-Infinity,lastSelection=-Infinity;
/** No unlock, timers, result inference or engine randomness: failed/hidden cues are discarded. */
export function playCosmeticCue(cue:CosmeticCue,previewVolume?:number):SoundHandle|null{
 if(document.hidden||previewVolume===undefined&&!readGameEffectsEnabled())return null;
 const volume=previewVolume??readGameEffectsVolume(),bus=preparedAudioBus();if(!bus||!Number.isFinite(volume)||volume<=0)return null;
 const now=performance.now();
 if(cue==='detent'&&now-lastDetent<65||cue==='selection'&&now-lastSelection<45)return null;
 if(cue==='detent')lastDetent=now;if(cue==='selection')lastSelection=now;
 if(voices.size>=6)voices.values().next().value?.stop();
 try{const handle=synthesizeCue(bus.context,bus.output,cue,volume,()=>voices.delete(handle));voices.add(handle);return handle;}catch{return null;}
}
export function stopCosmeticCues():void{for(const voice of voices)voice.stop();}
