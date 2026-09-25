import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {getFunctionName,type FunctionReference} from 'convex/server';
import SecondDawnGame from '../second-dawn-game/SecondDawnGame';
import type {MultiplayerRoomLobby} from '../../shared/eclipse/multiplayer';
const fixture=vi.hoisted(()=>({credential:`ecl1_${'a'.repeat(64)}`,status:'started',viewerSlot:null as number|null,issueGuest:vi.fn(),queries:vi.fn()}));
vi.mock('convex/react',()=>({
 useConvex:()=>({}),useConvexConnectionState:()=>({isWebSocketConnected:true}),
 useAction:(reference:FunctionReference<'action'>)=>getFunctionName(reference)==='eclipsePlayers:loginPlayer'?async()=>{fixture.viewerSlot=1;return {credential:fixture.credential};}:fixture.issueGuest,useMutation:()=>vi.fn(),
 useQuery:(reference:FunctionReference<'query'>,args:'skip'|object)=>{
  if(args==='skip')return undefined;
  const name=getFunctionName(reference);fixture.queries(name,args);
  switch(name){
   case 'eclipseGuests:getGuestSession':return {};
   case 'eclipsePlayerStore:getPlayerProfile':return null;
   case 'eclipseMatches:listMyMatches':case 'eclipseRooms:listMyRooms':return [];
   case 'eclipseRooms:getRoom':return {roomToken:'public-room',status:fixture.status,matchId:fixture.status==='waiting'?null:'match-test',viewerSlot:fixture.viewerSlot};
   case 'eclipseMatches:getMatchView':return {seats:[],viewerSeatId:'seat-1',playerNames:{},multiplayer:null};
   case 'eclipseRooms:getSpectatorView':return {kind:'spectator',revision:7,seats:[],historyResetRevision:0};
   default:return undefined;
  }
 }
}));
vi.mock('../second-dawn-session/useMatchHistory',()=>({useMatchHistory:()=>({})}));
vi.mock('../second-dawn-session/useSpectatorHistory',()=>({useSpectatorHistory:()=>({entries:[]})}));
vi.mock('../../shared/eclipse/legal',()=>({legalCommands:()=>[]}));
vi.mock('../second-dawn-game/SpectatorBoard',()=>({default:({onRoom}:{onRoom:()=>void})=><><h1>Spectating the galaxy</h1><button onClick={onRoom}>Room</button></>}));
vi.mock('../second-dawn-game/SecondDawnBoard',()=>({default:()=> <h1>Playing my seat</h1>}));
vi.mock('../second-dawn-game/RoomLobby',()=>({default:({lobby,onEnter}:{lobby:MultiplayerRoomLobby;onEnter:()=>void})=><><p>Room overview: {lobby.status}</p>{lobby.status!=='waiting'&&<button onClick={onEnter}>Watch game</button>}</>,RoomSettingsEditor:()=>null}));
beforeEach(()=>{fixture.status='started';fixture.viewerSlot=null;fixture.queries.mockClear();fixture.issueGuest.mockReset().mockReturnValue(new Promise(()=>{}));window.history.replaceState({},'', '/room/public-room');});
afterEach(()=>{cleanup();localStorage.clear();window.history.replaceState({},'', '/');});
it('opens a public board without creating a guest or requesting a private player view',async()=>{
 render(<SecondDawnGame/>);
 expect(await screen.findByRole('heading',{name:'Spectating the galaxy'})).toBeVisible();
 expect(fixture.issueGuest).not.toHaveBeenCalled();
 expect(fixture.queries).toHaveBeenCalledWith('eclipseRooms:getSpectatorView',{roomToken:'public-room'});
 expect(fixture.queries.mock.calls.some(([name])=>name==='eclipseMatches:getMatchView')).toBe(false);
});
it('keeps waiting visitors in the lobby then opens spectating when the game starts',async()=>{
 fixture.status='waiting';const {rerender}=render(<SecondDawnGame/>);
 expect(screen.getByText('Room overview: waiting')).toBeVisible();
 expect(screen.queryByRole('heading',{name:'Spectating the galaxy'})).not.toBeInTheDocument();
 fixture.status='started';rerender(<SecondDawnGame/>);
 expect(await screen.findByRole('heading',{name:'Spectating the galaxy'})).toBeVisible();
});
it('lets a spectator view the room and return to a finished board',async()=>{
 fixture.status='finished';render(<SecondDawnGame/>);
 fireEvent.click(await screen.findByRole('button',{name:'Room'}));
 expect(screen.getByText('Room overview: finished')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Watch game'}));
 expect(screen.getByRole('heading',{name:'Spectating the galaxy'})).toBeVisible();
});
it('opens an owned seat normally and never requests the spectator board',async()=>{
 fixture.viewerSlot=1;localStorage.setItem('eclipse.second-dawn.guest.v1',fixture.credential);render(<SecondDawnGame/>);
 await waitFor(()=>expect(screen.getByRole('heading',{name:'Playing my seat'})).toBeVisible());
 expect(fixture.queries.mock.calls.some(([name])=>name==='eclipseRooms:getSpectatorView')).toBe(false);
});

it('lets a returning player sign in from a spectator room without first creating a guest',async()=>{
 render(<SecondDawnGame/>);fireEvent.click(await screen.findByRole('button',{name:'Room'}));
 expect(screen.getByRole('button',{name:'Save player profile'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Sign in'}));
 fireEvent.change(screen.getByRole('textbox',{name:'Player username'}),{target:{value:'Pilot'}});
 fireEvent.change(screen.getByLabelText('PIN or recovery code'),{target:{value:'123456'}});
 fireEvent.click(screen.getByRole('button',{name:'Continue as player'}));
 expect(await screen.findByRole('heading',{name:'Playing my seat'})).toBeVisible();
 expect(fixture.issueGuest).not.toHaveBeenCalled();
});
