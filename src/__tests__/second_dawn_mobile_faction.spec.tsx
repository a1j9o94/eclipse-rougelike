import {render,screen,fireEvent} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import FactionPicker from '../second-dawn-game/FactionPicker';
vi.mock('../second-dawn-game/mobileLayout',()=>({useMobileLayout:()=>true}));
afterEach(()=>vi.restoreAllMocks());
it('offers direct faction details and returns to comparisons on a phone',()=>{
 const scroll=vi.fn();Element.prototype.scrollIntoView=scroll;
 render(<FactionPicker selected="terran-directorate" onSelect={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'View Terran Directorate effects'}));
 expect(screen.getByRole('article',{name:'Terran Directorate details'})).toHaveFocus();expect(scroll).toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Compare factions'}));
 expect(screen.getByRole('region',{name:'Choose civilization'})).toHaveFocus();
});
