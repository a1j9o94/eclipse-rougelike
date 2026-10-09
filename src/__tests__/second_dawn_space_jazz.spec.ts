import {expect,it,vi} from 'vitest';
import {createSpaceJazzBuffer,SPACE_JAZZ_SECONDS} from '../second-dawn-game/sound/spaceJazz';
import {synthesizeAmbient} from '../second-dawn-game/sound/synthesis';

function audioContext(){
 const channels:Float32Array[]=[];
 const parameter={value:1,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),cancelScheduledValues:vi.fn()};
 const source={buffer:null,loop:false,connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null as (()=>void)|null};
 const gain={gain:parameter,connect:vi.fn(),disconnect:vi.fn()};
 const context={sampleRate:8000,currentTime:4,createBuffer:vi.fn((count:number,length:number,sampleRate:number)=>{
  for(let i=0;i<count;i++)channels[i]=new Float32Array(length);
  return {length,sampleRate,duration:length/sampleRate,getChannelData:(i:number)=>channels[i]};
 }),createBufferSource:()=>source,createGain:()=>gain};
 return {context:context as never,source,gain,channels};
}

it('renders an audible, finite stereo arrangement with headroom and no silent loop boundary',()=>{
 const {context,channels}=audioContext();const buffer=createSpaceJazzBuffer(context);
 expect(buffer.duration).toBeCloseTo(SPACE_JAZZ_SECONDS,3);
 let peak=0,energy=0,stereoDifference=0,boundaryJump=0,finite=true;
 for(const channel of channels){
  for(const value of channel){finite&&=Number.isFinite(value);peak=Math.max(peak,Math.abs(value));energy+=value*value;}
  boundaryJump=Math.max(boundaryJump,Math.abs(channel[0]-channel[channel.length-1]));
  for(const offset of [0,channel.length-800])expect(channel.slice(offset,offset+800).some(value=>Math.abs(value)>.01)).toBe(true);
 }
 for(let i=0;i<channels[0].length;i++)stereoDifference+=Math.abs(channels[0][i]-channels[1][i]);
 expect(finite).toBe(true);expect(peak).toBeGreaterThan(.2);expect(peak).toBeLessThan(.7);
 expect(Math.sqrt(energy/(buffer.length*2))).toBeGreaterThan(.025);
 expect(stereoDifference/buffer.length).toBeGreaterThan(.001);expect(boundaryJump).toBeLessThan(.08);
 expect(createSpaceJazzBuffer(context)).toBe(buffer);
});

it('loops one source and frees it exactly once when immediately stopped',()=>{
 const {context,source,gain}=audioContext();const ended=vi.fn();
 const handle=synthesizeAmbient(context,{} as AudioNode,ended);
 expect(source.loop).toBe(true);expect(source.start).toHaveBeenCalledOnce();
 expect(source.stop).not.toHaveBeenCalled();handle.stop();handle.stop();
 expect(source.stop).toHaveBeenCalledOnce();expect(source.disconnect).toHaveBeenCalledOnce();expect(gain.disconnect).toHaveBeenCalledOnce();expect(ended).toHaveBeenCalledOnce();
});

it('keeps the source connected through a fade, then cleans up once on ended',()=>{
 const {context,source,gain}=audioContext();const ended=vi.fn();
 const handle=synthesizeAmbient(context,{} as AudioNode,ended);handle.stop(.25);
 expect(source.stop).toHaveBeenCalledWith(4.25);expect(gain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0,4.25);
 expect(source.disconnect).not.toHaveBeenCalled();source.onended?.();source.onended?.();
 expect(ended).toHaveBeenCalledOnce();expect(source.disconnect).toHaveBeenCalledOnce();
});
