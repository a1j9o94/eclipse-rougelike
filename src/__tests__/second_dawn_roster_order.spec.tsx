import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(cleanup);
function fixture(){return createGame({seed:6,warpPortals:false,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'},{id:'c',faction:'planta',controller:'ai'},{id:'d',faction:'orion',controller:'ai'}]});}
const props={candidates:[],connected:true,busy:false,status:'',onSubmit:vi.fn(),onMenu:vi.fn()};
function names(){return within(screen.getByRole('region',{name:'Civilization roster'})).getAllByRole('button').map(button=>button.querySelector('strong')!.textContent);}
it('shows the active player then clockwise turns and preserves faction inspection after rotation',()=>{
 const state=fixture();state.activeSeatId='c';
 const ui=render(<SecondDawnBoard view={getPlayerView(state,'a')!} {...props}/>);
 expect(names()).toEqual(['Planta','Orion Hegemony','Hydran Progress','Eridani Empire']);
 expect(screen.getByText('Turn order →')).toBeInTheDocument();
 const hydran=within(screen.getByRole('region',{name:'Civilization roster'})).getByRole('button',{name:/Hydran Progress/});
 const color=hydran.style.getPropertyValue('--owner');
 state.activeSeatId='d';state.revision++;
 ui.rerender(<SecondDawnBoard view={getPlayerView(state,'a')!} {...props}/>);
 expect(names()).toEqual(['Orion Hegemony','Hydran Progress','Eridani Empire','Planta']);
 const same=within(screen.getByRole('region',{name:'Civilization roster'})).getByRole('button',{name:/Hydran Progress/});
 expect(same.style.getPropertyValue('--owner')).toBe(color);
 fireEvent.click(same);expect(screen.getByRole('heading',{name:'Hydran Progress',exact:true})).toBeInTheDocument();
 expect(state.seats.map(seat=>seat.id)).toEqual(['a','b','c','d']);
});
it('keeps passed reaction turns in clockwise order, places eliminated seats last, and identifies next round first',()=>{
 const state=fixture();state.activeSeatId='c';state.firstPasser='a';state.startSeatId='a';state.seats[0].passed=true;state.seats[3].eliminated=true;
 render(<SecondDawnBoard view={getPlayerView(state,'a')!} {...props}/>);
 expect(names()).toEqual(['Planta','Hydran Progress','Eridani Empire','Orion Hegemony']);
 const roster=within(screen.getByRole('region',{name:'Civilization roster'}));
 expect(roster.getByRole('button',{name:/Hydran Progress/})).toHaveTextContent('Next round first');
 expect(roster.getByRole('button',{name:/Orion Hegemony/})).toHaveTextContent('eliminated');
});
it('anchors non-action phases to the start tile rather than combat decision ownership',()=>{
 const state=fixture();state.phase='combat';state.startSeatId='c';state.activeSeatId='b';
 render(<SecondDawnBoard view={getPlayerView(state,'a')!} {...props}/>);
 expect(names()).toEqual(['Planta','Orion Hegemony','Hydran Progress','Eridani Empire']);
});
