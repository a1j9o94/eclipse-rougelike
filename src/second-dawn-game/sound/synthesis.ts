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
export const AMBIENT_SECONDS=90;
/** Four bounded voices: three slowly changing pads and one sparse, breath-like upper tone. */
export function synthesizeAmbient(context:BaseAudioContext,output:AudioNode,onEnded:()=>void=()=>{}):SoundHandle{
 const start=context.currentTime,voices:OscillatorNode[]=[],nodes:AudioNode[]=[];
 const chords=[[110,164.81,220],[98,146.83,220],[87.31,130.81,196],[98,146.83,196],[110,164.81,246.94],[110,146.83,220]];
 const envelope=context.createGain();nodes.push(envelope);envelope.connect(output);
 envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(1,start+3);envelope.gain.setValueAtTime(1,start+86);envelope.gain.linearRampToValueAtTime(0,start+AMBIENT_SECONDS);
 for(let voice=0;voice<4;voice++){
  const oscillator=context.createOscillator(),gain=context.createGain();voices.push(oscillator);nodes.push(oscillator,gain);oscillator.type='sine';oscillator.connect(gain);gain.connect(envelope);
  if(voice<3){gain.gain.value=.11;oscillator.frequency.setValueAtTime(chords[0][voice],start);for(let section=1;section<6;section++){const at=start+section*15;oscillator.frequency.setValueAtTime(chords[section-1][voice],at-3);oscillator.frequency.exponentialRampToValueAtTime(chords[section][voice],at+3);}}
  else{gain.gain.setValueAtTime(0,start);for(const [index,at] of [7,24,43,65,80].entries()){oscillator.frequency.setValueAtTime([440,493.88,392,329.63,440][index],start+at);gain.gain.setValueAtTime(0,start+at);gain.gain.linearRampToValueAtTime(.045,start+at+1.7);gain.gain.exponentialRampToValueAtTime(.0001,start+at+5);gain.gain.setValueAtTime(0,start+at+5.1);}}
  oscillator.start(start);oscillator.stop(start+AMBIENT_SECONDS);
 }
 let stopped=false;
 const cleanup=()=>{for(const node of nodes)node.disconnect();onEnded();};voices[0].onended=cleanup;
 return {stop(fadeSeconds=0){if(stopped)return;stopped=true;voices[0].onended=null;const now=context.currentTime;envelope.gain.cancelScheduledValues(now);envelope.gain.setValueAtTime(envelope.gain.value,now);envelope.gain.linearRampToValueAtTime(0,now+fadeSeconds);for(const voice of voices){try{voice.stop(now+fadeSeconds);}catch{/* Already ended. */}}if(fadeSeconds){voices[0].onended=cleanup;}else cleanup();}};
}
