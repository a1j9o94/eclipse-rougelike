import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {researchTrackVp} from '../../shared/eclipse/scoring';
import ResearchedTechnologies from '../second-dawn-game/ResearchedTechnologies';
afterEach(cleanup);
const fixture=()=>createGame({seed:1,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'planta',controller:'ai'}]}).seats[0];
it('puts discounts in empty technology slots and counts printed and rare technology in its chosen track',()=>{
 const seat=fixture();seat.technologies={military:[],grid:['gluon-computer'],nano:['advanced-labs','conifold-field']};
 const before=JSON.stringify(seat);render(<ResearchedTechnologies seat={seat}/>);
 for(const [name,current] of [['Military',0],['Grid',1],['Nano',2]] as const){
  const track=screen.getByRole('group',{name:`${name} · ${current} researched`});
  expect(within(track).getByText(`Discount ${current}`)).toBeVisible();
  expect(within(track).getByLabelText(`Empty technology slot ${current+1}: ${current?`−${current}`:'0'} science discount, ${researchTrackVp(current+1)} VP track total`)).toBeVisible();
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
 expect(within(track).getByLabelText('Empty technology slot 7: −8 science discount, 5 VP track total')).toBeVisible();
});
it('places discount information and researched tiles in one row of fillable card slots',()=>{
 const seat=fixture();seat.technologies.nano=['advanced-labs','conifold-field'];
 render(<ResearchedTechnologies seat={seat}/>);
 const row=within(screen.getByRole('group',{name:'Nano · 2 researched'})).getByRole('group',{name:'Nano technology slots'});
 expect(within(row).queryByRole('group',{name:'Nano research discounts'})).toBeNull();
 expect(within(row).getAllByRole('button',{name:/Inspect researched/})).toHaveLength(2);
 expect(within(row).getAllByLabelText(/Empty technology slot/)).toHaveLength(5);
 expect(within(row).getAllByLabelText(/Empty technology slot/).map(slot=>[slot.querySelector('.dg-research-slot-discount strong')?.textContent,slot.querySelector('.dg-research-slot-vp strong')?.textContent])).toEqual([['−2','0 VP'],['−3','1 VP'],['−4','2 VP'],['−6','3 VP'],['−8','5 VP']]);
 expect(within(row).getByRole('button',{name:'Inspect researched Conifold Field'})).toHaveTextContent('−1');
 expect(within(row).getByRole('button',{name:'Inspect researched Conifold Field'})).toHaveTextContent('0 VP');
});
it('uses cumulative track scoring thresholds in every slot rather than points per technology',()=>{
 const seat=fixture();render(<ResearchedTechnologies seat={seat}/>);
 const row=screen.getByRole('group',{name:'Military technology slots'});
 expect(within(row).getAllByLabelText(/Empty technology slot/).map(slot=>[slot.querySelector('.dg-research-slot-discount strong')?.textContent,slot.querySelector('.dg-research-slot-vp strong')?.textContent])).toEqual([['0','0 VP'],['−1','0 VP'],['−2','0 VP'],['−3','1 VP'],['−4','2 VP'],['−6','3 VP'],['−8','5 VP']]);
});
it('does not advertise another research discount after all seven slots are filled',()=>{
 const seat=fixture();seat.technologies.nano=['advanced-labs','conifold-field','nanorobots','fusion-source','orbital','advanced-mining','metasynthesis'];
 render(<ResearchedTechnologies seat={seat}/>);
 const track=screen.getByRole('group',{name:'Nano · 7 researched'});
 expect(within(track).getByText('Track full')).toBeVisible();
 expect(within(track).queryByLabelText(/Empty technology slot/)).toBeNull();
 expect(within(track).getAllByRole('button',{name:/Inspect researched/})).toHaveLength(7);
 const final=within(track).getByRole('button',{name:'Inspect researched Metasynthesis'});
 expect(within(final).getByText('−8')).toBeVisible();
 expect(within(final).getByText('5 VP')).toBeVisible();
});
