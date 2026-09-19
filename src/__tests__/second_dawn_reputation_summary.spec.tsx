import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import ReputationSummary from '../second-dawn-game/ReputationSummary';
afterEach(cleanup);
function fixture(){const state=createGame({seed:4,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});const view=getPlayerView(state,'a')!;view.private.reputationSummary={id:'reward1',round:1,battleId:'battle1',sectorId:view.sectors[0].id,drawn:[1,4,4],selected:4,kept:[4,4,3],returned:[1,4,2]};return view;}
it('shows private drawn tiles, exactly one selected tile, and an optional retained collection',()=>{
 const close=vi.fn();render(<ReputationSummary view={fixture()} onDismiss={close}/>);
 expect(screen.queryByRole('dialog')).toBeNull();expect(screen.queryByRole('checkbox')).toBeNull();
 expect(screen.getByRole('status')).toHaveTextContent('Selected 4 VP');
 const drawn=screen.getByRole('group',{name:'Reputation drawn'});expect(within(drawn).getAllByRole('img')).toHaveLength(3);expect(within(drawn).getAllByLabelText('4 VP reputation, selected')).toHaveLength(1);
 expect(screen.getByText('Your reputation · 11 VP')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Dismiss reputation result'}));expect(close).toHaveBeenCalledOnce();
});
it('explains when none of the draws improves the retained reputation',()=>{
 const view=fixture();view.private.reputationSummary={...view.private.reputationSummary!,drawn:[1,2],selected:null,kept:[4,4,3],returned:[1,2]};
 render(<ReputationSummary view={view} onDismiss={()=>{}}/>);
 expect(screen.getByRole('status')).toHaveTextContent('No improvement');
 expect(screen.queryByLabelText(/reputation, selected/)).toBeNull();expect(screen.getByText('Your best reputation stays with you.')).toBeInTheDocument();
});
it('renders nothing without an owner summary or for mismatched private ownership',()=>{
 const view=fixture();view.private.seatId='b';const ui=render(<ReputationSummary view={view} onDismiss={()=>{}}/>);expect(ui.container).toBeEmptyDOMElement();
 view.private.seatId='a';delete view.private.reputationSummary;ui.rerender(<ReputationSummary view={view} onDismiss={()=>{}}/>);expect(ui.container).toBeEmptyDOMElement();
});
