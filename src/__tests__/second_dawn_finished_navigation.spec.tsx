import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {getFunctionName,type FunctionReference} from 'convex/server';
import SecondDawnGame from '../second-dawn-game/SecondDawnGame';
const data=vi.hoisted(()=>({credential:`ecl1_${'a'.repeat(64)}`,mutate:vi.fn(),finished:{matchId:'finished-match',seatId:'seat-1',round:8,phase:'finished',revision:100,playerCount:3,updatedAt:1000},active:{matchId:'active-match',seatId:'seat-1',round:3,phase:'action',revision:30,playerCount:2,updatedAt:2000}}));
vi.mock('convex/react',()=>({
 useConvex:()=>({}),useConvexConnectionState:()=>({isWebSocketConnected:true}),
 useAction:()=>vi.fn(),useMutation:()=>data.mutate,
 useQuery:(reference:FunctionReference<'query'>,args:'skip'|object)=>{
  if(args==='skip')return undefined;
  switch(getFunctionName(reference)){
   case 'eclipseGuests:getGuestSession':return {};
   case 'eclipsePlayerStore:getPlayerProfile':return null;
   case 'eclipseMatches:listMyMatches':return [data.active,data.finished];
   case 'eclipseRooms:listMyRooms':return [{roomToken:'old-room',status:'finished',matchId:'finished-match',settings:{humanSeatCount:2,aiCount:1}},{roomToken:'waiting-room',status:'waiting',matchId:null,settings:{humanSeatCount:2,aiCount:0}}];
   case 'eclipseRooms:getRoom':return {matchId:'finished-match',viewerSlot:1};
   case 'eclipseMatches:getMatchView':return {revision:100,lastSeenRevision:100,phase:'finished',seats:[],viewerSeatId:'seat-1',playerNames:{},multiplayer:null};
   default:return undefined;
  }
 }
}));
vi.mock('../second-dawn-session/useMatchHistory',()=>({useMatchHistory:()=>({})}));
vi.mock('../../shared/eclipse/legal',()=>({legalCommands:()=>[]}));
vi.mock('../second-dawn-game/SecondDawnBoard',()=>({default:({onHome,onPlayAgain}:{onHome?:()=>void;onPlayAgain?:()=>void})=><div><h1>Finished galaxy</h1><button onClick={onHome}>Home</button><button onClick={onPlayAgain}>Play again</button></div>}));
vi.mock('../second-dawn-game/PlayerAccessPanel',()=>({default:()=>null}));
vi.mock('../second-dawn-game/RoomLobby',()=>({default:()=> <p>Room overview</p>,RoomSettingsEditor:()=>null}));
beforeEach(()=>{localStorage.setItem('eclipse.second-dawn.guest.v1',data.credential);data.mutate.mockClear();});
afterEach(()=>{cleanup();localStorage.clear();window.history.replaceState({},'', '/');});
it('keeps finished games in collapsed history and out of active saves and rooms',()=>{
 render(<SecondDawnGame/>);
 expect(screen.getByRole('button',{name:/Continue · round 3/})).toBeVisible();
 expect(screen.queryByRole('button',{name:/Continue · round 8/})).toBeNull();
 expect(screen.queryByRole('link',{name:/Continue room game.*finished/})).toBeNull();
 const summary=screen.getByText('Completed games (1)');
 const history=summary.closest('details')!;expect(history).not.toHaveAttribute('open');
 fireEvent.click(summary);
 fireEvent.click(within(history).getByRole('button',{name:/View results/}));
 expect(screen.getByRole('heading',{name:'Finished galaxy'})).toBeVisible();
 expect(data.mutate).not.toHaveBeenCalled();
});
it('leaves a finished room for Home without reopening the same room or deleting saves',async()=>{
 window.history.replaceState({},'', '/room/old-room');render(<SecondDawnGame/>);
 await screen.findByRole('heading',{name:'Finished galaxy'});fireEvent.click(screen.getByRole('button',{name:'Home'}));
 expect(window.location.pathname).toBe('/');
 expect(screen.getByRole('button',{name:'New game'})).toBeVisible();
 expect(screen.queryByText('Room overview')).toBeNull();
 expect(screen.getByText('Completed games (1)')).toBeVisible();
 expect(localStorage.getItem('eclipse.second-dawn.guest.v1')).toBe(data.credential);
 expect(data.mutate).not.toHaveBeenCalled();
});
it('opens faction setup on Play again from a finished room without creating another game',async()=>{
 window.history.replaceState({},'', '/room/old-room');render(<SecondDawnGame/>);
 await screen.findByRole('heading',{name:'Finished galaxy'});fireEvent.click(screen.getByRole('button',{name:'Play again'}));
 expect(window.location.pathname).toBe('/');
 expect(screen.getByRole('heading',{name:'New game',exact:true})).toBeVisible();
 expect(screen.getByRole('button',{name:'Start game'})).toBeVisible();
 expect(data.mutate).not.toHaveBeenCalled();
});
it('returns to setup from a saved result opened on the home page',()=>{
 render(<SecondDawnGame/>);fireEvent.click(screen.getByText('Completed games (1)'));
 fireEvent.click(screen.getByRole('button',{name:/View results/}));fireEvent.click(screen.getByRole('button',{name:'Play again'}));
 expect(screen.getByRole('button',{name:'Start game'})).toBeVisible();
 expect(data.mutate).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Back',exact:true}));
 expect(screen.getByText('Completed games (1)').closest('details')).not.toHaveAttribute('open');
 expect(screen.getByRole('button',{name:/Continue · round 3/})).toBeVisible();
});
