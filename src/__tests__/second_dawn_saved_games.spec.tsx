import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import SavedGames from '../second-dawn-game/SavedGames';
afterEach(cleanup);
it('keeps a completed room link recoverable when there is no corresponding saved match',()=>{
 render(<SavedGames matches={[]} rooms={[{roomToken:'archived-room',status:'finished',matchId:'other-match',settings:{humanSeatCount:2,aiCount:1,timerMs:600000,warpPortals:true}}]} onOpen={vi.fn()}/>);
 expect(screen.queryByRole('heading',{name:'Your game rooms'})).toBeNull();
 fireEvent.click(screen.getByText('Completed games (1)'));
 expect(screen.getByRole('link',{name:/View room results/})).toHaveAttribute('href','/room/archived-room');
});
it('does not present a save-loading state as an empty collection',()=>{
 render(<SavedGames matches={undefined} rooms={undefined} onOpen={vi.fn()}/>);
 expect(screen.getByText('Looking for saves…')).toBeVisible();
 expect(screen.queryByText('No saved Second Dawn games yet.')).toBeNull();
});
it('archives quit and resigned games without claiming final scoring',()=>{
 const match={matchId:'quit-match' as import('../../convex/_generated/dataModel').Id<'eclipseMatchesV1'>,seatId:'seat-1',round:3,phase:'action' as const,revision:40,playerCount:2,lastSeenRevision:null,updatedAt:1,participation:'abandoned' as const,roomToken:'quit-room'};
 render(<SavedGames matches={[match]} rooms={[{roomToken:'quit-room',status:'playing',matchId:match.matchId,settings:{humanSeatCount:1,aiCount:1,timerMs:30000,warpPortals:true}}]} onOpen={vi.fn()}/>);
 expect(screen.queryByRole('button',{name:/Continue/})).toBeNull();expect(screen.queryByRole('heading',{name:'Your game rooms'})).toBeNull();fireEvent.click(screen.getByText('Past games (1)'));expect(screen.getByRole('button',{name:/View board.*Quit/})).toBeVisible();expect(screen.queryByText('View results')).toBeNull();
});
