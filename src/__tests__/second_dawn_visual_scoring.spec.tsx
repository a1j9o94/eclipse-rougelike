import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {scoreSeat} from '../../shared/eclipse/rounds';
import Board from '../second-dawn-game/SecondDawnBoard';
function fixture(final=false){
 const state=createGame({seed:9,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 state.privateSeats[0].reputation=[3,4];state.privateSeats[1].reputation=[5];
 if(final){state.phase='finished';state.engine!.scores=state.seats.map(seat=>scoreSeat(state,seat));}
 return getPlayerView(state,'a')!;
}
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('offers explicit home and new-game exits, and keeps final galaxy inspection open',()=>{
 const home=vi.fn(),again=vi.fn(),submit=vi.fn();render(<Board view={fixture(true)} candidates={[]} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()} onHome={home} onPlayAgain={again}/>);
 fireEvent.click(screen.getByRole('button',{name:'Return home'}));expect(home).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'Play again'}));expect(again).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'View final galaxy'}));expect(screen.getByRole('group',{name:'Galaxy map'})).toBeVisible();
 fireEvent.click(within(screen.getByRole('group',{name:'Galaxy map'})).getAllByRole('button',{name:/^Inspect sector /})[1]);
 expect(screen.queryByRole('button',{name:'Build here'})).toBeNull();
 expect(screen.getByRole('heading',{name:'Planets & population'})).toBeVisible();
 expect(submit).not.toHaveBeenCalled();
});
it('uses visual faction cards with inspectable score sources and hides all reputation during play',()=>{
 render(<Board view={fixture()} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:/Your public VP/}));
 const standings=screen.getByRole('region',{name:'Standings'});const cards=within(standings).getAllByRole('article');expect(cards).toHaveLength(2);
 for(const card of cards){expect(within(card).getByRole('img',{name:/emblem/})).toBeVisible();expect(within(card).getByRole('button',{name:'Reputation: Hidden until game end'})).toBeVisible();}
 fireEvent.click(within(cards[0]).getByRole('button',{name:/^Sectors:/}));expect(screen.getByRole('dialog',{name:'Public score inspection'})).toBeVisible();
 expect(screen.queryByRole('button',{name:'Play again'})).toBeNull();
});
it('renders authoritative final totals and joint winners for exact VP and resource ties',()=>{
 const view=fixture(true);const score=view.scores![0];view.scores=[{...score,total:32,resourceTotal:10},{...score,playerId:'b',total:32,resourceTotal:10}];
 render(<Board view={view} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 const standings=screen.getByRole('region',{name:'Standings'});const cards=within(standings).getAllByRole('article');expect(cards).toHaveLength(2);
 for(const card of cards){expect(within(card).getByLabelText('Final score: 32 VP')).toBeVisible();expect(within(card).getByText('Joint winner')).toBeVisible();expect(within(card).getByRole('button',{name:'Reputation: 7 VP'})).toBeVisible();expect(within(card).getByText('10 resources')).toBeVisible();}
});

it('opens final standings on mobile even with an unread recap, and keeps revealed reputation clear',()=>{
 vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 render(<Board view={fixture(true)} candidates={[]} connected busy={false} status="" recapOpen activityRecap={<p>Unread events</p>} onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 expect(screen.getByRole('heading',{name:'Final standings'})).toBeVisible();expect(screen.getByRole('button',{name:'Return home'})).toBeVisible();
 fireEvent.click(screen.getAllByRole('button',{name:/^Reputation: [0-9]+ VP/})[0]);
 expect(screen.getByRole('dialog',{name:'Public score inspection'})).toHaveTextContent('Reputation is revealed and included in the final score.');
});
