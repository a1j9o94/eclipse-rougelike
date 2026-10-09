import {createSpaceJazzBuffer,SPACE_JAZZ_SECONDS} from './spaceJazz';
import {synthesizeCombatCue,type CombatCue} from './combatSynthesis';
/** Original cosmetic synthesis. No game state or seeded randomness enters this module. */
type InterfaceCue='selection'|'confirm'|'detent'|'tile'|'move'|'install'|'reject';
export type CosmeticCue=InterfaceCue|CombatCue;
export interface SoundHandle {stop(fadeSeconds?:number):void}
const tones:Record<InterfaceCue,readonly [number,number,number]>={selection:[600,430,.045],detent:[370,250,.035],confirm:[520,780,.14],tile:[190,100,.16],move:[150,430,.28],install:[320,640,.18],reject:[220,165,.12]};
export function synthesizeCue(context:BaseAudioContext,output:AudioNode,cue:CosmeticCue,volume:number,onEnded:()=>void=()=>{}):SoundHandle{
 if(cue==='cannon-fire'||cue==='missile-launch'||cue==='impact'||cue==='explosion')return synthesizeCombatCue(context,output,cue,volume,onEnded);
 const [from,to,duration]=tones[cue],now=context.currentTime;
 const oscillator=context.createOscillator(),gain=context.createGain();
 oscillator.type=cue==='tile'||cue==='detent'?'triangle':'sine';
 oscillator.frequency.setValueAtTime(from,now);oscillator.frequency.exponentialRampToValueAtTime(to,now+duration);
 gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(Math.max(0,Math.min(1,volume))*.16,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 oscillator.connect(gain);gain.connect(output);
 let stopped=false;
 const cleanup=()=>{oscillator.disconnect();gain.disconnect();onEnded();};oscillator.onended=cleanup;
 oscillator.start(now);oscillator.stop(now+duration+.01);
 return {stop(){if(stopped)return;stopped=true;oscillator.onended=null;try{oscillator.stop();}catch{/* Already ended. */}cleanup();}};
}
export const AMBIENT_SECONDS=SPACE_JAZZ_SECONDS;
/** Original space jazz; one cached stereo source loops without a gap or a growing node graph. */
export function synthesizeAmbient(context:BaseAudioContext,output:AudioNode,onEnded:()=>void=()=>{}):SoundHandle{
 const source=context.createBufferSource(),envelope=context.createGain();
 source.buffer=createSpaceJazzBuffer(context);source.loop=true;
 source.connect(envelope);envelope.connect(output);
 const start=context.currentTime;
 envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(1,start+.15);
 let stopped=false,ended=false;
 const cleanup=()=>{if(ended)return;ended=true;source.onended=null;source.disconnect();envelope.disconnect();onEnded();};
 source.onended=cleanup;source.start(start);
 return {stop(fadeSeconds=0){
  if(stopped||ended)return;stopped=true;
  const now=context.currentTime,fade=Math.max(0,fadeSeconds);
  envelope.gain.cancelScheduledValues(now);envelope.gain.setValueAtTime(envelope.gain.value,now);envelope.gain.linearRampToValueAtTime(0,now+fade);
  try{source.stop(now+fade);}catch{cleanup();}
  if(!fade)cleanup();
 }};
}
