import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

class FakeParam {
  value=0;
  setValueAtTime=vi.fn((value:number)=>{this.value=value;});
}
class FakeNode {
  connect=vi.fn();
  disconnect=vi.fn();
}
class FakeSource extends FakeNode {
  buffer:FakeBuffer|null=null;
  playbackRate=new FakeParam();
  onended:(()=>void)|null=null;
  start=vi.fn();
  stop=vi.fn();
}
class FakeBuffer {
  data=new Float32Array(5292);
  getChannelData(){return this.data;}
}
class FakeContext {
  static instances:FakeContext[]=[];
  static initialState='running';
  state=FakeContext.initialState;
  currentTime=2;
  sampleRate=44100;
  destination=new FakeNode();
  sources:FakeSource[]=[];
  gains:Array<FakeNode & {gain:FakeParam}>=[];
  buffers:FakeBuffer[]=[];
  resume=vi.fn(()=>Promise.resolve());
  constructor(){FakeContext.instances.push(this);}
  createBuffer(){const buffer=new FakeBuffer();this.buffers.push(buffer);return buffer;}
  createBufferSource(){const source=new FakeSource();this.sources.push(source);return source;}
  createGain(){const gain=Object.assign(new FakeNode(),{gain:new FakeParam()});this.gains.push(gain);return gain;}
  createStereoPanner(){return Object.assign(new FakeNode(),{pan:new FakeParam()});}
  createDynamicsCompressor(){return Object.assign(new FakeNode(),{threshold:new FakeParam(),knee:new FakeParam(),ratio:new FakeParam(),attack:new FakeParam(),release:new FakeParam()});}
}

beforeEach(()=>{
  vi.resetModules();
  FakeContext.instances=[];FakeContext.initialState='running';
  vi.stubGlobal('AudioContext',FakeContext);
});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('cosmetic dice impact audio',()=>{
  it('stays silent until prepared by a user gesture and when audio is unavailable',async()=>{
    const audio=await import('../second-dawn-game/dice3d/audio');
    expect(audio.playDiceImpact(1,0,.5)).toBeNull();
    expect(FakeContext.instances).toHaveLength(0);
    vi.stubGlobal('AudioContext',undefined);
    expect(()=>audio.prepareDiceAudio()).not.toThrow();
    expect(audio.playDiceImpact(1,0,.5)).toBeNull();
  });
  it('does not queue blocked impacts or leak a rejected resume promise',async()=>{
    FakeContext.initialState='suspended';
    const audio=await import('../second-dawn-game/dice3d/audio');
    audio.prepareDiceAudio();
    const context=FakeContext.instances[0];
    context.resume.mockRejectedValue(new Error('autoplay blocked'));
    audio.prepareDiceAudio();
    expect(audio.playDiceImpact(1,0,.5)).toBeNull();
    await Promise.resolve();await Promise.resolve();
    context.state='running';
    expect(context.sources).toHaveLength(0);
    expect(audio.playDiceImpact(1,0,.5)).not.toBeNull();
  });
  it('makes finite, varied, short decaying noise buffers and safely bounded gain',async()=>{
    const audio=await import('../second-dawn-game/dice3d/audio');
    audio.prepareDiceAudio();
    const context=FakeContext.instances[0];
    audio.playDiceImpact(20,20,20);
    expect(context.sources).toHaveLength(1);
    expect(context.buffers.length).toBeGreaterThan(1);
    for(const buffer of context.buffers){
      expect(buffer.data.every(Number.isFinite)).toBe(true);
      expect(Math.max(...buffer.data.map(Math.abs))).toBeLessThanOrEqual(.8);
      const energy=(values:Float32Array)=>values.reduce((sum,value)=>sum+value*value,0)/values.length;
      expect(energy(buffer.data.slice(-1000))).toBeLessThan(energy(buffer.data.slice(0,1000))*.03);
    }
    expect(context.buffers[0].data).not.toEqual(context.buffers[1].data);
    expect(context.gains.every(node=>node.gain.value>=0&&node.gain.value<=1)).toBe(true);
    for(const invalid of [0,-1,NaN,Infinity])expect(audio.playDiceImpact(1,0,invalid)).toBeNull();
    expect(context.sources).toHaveLength(1);
  });
  it('reuses the prepared context and cleans nodes if playback fails',async()=>{
    const audio=await import('../second-dawn-game/dice3d/audio');
    audio.prepareDiceAudio();audio.prepareDiceAudio();
    expect(FakeContext.instances).toHaveLength(1);
    const context=FakeContext.instances[0];
    const createSource=context.createBufferSource.bind(context);
    vi.spyOn(context,'createBufferSource').mockImplementation(()=>{
      const source=createSource();source.start.mockImplementation(()=>{throw new Error('device unavailable');});return source;
    });
    expect(audio.playDiceImpact(1,0,.5)).toBeNull();
    expect(context.sources[0].disconnect).toHaveBeenCalledTimes(1);
    expect(context.gains.at(-1)?.disconnect).toHaveBeenCalledTimes(1);
    expect(()=>audio.stopAllDiceAudio()).not.toThrow();
  });
  it('bounds concurrent voices and cleans stopped or naturally ended nodes exactly once',async()=>{
    const audio=await import('../second-dawn-game/dice3d/audio');
    audio.prepareDiceAudio();
    const first=audio.playDiceImpact(1,0,.5);
    const context=FakeContext.instances[0];
    first?.stop();first?.stop();
    expect(context.sources[0].stop).toHaveBeenCalledTimes(1);
    expect(context.sources[0].disconnect).toHaveBeenCalledTimes(1);
    for(let i=0;i<100;i++)audio.playDiceImpact(1,0,.5);
    expect(context.sources.filter(source=>source.disconnect.mock.calls.length===0).length).toBeLessThanOrEqual(12);
    const latest=context.sources.at(-1)!;
    latest.onended?.();
    expect(latest.disconnect).toHaveBeenCalledTimes(1);
    audio.stopAllDiceAudio();audio.stopAllDiceAudio();
    expect(context.sources.every(source=>source.disconnect.mock.calls.length===1)).toBe(true);
  });
});
