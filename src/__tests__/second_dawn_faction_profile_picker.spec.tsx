import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import FactionProfilePicker from '../second-dawn-game/FactionProfilePicker';

afterEach(cleanup);

it('offers only Base and the complete Expanded collection for new games',()=>{
 const change=vi.fn();
 render(<FactionProfilePicker value="expanded-v2" onChange={change}/>);
 const group=screen.getAllByRole('group',{name:'Faction collection'})[0];
 expect(within(group).getAllByRole('button')).toHaveLength(2);
 expect(within(group).getByRole('button',{name:/Expanded.*18 civilizations.*Exiles.*Lyra/i})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(within(group).getByRole('button',{name:/Base/i}));
 expect(change).toHaveBeenCalledWith('base');
 fireEvent.click(within(group).getByRole('button',{name:/Expanded/i}));
 expect(change).toHaveBeenLastCalledWith('expanded-v2');
});

it('explains an existing expanded-v1 room without silently changing its roster',()=>{
 const change=vi.fn();
 render(<FactionProfilePicker value="expanded-v1" onChange={change}/>);
 const group=screen.getAllByRole('group',{name:'Faction collection'})[0];
 expect(within(group).getAllByRole('button')).toHaveLength(2);
 expect(within(group).getByRole('button',{name:/Expanded/i})).toHaveAttribute('aria-pressed','true');
 expect(screen.getByText(/existing room uses the earlier expanded roster/i)).toBeVisible();
 expect(change).not.toHaveBeenCalled();
 fireEvent.click(within(group).getByRole('button',{name:/Expanded/i}));
 expect(change).toHaveBeenCalledWith('expanded-v2');
});
