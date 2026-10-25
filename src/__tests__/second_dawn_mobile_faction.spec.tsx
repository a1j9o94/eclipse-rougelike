import {render,screen,fireEvent} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import FactionPicker from '../second-dawn-game/FactionPicker';
vi.mock('../second-dawn-game/mobileLayout',()=>({useMobileLayout:()=>true}));
afterEach(()=>vi.restoreAllMocks());
it('reveals faction details in place without moving the selection surface',()=>{
 const scroll=vi.fn();Element.prototype.scrollIntoView=scroll;
 render(<FactionPicker selected="terran-directorate" onSelect={vi.fn()}/>);
 const details=screen.getByText('Terran Directorate · abilities and starting setup').closest('details')!;
 expect(details).not.toHaveAttribute('open');
 fireEvent.click(screen.getByText('Terran Directorate · abilities and starting setup'));
 expect(details).toHaveAttribute('open');expect(scroll).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Terran Directorate · abilities and starting setup'));
 expect(details).not.toHaveAttribute('open');
});
it('keeps faction selection in place while another civilization is chosen',()=>{
 const scroll=vi.fn();Element.prototype.scrollIntoView=scroll;
 const frame=vi.spyOn(window,'requestAnimationFrame').mockImplementation(callback=>{callback(0);return 0;});
 const select=vi.fn();render(<FactionPicker selected="terran-directorate" onSelect={select}/>);
 fireEvent.click(screen.getByRole('button',{name:/Eridani Empire.*Red board/}));
 expect(select).toHaveBeenCalledWith('eridani');
 expect(scroll).not.toHaveBeenCalled();
 frame.mockRestore();
});
