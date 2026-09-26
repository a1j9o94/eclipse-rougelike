import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import ResearchedTechnologies from '../second-dawn-game/ResearchedTechnologies';
afterEach(cleanup);
const fixture=()=>createGame({seed:1,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'planta',controller:'ai'}]}).seats[0];
it('puts discounts in empty technology slots and counts printed and rare technology in its chosen track',()=>{
 const seat=fixture();seat.technologies={military:[],grid:['gluon-computer'],nano:['advanced-labs','conifold-field']};
 const before=JSON.stringify(seat);render(<ResearchedTechnologies seat={seat}/>);
 for(const [name,current] of [['Military',0],['Grid',1],['Nano',2]] as const){
  const track=screen.getByRole('group',{name:`${name} · ${current} researched`});
  expect(within(track).getByText(`Discount ${current}`)).toBeVisible();
  expect(within(track).getByLabelText(`Empty technology slot ${current+1}: ${current?`−${current}`:'0'} science discount`)).toBeVisible();
  expect(within(track).queryByText(/Slot \d+ \/ 7|Current discount:/)).toBeNull();
 }
 expect(screen.getByText('Discounts reduce science costs on that track, never below a technology’s minimum price.')).toBeVisible();
 expect(JSON.stringify(seat)).toBe(before);
});
it('shows the larger late-track discounts and warns when the next purchase fills the track',()=>{
 const seat=fixture();seat.technologies.nano=['advanced-labs','conifold-field','nanorobots','fusion-source','orbital','advanced-mining'];
 render(<ResearchedTechnologies seat={seat}/>);
 const track=screen.getByRole('group',{name:'Nano · 6 researched'});
 expect(within(track).getByText('Discount 8')).toBeVisible();
 expect(within(track).getByLabelText('Empty technology slot 7: −8 science discount')).toBeVisible();
});
it('places discount information and researched tiles in one row of fillable card slots',()=>{
 const seat=fixture();seat.technologies.nano=['advanced-labs','conifold-field'];
 render(<ResearchedTechnologies seat={seat}/>);
 const row=within(screen.getByRole('group',{name:'Nano · 2 researched'})).getByRole('group',{name:'Nano technology slots'});
 expect(within(row).queryByRole('group',{name:'Nano research discounts'})).toBeNull();
 expect(within(row).getAllByRole('button',{name:/Inspect researched/})).toHaveLength(2);
 expect(within(row).getAllByLabelText(/Empty technology slot/)).toHaveLength(5);
 expect(within(row).getAllByLabelText(/Empty technology slot/).map(slot=>slot.textContent)).toEqual(['−2','−3','−4','−6','−8']);
});
it('does not advertise another research discount after all seven slots are filled',()=>{
 const seat=fixture();seat.technologies.nano=['advanced-labs','conifold-field','nanorobots','fusion-source','orbital','advanced-mining','metasynthesis'];
 render(<ResearchedTechnologies seat={seat}/>);
 const track=screen.getByRole('group',{name:'Nano · 7 researched'});
 expect(within(track).getByText('Track full')).toBeVisible();
 expect(within(track).queryByLabelText(/Empty technology slot/)).toBeNull();
 expect(within(track).getAllByRole('button',{name:/Inspect researched/})).toHaveLength(7);
});
