import {act,cleanup,renderHook} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {getFunctionName} from 'convex/server';
import type {PublicHistoryPage} from '../../shared/eclipse/history';
import {useSpectatorHistory} from '../second-dawn-session/useSpectatorHistory';
const mocks=vi.hoisted(()=>({latest:null as PublicHistoryPage|null,query:vi.fn(),subscription:vi.fn()}));
vi.mock('convex/react',()=>({useConvex:()=>({query:mocks.query}),useQuery:(ref:Parameters<typeof getFunctionName>[0],args:object|string)=>{mocks.subscription(getFunctionName(ref),args);return args==='skip'?undefined:mocks.latest;}}));
function page(high:number,low:number):PublicHistoryPage{return {entries:Array.from({length:high-low+1},(_,i)=>({revision:high-i,actorSeatId:'human',actorName:'Human',round:1,summary:'Passed',details:[]})),nextBeforeRevision:low>1?low:null};}
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('loads and paginates public history using only a room token',async()=>{
 mocks.latest=page(60,21);mocks.query.mockResolvedValueOnce(page(20,1));
 const {result}=renderHook(()=>useSpectatorHistory('watch-room'));
 expect(mocks.subscription).toHaveBeenCalledWith('eclipseRooms:getSpectatorHistory',{roomToken:'watch-room',limit:40});
 await act(async()=>result.current.loadOlder());
 expect(getFunctionName(mocks.query.mock.calls[0][0])).toBe('eclipseRooms:getSpectatorHistory');
 expect(mocks.query.mock.calls[0][1]).toEqual({roomToken:'watch-room',limit:40,beforeRevision:21});
 expect(result.current.entries).toHaveLength(60);expect(result.current.hasOlder).toBe(false);
});
it('drops cached and in-flight history after undo and room changes',async()=>{
 mocks.latest=page(80,41);let finish:(page:PublicHistoryPage)=>void=()=>{};
 mocks.query.mockImplementationOnce(()=>new Promise<PublicHistoryPage>(resolve=>{finish=resolve;}));
 const {result,rerender}=renderHook(({token,reset})=>useSpectatorHistory(token,reset),{initialProps:{token:'first',reset:0}});
 act(()=>result.current.loadOlder());mocks.latest=page(20,1);rerender({token:'first',reset:82});
 await act(async()=>finish(page(40,1)));
 expect(result.current.entries).toHaveLength(20);expect(result.current.hasOlder).toBe(false);
 mocks.latest=page(3,1);rerender({token:'second',reset:0});
 expect(result.current.entries.map(e=>e.revision)).toEqual([3,2,1]);
});
it('does not subscribe when spectator mode is inactive',()=>{
 const {result}=renderHook(()=>useSpectatorHistory(null));expect(result.current.entries).toEqual([]);
 expect(mocks.subscription).toHaveBeenCalledWith('eclipseRooms:getSpectatorHistory','skip');
});
