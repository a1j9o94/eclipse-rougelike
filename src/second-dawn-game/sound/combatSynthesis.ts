import type {SoundHandle} from './synthesis';
export type CombatCue='cannon-fire'|'missile-launch'|'impact'|'explosion';
const durations:Record<CombatCue,number>={'cannon-fire':.18,'missile-launch':.38,impact:.2,explosion:.5};
const buffers=new WeakMap<BaseAudioContext,Map<CombatCue,AudioBuffer>>();
/** Original short effects; independent deterministic noise never touches game randomness. */
export function synthesizeCombatCue(context:BaseAudioContext,output:AudioNode,cue:CombatCue,volume:number,onEnded:()=>void):SoundHandle{
 let cache=buffers.get(context);if(!cache){cache=new Map();buffers.set(context,cache);}
 let buffer=cache.get(cue);
 if(!buffer){
  const duration=durations[cue];buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate);
  const samples=buffer.getChannelData(0);let seed=73823,body=0,phase=0,peak=0;
  for(let i=0;i<samples.length;i++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   const noise=seed/2147483648-1,t=i/context.sampleRate,p=t/duration;
   body+=(cue==='explosion'?.035:cue==='missile-launch'?.12:.25)*(noise-body);
   const frequency=cue==='cannon-fire'?1000*Math.exp(-p*5)+85:cue==='missile-launch'?130+p*430:cue==='impact'?120*Math.exp(-p*3)+45:55*Math.exp(-p*2)+26;
   phase+=2*Math.PI*frequency/context.sampleRate;
   const envelope=Math.min(1,t/.006)*(cue==='missile-launch'?Math.sin(Math.PI*p)**1.4:Math.exp(-p*6))*(1-p);
   const sample=envelope*(cue==='cannon-fire'?Math.sin(phase)*.7+noise*.15:cue==='missile-launch'?body*2+Math.sin(phase)*.1:body*3+Math.sin(phase)*.35);
   samples[i]=sample;peak=Math.max(peak,Math.abs(sample));
  }
  for(let i=0;i<samples.length;i++)samples[i]*=.7/Math.max(.01,peak);
  cache.set(cue,buffer);
 }
 const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=Math.max(0,Math.min(1,volume))*.36;source.connect(gain);gain.connect(output);
 let ended=false;const cleanup=()=>{if(ended)return;ended=true;source.disconnect();gain.disconnect();onEnded();};source.onended=cleanup;source.start();
 return {stop(){if(ended)return;source.onended=null;try{source.stop();}catch{/* Already finished. */}cleanup();}};
}
