import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {loadHyperspaceChaseBuffer,HYPERSPACE_CHASE_SECONDS} from '../second-dawn-game/sound/hyperspaceChase';
import {synthesizeAmbient} from '../second-dawn-game/sound/synthesis';

function audioContext(){
 const buffer={duration:40};
 const parameter={value:1,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),cancelScheduledValues:vi.fn()};
 const source={buffer:null,loop:false,loopEnd:0,connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null as (()=>void)|null};
 const gain={gain:parameter,connect:vi.fn(),disconnect:vi.fn()};
 const decode=vi.fn().mockResolvedValue(buffer);
 const context={currentTime:4,decodeAudioData:decode,createBufferSource:()=>source,createGain:()=>gain};
 return {context:context as never,source,gain,decode,buffer};
}
beforeEach(()=>vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(8))})));
afterEach(()=>vi.unstubAllGlobals());

it('fetches and decodes the selected track once for concurrent callers and later repeats',async()=>{
 const {context,decode,buffer}=audioContext();
 const first=loadHyperspaceChaseBuffer(context),second=loadHyperspaceChaseBuffer(context);
 expect(second).toBe(first);expect(await first).toBe(buffer);expect(await loadHyperspaceChaseBuffer(context)).toBe(buffer);
 expect(fetch).toHaveBeenCalledOnce();expect(decode).toHaveBeenCalledOnce();expect(HYPERSPACE_CHASE_SECONDS).toBe(40);
});
it('evicts failed loading so the next user interaction can retry',async()=>{
 const {context}=audioContext();vi.mocked(fetch).mockResolvedValueOnce({ok:false,status:503} as Response);
 await expect(loadHyperspaceChaseBuffer(context)).rejects.toThrow();
 await expect(loadHyperspaceChaseBuffer(context)).resolves.toBeDefined();expect(fetch).toHaveBeenCalledTimes(2);
});
it('defers playback until decoding completes, then loops exactly twenty 120 BPM bars',async()=>{
 const {context,source,buffer}=audioContext();synthesizeAmbient(context,{} as AudioNode);
 expect(source.start).not.toHaveBeenCalled();await loadHyperspaceChaseBuffer(context);
 expect(source.buffer).toBe(buffer);expect(source.loop).toBe(true);expect(source.loopEnd).toBe(40);expect(source.start).toHaveBeenCalledOnce();
});
it('does not start stale music after stopping during a pending download',async()=>{
 const {context,source,gain}=audioContext();let finish:(value:Response)=>void=()=>{};
 vi.mocked(fetch).mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));const ended=vi.fn();
 const handle=synthesizeAmbient(context,{} as AudioNode,ended);handle.stop(.25);
 finish({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(8))} as Response);await loadHyperspaceChaseBuffer(context);
 expect(source.start).not.toHaveBeenCalled();expect(source.stop).not.toHaveBeenCalled();expect(gain.disconnect).toHaveBeenCalledOnce();expect(ended).toHaveBeenCalledOnce();
});
it('releases failed downloads once without unhandled rejection or a retry loop',async()=>{
 const {context,source,gain}=audioContext();vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));const ended=vi.fn();
 synthesizeAmbient(context,{} as AudioNode,ended);await expect(loadHyperspaceChaseBuffer(context)).rejects.toThrow('offline');
 expect(source.start).not.toHaveBeenCalled();expect(gain.disconnect).toHaveBeenCalledOnce();expect(ended).toHaveBeenCalledOnce();expect(fetch).toHaveBeenCalledOnce();
});
it('frees an immediately stopped playing source exactly once',async()=>{
 const {context,source,gain}=audioContext();const ended=vi.fn();const handle=synthesizeAmbient(context,{} as AudioNode,ended);
 await loadHyperspaceChaseBuffer(context);handle.stop();handle.stop();
 expect(source.stop).toHaveBeenCalledOnce();expect(source.disconnect).toHaveBeenCalledOnce();expect(gain.disconnect).toHaveBeenCalledOnce();expect(ended).toHaveBeenCalledOnce();
});
it('keeps a playing source connected through the fade and cleans it up on ended',async()=>{
 const {context,source,gain}=audioContext();const ended=vi.fn();const handle=synthesizeAmbient(context,{} as AudioNode,ended);
 await loadHyperspaceChaseBuffer(context);handle.stop(.25);
 expect(source.stop).toHaveBeenCalledWith(4.25);expect(gain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0,4.25);
 expect(source.disconnect).not.toHaveBeenCalled();source.onended?.();source.onended?.();expect(ended).toHaveBeenCalledOnce();
});
