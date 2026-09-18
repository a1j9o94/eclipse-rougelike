import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(cleanup);
function fixture(){const state=createGame({seed:6,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});return getPlayerView(state,'a')!;}
it('opens a visual build order for the inspected friendly sector',()=>{const view=fixture();const home=view.sectors.find(s=>s.owner==='a')!;render(<SecondDawnBoard view={view} candidates={legalCommands(view)} initialSectorId={home.id} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Build',exact:true}));expect(screen.getByRole('dialog')).toHaveTextContent(home.tileId);expect(screen.queryByRole('combobox',{name:'Choose an option'})).toBeNull();});
it('opens fleet selection on Move instead of an action-option dropdown',()=>{const view=fixture();const home=view.sectors.find(s=>s.owner==='a')!;render(<SecondDawnBoard view={view} candidates={legalCommands(view)} initialSectorId={home.id} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Move',exact:true}));expect(screen.getByRole('region',{name:'Move fleet'})).toBeInTheDocument();expect(document.querySelectorAll('.sd-frontier')).toHaveLength(0);expect(screen.queryByRole('combobox',{name:'Choose an option'})).toBeNull();});
