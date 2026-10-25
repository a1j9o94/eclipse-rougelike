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
it('shows an ongoing room game once through its saved match and keeps unstarted rooms discoverable',()=>{
 const match={matchId:'active-match' as import('../../convex/_generated/dataModel').Id<'eclipseMatchesV1'>,seatId:'seat-1',round:3,phase:'action' as const,revision:40,playerCount:2,lastSeenRevision:null,updatedAt:1,roomToken:'active-room'};
 const settings={humanSeatCount:2,aiCount:1,timerMs:600000,warpPortals:true};
 render(<SavedGames matches={[match]} rooms={[{roomToken:'active-room',status:'playing',matchId:match.matchId,settings},{roomToken:'waiting-room',status:'waiting',settings}]} onOpen={vi.fn()}/>);
 expect(screen.getAllByRole('button',{name:/Continue/})).toHaveLength(1);
 expect(screen.queryByRole('link',{name:/Continue room game/})).not.toBeInTheDocument();
 expect(screen.getByRole('link',{name:/Open room/})).toHaveAttribute('href','/room/waiting-room');
 const active=screen.getByRole('region',{name:'Active games'});
 expect(active.compareDocumentPosition(screen.getByRole('heading',{name:'Your game rooms'}))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it('leads with games needing the player before newer waiting games',()=>{
 const base={seatId:'seat-1',round:3,phase:'action' as const,revision:40,playerCount:2,lastSeenRevision:null};
 const waiting={...base,matchId:'waiting' as import('../../convex/_generated/dataModel').Id<'eclipseMatchesV1'>,updatedAt:200,needsInput:false};
 const ready={...base,matchId:'ready' as import('../../convex/_generated/dataModel').Id<'eclipseMatchesV1'>,updatedAt:100,needsInput:true};
 const open=vi.fn();render(<SavedGames matches={[waiting,ready]} rooms={[]} onOpen={open}/>);
 const cards=screen.getAllByRole('button',{name:/Continue/});
 expect(cards[0]).toHaveTextContent('Needs your input');fireEvent.click(cards[0]);expect(open).toHaveBeenCalledWith(ready);
});
