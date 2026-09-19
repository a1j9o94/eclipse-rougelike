// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import GameMenuPanel from '../second-dawn-game/GameMenuPanel';
afterEach(cleanup);
it('leaving for home preserves the run and never resigns',()=>{
 const home=vi.fn(),resign=vi.fn();render(<GameMenuPanel outcome="abandoned" disabled={false} onHome={home} onClose={vi.fn()} onResign={resign}/>);
 fireEvent.click(screen.getByRole('button',{name:'Save & return home'}));expect(home).toHaveBeenCalledOnce();expect(resign).not.toHaveBeenCalled();
});
it('requires an explicit solo quit confirmation and lets the player cancel',()=>{
 const resign=vi.fn();render(<GameMenuPanel outcome="abandoned" disabled={false} onHome={vi.fn()} onClose={vi.fn()} onResign={resign}/>);
 fireEvent.click(screen.getByRole('button',{name:'Quit this game'}));expect(resign).not.toHaveBeenCalled();expect(screen.getByText(/will end this solo run/)).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Keep playing'}));expect(screen.queryByRole('button',{name:'Confirm quit'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Quit this game'}));fireEvent.click(screen.getByRole('button',{name:'Confirm quit'}));expect(resign).toHaveBeenCalledOnce();
});
it('explains permanent AI takeover for multiplayer resignation and blocks offline submission',()=>{
 const resign=vi.fn();render(<GameMenuPanel outcome="resigned" disabled={true} onHome={vi.fn()} onClose={vi.fn()} onResign={resign}/>);
 fireEvent.click(screen.getByRole('button',{name:'Resign from game'}));expect(screen.getByText(/AI will take over your civilization/)).toBeVisible();expect(screen.getByRole('button',{name:'Confirm resignation'})).toBeDisabled();
});
