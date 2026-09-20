import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {LeaderboardView} from '../second-dawn-game/Leaderboard';
afterEach(cleanup);
it('shows multiplayer Elo, wins, win percentage and expandable faction records',()=>{
 const onSort=vi.fn();render(<LeaderboardView rows={[{playerId:'p',username:'Harshita',rating:1016,games:4,wins:2,winRate:.5,factionWins:[{faction:'hydran',wins:2,games:3},{faction:'planta',wins:0,games:1}]}]} sort="rating" onSort={onSort} onClose={vi.fn()}/>);
 const row=screen.getByRole('article',{name:'Harshita multiplayer record'});
 expect(within(row).getByText('1,016')).toBeVisible();expect(within(row).getByText('50%')).toBeVisible();
 expect(screen.getByText(/Solo games do not count/)).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Wins'}));expect(onSort).toHaveBeenCalledWith('wins');
 fireEvent.click(within(row).getByText('Wins by faction'));
 expect(within(row).getByText('Hydran Progress')).toBeVisible();expect(within(row).getByText('2 wins · 3 games')).toBeVisible();
});
it('distinguishes loading from no finished multiplayer games and offers home',()=>{
 const onClose=vi.fn();const ui=render(<LeaderboardView rows={undefined} sort="rating" onSort={vi.fn()} onClose={onClose}/>);
 expect(screen.getByRole('status')).toHaveTextContent('Loading');
 ui.rerender(<LeaderboardView rows={[]} sort="rating" onSort={vi.fn()} onClose={onClose}/>);
 expect(screen.getByText('No completed multiplayer games yet.')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Back to games'}));expect(onClose).toHaveBeenCalledOnce();
});
