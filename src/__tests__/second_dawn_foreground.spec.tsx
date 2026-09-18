import {act,renderHook,waitFor} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import {useForegroundMatch} from '../second-dawn-session/useForegroundMatch';
afterEach(()=>vi.restoreAllMocks());
it('refreshes on foreground, blocks submissions until the subscribed revision catches up, and preserves explicit recap boundaries',async()=>{
 const refresh=vi.fn().mockResolvedValue({revision:8,lastSeenRevision:3});const resume=vi.fn();
 const {result,rerender}=renderHook(({revision})=>useForegroundMatch({key:'match',connected:true,revision,refresh,onResume:resume}),{initialProps:{revision:3}});
 expect(refresh).not.toHaveBeenCalled();
 vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');act(()=>document.dispatchEvent(new Event('visibilitychange')));
 vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');await act(async()=>document.dispatchEvent(new Event('visibilitychange')));
 expect(refresh).toHaveBeenCalledOnce();expect(resume).toHaveBeenCalledWith({revision:8,lastSeenRevision:3});expect(result.current.ready).toBe(false);
 rerender({revision:8});expect(result.current.ready).toBe(true);
});
it('never uses a completed foreground request from a previous match and offers recovery after a failed refresh',async()=>{
 let resolve:(value:{revision:number;lastSeenRevision:null})=>void=()=>{};
 const refresh=vi.fn(()=>new Promise<{revision:number;lastSeenRevision:null}>(r=>resolve=r));const resume=vi.fn();
 const {result,rerender}=renderHook(({key})=>useForegroundMatch({key,connected:true,revision:0,refresh,onResume:resume}),{initialProps:{key:'a'}});
 act(()=>result.current.retry());rerender({key:'b'});
 await act(async()=>resolve({revision:20,lastSeenRevision:null}));expect(resume).not.toHaveBeenCalled();expect(result.current.ready).toBe(true);
 refresh.mockRejectedValueOnce(new Error('Server unavailable'));
 await act(async()=>result.current.retry());expect(result.current.error).toBe('Server unavailable');expect(result.current.ready).toBe(false);
 refresh.mockResolvedValueOnce({revision:0,lastSeenRevision:null});await act(async()=>result.current.retry());await waitFor(()=>expect(result.current.ready).toBe(true));
});
