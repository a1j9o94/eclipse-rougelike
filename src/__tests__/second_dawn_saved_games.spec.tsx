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
