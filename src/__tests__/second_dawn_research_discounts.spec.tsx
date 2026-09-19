import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import ResearchedTechnologies from '../second-dawn-game/ResearchedTechnologies';
afterEach(cleanup);
const fixture=()=>createGame({seed:1,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'planta',controller:'ai'}]}).seats[0];
it('shows each complete discount progression and counts printed and rare technology in its chosen track',()=>{
 const seat=fixture();seat.technologies={military:[],grid:['gluon-computer'],nano:['advanced-labs','conifold-field']};
 const before=JSON.stringify(seat);render(<ResearchedTechnologies seat={seat}/>);
 for(const [name,current,next] of [['Military',0,1],['Grid',1,2],['Nano',2,3]] as const){
  const track=screen.getByRole('group',{name:`${name} research discounts`});
  expect(within(track).getAllByRole('listitem').map(item=>item.querySelector('strong')?.textContent)).toEqual(['0','−1','−2','−3','−4','−6','−8']);
  expect(within(track).getByText(`Current discount: ${current} science`)).toBeVisible();
  expect(within(track).getByText(`After next research: ${next} science discount`)).toBeVisible();
  expect(track.querySelector('[aria-current="step"]')).toBeTruthy();
 }
 expect(screen.getByText('Discounts reduce science costs on that track, never below a technology’s minimum price.')).toBeVisible();
 expect(JSON.stringify(seat)).toBe(before);
});
it('shows the larger late-track discounts and warns when the next purchase fills the track',()=>{
 const seat=fixture();seat.technologies.nano=['advanced-labs','conifold-field','nanorobots','fusion-source','orbital','advanced-mining'];
 render(<ResearchedTechnologies seat={seat}/>);
 const track=screen.getByRole('group',{name:'Nano research discounts'});
 expect(within(track).getByText('Current discount: 8 science')).toBeVisible();
 expect(within(track).getByText('Next research fills this track')).toBeVisible();
});
it('does not advertise another research discount after all seven slots are filled',()=>{
 const seat=fixture();seat.technologies.nano=['advanced-labs','conifold-field','nanorobots','fusion-source','orbital','advanced-mining','metasynthesis'];
 render(<ResearchedTechnologies seat={seat}/>);
 const track=screen.getByRole('group',{name:'Nano research discounts'});
 expect(within(track).getByText('Track full · no research slots remaining')).toBeVisible();
 expect(within(track).queryByText(/Current discount/)).toBeNull();
 expect(track.querySelector('[aria-current="step"]')).toBeNull();
 expect(within(track).getAllByRole('listitem')).toHaveLength(7);
});
