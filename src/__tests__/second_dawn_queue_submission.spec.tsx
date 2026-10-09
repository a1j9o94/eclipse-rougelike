import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {getFunctionName,type FunctionReference} from 'convex/server';
import type {GameCommand} from '../../shared/eclipse/types';
import SecondDawnGame from '../second-dawn-game/SecondDawnGame';
const data=vi.hoisted(()=>({credential:`ecl1_${'a'.repeat(64)}`,queue:vi.fn(),submit:vi.fn(),matchId:'test-match',revision:10,receipts:[] as Array<{revision:number}|undefined>,receipt:undefined as {revision:number;type:GameCommand['type']}|undefined}));
vi.mock('convex/react',()=>({
 useConvex:()=>({}),useConvexConnectionState:()=>({isWebSocketConnected:true}),useAction:()=>vi.fn(),
 useMutation:(reference:FunctionReference<'mutation'>)=>getFunctionName(reference)==='eclipseMatches:queueCommand'?data.queue:data.submit,
 useQuery:(reference:FunctionReference<'query'>,args:'skip'|object)=>{
  if(args==='skip')return undefined;
  switch(getFunctionName(reference)){
   case 'eclipseGuests:getGuestSession':return {};
   case 'eclipsePlayerStore:getPlayerProfile':return null;
   case 'eclipseMatches:listMyMatches':return [];
   case 'eclipseRooms:listMyRooms':return [];
   case 'eclipseRooms:getRoom':return {matchId:data.matchId,viewerSlot:1};
   case 'eclipseMatches:getMatchView':return {revision:data.revision,lastSeenRevision:data.revision,phase:'action',seats:[],viewerSeatId:'seat-1',playerNames:{},multiplayer:null,lastExecutedQueuedCommand:data.receipt,queuedAction:null};
   default:return undefined;
  }
 }
}));
vi.mock('../second-dawn-session/useMatchHistory',()=>({useMatchHistory:()=>({})}));
vi.mock('../../shared/eclipse/legal',()=>({legalCommands:()=>[]}));
vi.mock('../second-dawn-game/SecondDawnBoard',()=>({default:({onQueue,lastAcceptedCommand,status}:{onQueue:(command:GameCommand|null)=>void;lastAcceptedCommand?:{revision:number};status:string})=>{data.receipts.push(lastAcceptedCommand);return <div><button onClick={()=>onQueue({type:'build',builds:[{component:'interceptor',sectorId:'yard'}]})}>Queue build</button><button onClick={()=>onQueue(null)}>Cancel queue</button><output>{status}</output><span>Accepted revision {lastAcceptedCommand?.revision??'none'}</span></div>;}}));
vi.mock('../second-dawn-game/PlayerAccessPanel',()=>({default:()=>null}));
vi.mock('../second-dawn-game/RoomLobby',()=>({default:()=>null,RoomSettingsEditor:()=>null}));
beforeEach(()=>{vi.clearAllMocks();data.receipt=undefined;data.matchId='test-match';data.revision=10;data.receipts=[];data.queue.mockResolvedValue({ok:true,duplicate:false});localStorage.setItem('eclipse.second-dawn.guest.v1',data.credential);window.history.replaceState({},'', '/room/test-room');});
afterEach(()=>{cleanup();localStorage.clear();window.history.replaceState({},'', '/');});
it('saves and cancels a server queue without submitting an action or an accepted execution receipt',async()=>{
 render(<SecondDawnGame/>);fireEvent.click(await screen.findByRole('button',{name:'Queue build'}));
 await waitFor(()=>expect(data.queue).toHaveBeenCalledOnce());
 expect(data.queue).toHaveBeenCalledWith({credential:data.credential,matchId:'test-match',commandId:expect.any(String),expectedRevision:10,command:{type:'build',builds:[{component:'interceptor',sectorId:'yard'}]}});
 await screen.findByText('Queued · will execute on your turn.');expect(screen.getByText('Accepted revision none')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Cancel queue'}));await screen.findByText('Queued action canceled.');expect(data.queue.mock.calls[1][0].command).toBeNull();expect(data.submit).not.toHaveBeenCalled();
});
it('reuses the confirmation ID after a lost response',async()=>{
 data.queue.mockRejectedValueOnce(new Error('Connection interrupted'));
 render(<SecondDawnGame/>);fireEvent.click(await screen.findByRole('button',{name:'Queue build'}));await screen.findByText(/Retry the same choice/);
 const first=data.queue.mock.calls[0][0];fireEvent.click(screen.getByRole('button',{name:'Queue build'}));await screen.findByText('Queued · will execute on your turn.');expect(data.queue.mock.calls[1][0]).toEqual(first);expect(data.submit).not.toHaveBeenCalled();
});
it('passes the server execution receipt to the board on reconnect without resubmitting',async()=>{
 data.receipt={revision:9,type:'build'};render(<SecondDawnGame/>);expect(await screen.findByText('Accepted revision 9')).toBeVisible();expect(data.queue).not.toHaveBeenCalled();expect(data.submit).not.toHaveBeenCalled();
});

it('keeps the server receipt identity stable across unrelated board revisions',async()=>{
 data.receipt={revision:9,type:'build'};const ui=render(<SecondDawnGame/>);await screen.findByText('Accepted revision 9');const receipt=data.receipts.at(-1);
 data.revision=11;data.receipt={revision:9,type:'build'};ui.rerender(<SecondDawnGame/>);expect(data.receipts.at(-1)).toBe(receipt);
});
it('does not reuse a lost-response queue request in another match',async()=>{
 data.queue.mockRejectedValueOnce(new Error('Connection interrupted'));const ui=render(<SecondDawnGame/>);fireEvent.click(await screen.findByRole('button',{name:'Queue build'}));await screen.findByText(/Retry the same choice/);const first=data.queue.mock.calls[0][0];
 data.matchId='other-match';data.revision=20;ui.rerender(<SecondDawnGame/>);await waitFor(()=>expect(localStorage.getItem('eclipse.second-dawn.match.v1')).toBe('other-match'));
 fireEvent.click(screen.getByRole('button',{name:'Queue build'}));await screen.findByText('Queued · will execute on your turn.');expect(data.queue.mock.calls[1][0]).toMatchObject({matchId:'other-match',expectedRevision:20});expect(data.queue.mock.calls[1][0].commandId).not.toBe(first.commandId);
});
