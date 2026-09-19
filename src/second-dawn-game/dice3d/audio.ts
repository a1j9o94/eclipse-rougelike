/** Cosmetic audio only: independent of the game's seeded randomness and dice results. */
export interface DiceSoundHandle {stop():void}

const MAX_VOICES=12;
const CLACK_SECONDS=.12;
let context:AudioContext|null=null;
let resumePending:Promise<void>=Promise.resolve();
let output:DynamicsCompressorNode|null=null;
let samples:AudioBuffer[]=[];
const voices=new Set<DiceSoundHandle>();

/** A noise-driven resonant click: a dry body knock followed by a much shorter bright edge. */
function clackBuffer(audio:AudioContext,variant:number):AudioBuffer {
  const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*CLACK_SECONDS),audio.sampleRate);
  const data=buffer.getChannelData(0);
  const modes=[520,1170,2430].map((frequency,index)=>{
    const decay=Math.exp(-1/(audio.sampleRate*(.009+index*.003)));
    return {a:2*decay*Math.cos(2*Math.PI*frequency*(.85+variant*.065)/audio.sampleRate),b:decay*decay,y1:0,y2:0};
  });
  let body=0,peak=0;
  for(let i=0;i<data.length;i++){
    const time=i/audio.sampleRate,noise=Math.random()*2-1;
    body+=.22*(noise-body);
    const excitation=noise*Math.exp(-time/.0016);
    let resonance=0;
    for(const mode of modes){
      const value=excitation+mode.a*mode.y1-mode.b*mode.y2;
      mode.y2=mode.y1;mode.y1=value;resonance+=value*.1;
    }
    const attack=Math.min(1,time/.00035);
    const value=attack*(body*Math.exp(-time/.009)*1.1+noise*Math.exp(-time/.0025)*.35+resonance*.18);
    data[i]=value;peak=Math.max(peak,Math.abs(value));
  }
  const scale=.68/Math.max(.001,peak);
  for(let i=0;i<data.length;i++)data[i]*=scale;
  return buffer;
}

/** Call directly from a trusted input event. Autoplay refusal is a silent presentation fallback. */
export function prepareDiceAudio():void {
  try{
    if(!context||context.state==='closed'){
      stopAllDiceAudio();
      const Constructor=globalThis.AudioContext??(typeof window!=='undefined'?(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext:undefined);
      if(!Constructor)return;
      context=new Constructor();resumePending=Promise.resolve();
      output=context.createDynamicsCompressor();
      output.threshold.value=-16;output.knee.value=14;output.ratio.value=12;
      output.attack.value=.001;output.release.value=.08;
      output.connect(context.destination);
      samples=Array.from({length:6},(_,index)=>clackBuffer(context!,index));
    }
    if(context.state==='suspended')resumePending=context.resume().catch(()=>{/* A later gesture can retry; old impacts are never queued. */});
  }catch{/* Audio support must never block combat or create an unhandled autoplay rejection. */}
}

/** Play one visible bounce. No context creation here, and no sound waits for browser unlock. */
export function playDiceImpact(strength:number,pan:number,volume:number):DiceSoundHandle|null {
  if(!context||!output||context.state!=='running'||samples.length===0)return null;
  if(!Number.isFinite(strength)||!Number.isFinite(volume)||strength<=0||volume<=0)return null;
  if(voices.size>=MAX_VOICES)voices.values().next().value?.stop();
  const nodes:AudioNode[]=[];
  let source:AudioBufferSourceNode|null=null;
  let finished=false;
  const cleanup=()=>{
    if(finished)return;
    finished=true;voices.delete(handle);
    for(const node of nodes){try{node.disconnect();}catch{/* Already disconnected by the browser. */}}
  };
  const handle:DiceSoundHandle={stop(){
    if(finished)return;
    if(source){source.onended=null;try{source.stop();}catch{/* The browser may have already ended this short sample. */}}
    cleanup();
  }};
  try{
    source=context.createBufferSource();nodes.push(source);
    source.buffer=samples[Math.floor(Math.random()*samples.length)];
    source.playbackRate.value=.92+Math.random()*.16;
    const gain=context.createGain();nodes.push(gain);
    // Keep a handful of dice present, but attenuate dense rolls before the shared compressor.
    gain.gain.value=.42*Math.min(1,volume)*Math.min(1,strength)/Math.sqrt(Math.max(1,voices.size/3));
    source.connect(gain);
    if(typeof context.createStereoPanner==='function'){
      const panner=context.createStereoPanner();nodes.push(panner);
      panner.pan.value=Number.isFinite(pan)?Math.max(-1,Math.min(1,pan))*.65:0;
      gain.connect(panner);panner.connect(output);
    }else gain.connect(output);
    source.onended=cleanup;
    voices.add(handle);source.start();
    for(const listener of diceListeners)listener();
    return handle;
  }catch{handle.stop();return null;}
}

/** Immediately silence current impacts when the throw is skipped, hidden, muted or disposed. */
export function stopAllDiceAudio():void {
  for(const voice of voices)voice.stop();
}

/** Shared cosmetic bus. Reading it never unlocks/creates audio or queues an event. */
export function preparedAudioBus():{context:AudioContext;output:AudioNode}|null {
 return context?.state==='running'&&output?{context,output}:null;
}
const diceListeners=new Set<()=>void>();
export function onDiceImpact(listener:()=>void):()=>void {diceListeners.add(listener);return()=>{diceListeners.delete(listener);};}

/** Explicit previews/music may await unlock; transient gameplay impacts never use this promise. */
export async function prepareCosmeticAudio():Promise<boolean>{prepareDiceAudio();await resumePending;const ready=preparedAudioBus()!==null;if(ready&&typeof window!=='undefined')window.dispatchEvent(new Event('eclipse-audio-ready'));return ready;}
