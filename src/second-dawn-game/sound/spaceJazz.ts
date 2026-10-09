/** Original 32-bar space lounge arrangement. Cosmetic noise is isolated from game RNG. */
export const SPACE_JAZZ_BPM=112;
const BEAT=60/SPACE_JAZZ_BPM,BARS=32,SWING=.62;
export const SPACE_JAZZ_SECONDS=BARS*4*BEAT;
const buffers=new WeakMap<BaseAudioContext,AudioBuffer>();
type Instrument='keys'|'bass'|'lead'|'bell';
interface Harmony {bass:number;keys:readonly number[];walk:readonly number[]}
// Cmaj9, A13, Dm9, G13; a minor-subdominant bridge adds lounge colour.
const A:readonly Harmony[]=[
 {bass:36,keys:[52,59,62,67],walk:[36,40,43,44]},
 {bass:33,keys:[55,61,66,71],walk:[33,37,40,37]},
 {bass:38,keys:[53,60,64,69],walk:[38,41,45,44]},
 {bass:31,keys:[53,59,64,69],walk:[31,35,38,35]},
 {bass:36,keys:[52,59,62,67],walk:[36,40,43,42]},
 {bass:33,keys:[55,60,64,71],walk:[33,36,40,37]},
 {bass:38,keys:[53,60,64,69],walk:[38,41,45,44]},
 {bass:31,keys:[53,59,64,69],walk:[31,38,41,35]},
];
const BRIDGE:readonly Harmony[]=[
 {bass:29,keys:[52,57,60,67],walk:[29,33,36,35]},
 {bass:29,keys:[51,56,60,67],walk:[29,32,36,39]},
 {bass:28,keys:[50,55,59,66],walk:[28,31,35,32]},
 A[1],A[2],A[3],A[0],A[7],
];
// Each pair is a swung eighth-note position and MIDI note; spaces leave room for decisions.
const MELODY:readonly (readonly (readonly [number,number])[])[]=[
 [[1,67],[2,71],[3,74],[5,76],[6,74]],
 [[0,73],[2,71],[3,69],[5,66]],
 [[1,69],[2,72],[4,76],[5,77],[7,76]],
 [[0,74],[3,71],[4,69],[6,67]],
 [[0,64],[1,67],[3,71],[5,74]],
 [[1,72],[3,71],[4,69],[6,67]],
 [[0,65],[2,69],[3,72],[5,76],[6,74]],
 [[1,71],[2,69],[4,67],[7,62]],
];
const hz=(note:number)=>440*2**((note-69)/12);
const swung=(eighth:number)=>Math.floor(eighth/2)+(eighth%2)*SWING;

/** Render once at <=24 kHz: small cached stereo buffer, one live source, no note timers. */
export function createSpaceJazzBuffer(context:BaseAudioContext):AudioBuffer{
 const cached=buffers.get(context);if(cached)return cached;
 const rate=Math.min(24000,context.sampleRate),length=Math.round(SPACE_JAZZ_SECONDS*rate);
 const buffer=context.createBuffer(2,length,rate),left=buffer.getChannelData(0),right=buffer.getChannelData(1);
 const notes=new Map<string,Float32Array>();
 let seed=83179;
 const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 const mix=(index:number,value:number,pan:number)=>{
  const i=index%length;left[i]+=value*(1-pan)*.5;right[i]+=value*(1+pan)*.5;
 };
 function note(at:number,midi:number,duration:number,velocity:number,instrument:Instrument,pan:number){
  const start=Math.round(at*rate),count=Math.ceil(duration*rate),frequency=hz(midi),attack=instrument==='lead'?.018:.004;
  const key=`${instrument}:${midi}:${count}`;
  let waveform=notes.get(key);
  if(!waveform){
   waveform=new Float32Array(count);
   for(let i=0;i<count;i++){
   const t=i/rate,phase=2*Math.PI*frequency*t;
   const release=Math.min(1,(duration-t)/.045),onset=Math.min(1,t/attack);
   let sample:number;
   if(instrument==='keys')sample=(Math.sin(phase+1.2*Math.exp(-t*9)*Math.sin(phase*2))+.22*Math.sin(phase*2)*Math.exp(-t*5))*Math.exp(-t*3.4);
   else if(instrument==='bass')sample=(Math.sin(phase)+.3*Math.sin(phase*2)*Math.exp(-t*8)+.13*Math.sin(phase*3)*Math.exp(-t*12))*Math.exp(-t*3);
   else if(instrument==='bell')sample=(Math.sin(phase)+.25*Math.sin(phase*4))*Math.exp(-t*5)*(1+.1*Math.sin(2*Math.PI*6*t));
   else{const vibrato=.018*Math.sin(2*Math.PI*5.3*t)*Math.min(1,t/.15);sample=(Math.sin(phase+vibrato)+.24*Math.sin(phase*2)+.09*Math.sin(phase*3))*(.85+.15*Math.exp(-t*8));}
    waveform[i]=sample*onset*release;
   }
   notes.set(key,waveform);
  }
  for(let i=0;i<count;i++){
   const value=waveform[i]*velocity;mix(start+i,value,pan);
   if(instrument==='keys'||instrument==='lead'||instrument==='bell'){
    mix(start+i+Math.round(BEAT*.75*rate),value*.13,-pan);
    mix(start+i+Math.round(BEAT*1.5*rate),value*.05,pan);
   }
  }
 }
 function drum(at:number,kind:'kick'|'brush'|'hat',velocity:number){
  const duration=kind==='kick'?.19:kind==='brush'?.13:.045,count=Math.ceil(duration*rate),start=Math.round(at*rate);
  let low=0,previous=0;
  for(let i=0;i<count;i++){
   const t=i/rate,n=noise();low+=.18*(n-low);
   const sample=kind==='kick'?Math.sin(2*Math.PI*(48*t+3*(1-Math.exp(-t*30))))*Math.exp(-t*25):kind==='brush'?(low*.8+(n-previous)*.12)*Math.exp(-t*27):(n-previous)*.2*Math.exp(-t*95);
   previous=n;mix(start+i,sample*Math.min(1,t/.002)*Math.min(1,(duration-t)/.008)*velocity,kind==='hat'?.3:kind==='brush'?-.15:0);
  }
 }
 for(let bar=0;bar<BARS;bar++){
  const section=Math.floor(bar/8),phrase=bar%8,harmony=(section===2?BRIDGE:A)[phrase],at=bar*4*BEAT;
  for(let beat=0;beat<4;beat++){
   note(at+beat*BEAT,harmony.walk[beat],BEAT*.86,.19, 'bass',-.08);
   drum(at+beat*BEAT,'kick',beat===0||beat===2?.13:.045);
   if(beat===1||beat===3)drum(at+beat*BEAT+.008,'brush',.16);
   drum(at+beat*BEAT,'hat',.07);drum(at+(beat+SWING)*BEAT,'hat',.045);
  }
  const comp=phrase%2===0?[0,1+SWING,3]:[SWING,2,3+SWING];
  for(const beat of comp)for(const [voice,midi] of harmony.keys.entries())note(at+beat*BEAT+voice*.009,midi,BEAT*1.6,.062,'keys',-.35+voice*.13);
  if(section!==2){
   for(const [index,[eighth,midi]] of MELODY[phrase].entries()){
    const next=MELODY[phrase][index+1]?.[0]??8,duration=Math.min(.65,(swung(next)-swung(eighth))*BEAT*.78);
    note(at+swung(eighth)*BEAT+.012,midi+(section===1&&phrase>=4?-12:0),duration,section===1?.085:.1,'lead',.22);
   }
  }else{
   // Bridge trades the horn motif for spacious electric-key answers and starry bells.
   for(const beat of [SWING,2+SWING])note(at+beat*BEAT,harmony.keys[beat<2?2:3]+12,BEAT*.75,.075,'bell',beat<2?-.4:.4);
  }
  if(phrase===3||phrase===7)note(at+(3+SWING)*BEAT,harmony.keys[3]+12,BEAT*1.5,.045,'bell',-.4);
 }
 // Remove DC and set a fixed peak ceiling; tails wrap into the opening for a continuous loop.
 let peak=0;
 for(const channel of [left,right]){
  let total=0;for(const value of channel)total+=value;const mean=total/length;
  for(let i=0;i<length;i++){channel[i]-=mean;peak=Math.max(peak,Math.abs(channel[i]));}
 }
 const scale=.55/Math.max(.01,peak);
 for(let i=0;i<length;i++){left[i]*=scale;right[i]*=scale;}
 buffers.set(context,buffer);return buffer;
}
