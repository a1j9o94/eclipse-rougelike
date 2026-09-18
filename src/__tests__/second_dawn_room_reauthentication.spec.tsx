import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {getFunctionName} from 'convex/server';
import type {FunctionReference} from 'convex/server';
import type {PlayerAccessPanelProps} from '../second-dawn-game/PlayerAccessPanel';
import SecondDawnGame from '../second-dawn-game/SecondDawnGame';
const data=vi.hoisted(()=>({old:`ecl1_${'a'.repeat(64)}`,next:`ecl1_${'b'.repeat(64)}`}));
vi.mock('convex/react',()=>({
 useConvex:()=>({}),useConvexConnectionState:()=>({isWebSocketConnected:true}),
 useAction:()=>async()=>({credential:data.next}),useMutation:()=>vi.fn(),
 useQuery:(reference:FunctionReference<'query'>,args:'skip'|object)=>{
  if(args==='skip')return undefined;
  switch(getFunctionName(reference)){
   case 'eclipseGuests:getGuestSession':return {};
   case 'eclipsePlayerStore:getPlayerProfile':return {username:'Pilot',pinEnabled:false};
   case 'eclipseMatches:listMyMatches':case 'eclipseRooms:listMyRooms':return [];
   case 'eclipseRooms:getRoom':return {matchId:'match-test',viewerSlot:1};
   case 'eclipseMatches:getMatchView':return {seats:[],viewerSeatId:'seat-1',playerNames:{},multiplayer:null};
   default:return undefined;
  }
 }
}));
vi.mock('../second-dawn-session/useMatchHistory',()=>({useMatchHistory:()=>({})}));
vi.mock('../../shared/eclipse/legal',()=>({legalCommands:()=>[]}));
vi.mock('../second-dawn-game/SecondDawnBoard',()=>({default:({onMenu}:{onMenu:()=>void})=><div><h1>Saved galaxy</h1><button onClick={onMenu}>Game room</button></div>}));
vi.mock('../second-dawn-game/RoomLobby',()=>({default:()=> <p>Room overview</p>,RoomSettingsEditor:()=>null}));
vi.mock('../second-dawn-game/PlayerAccessPanel',()=>({default:({onLogin,onPreviousPlayer}:PlayerAccessPanelProps)=><><button onClick={()=>{void onLogin('Pilot','secret');}}>Sign in again</button>{onPreviousPlayer&&<button onClick={onPreviousPlayer}>Restore browser player</button>}</>}));
afterEach(()=>{cleanup();localStorage.clear();window.history.replaceState({},'', '/');});
it('reopens the same room seat after refreshing its player credential',async()=>{
 localStorage.setItem('eclipse.second-dawn.guest.v1',data.old);window.history.replaceState({},'', '/room/test-room');render(<SecondDawnGame/>);
 expect(await screen.findByRole('heading',{name:'Saved galaxy'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Game room'}));fireEvent.click(screen.getByRole('button',{name:'Sign in again'}));
 await waitFor(()=>expect(localStorage.getItem('eclipse.second-dawn.guest.v1')).toBe(data.next));
 expect(await screen.findByRole('heading',{name:'Saved galaxy'})).toBeVisible();
});
it('offers the original browser player even after another saved player was used most recently',async()=>{
 localStorage.setItem('eclipse.second-dawn.guest.v1',data.next);localStorage.setItem('eclipse.second-dawn.original-player.v1',data.old);localStorage.setItem('eclipse.second-dawn.previous-player.v1',`ecl1_${'c'.repeat(64)}`);
 window.history.replaceState({},'', '/room/test-room');render(<SecondDawnGame/>);
 await screen.findByRole('heading',{name:'Saved galaxy'});fireEvent.click(screen.getByRole('button',{name:'Game room'}));fireEvent.click(screen.getByRole('button',{name:'Restore browser player'}));
 await waitFor(()=>expect(localStorage.getItem('eclipse.second-dawn.guest.v1')).toBe(data.old));
});
