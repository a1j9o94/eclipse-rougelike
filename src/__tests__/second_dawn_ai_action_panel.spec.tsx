import {fireEvent,render,screen,within} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import type {PublicHistoryEntry} from '../../shared/eclipse/history';
import AiActionPanel from '../second-dawn-game/AiActionPanel';
const makeView=()=>getPlayerView(createGame({seed:91,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;
const base:PublicHistoryEntry={revision:4,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Completed an action',details:[]};
it('shows the researched technology effect without editable purchase controls',()=>{
 render(<AiActionPanel view={makeView()} entry={{...base,presentation:{kind:'research',technologyId:'gluon-computer'}}} onInspectSector={()=>{}}/>);
 expect(screen.getByRole('heading',{name:'Gluon Computer'})).toBeInTheDocument();
 expect(screen.getByRole('img',{name:/computer: \+3/})).toBeInTheDocument();
 expect(screen.queryByRole('button')).toBeNull();
});
it('shows every changed ship class and public installed loadouts without slot editing',()=>{
 render(<AiActionPanel view={makeView()} entry={{...base,presentation:{kind:'upgrade',shipTypes:['interceptor','cruiser']}}} onInspectSector={()=>{}}/>);
 expect(screen.getByRole('heading',{name:'Interceptor'})).toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'Cruiser'})).toBeInTheDocument();
 expect(screen.getAllByText('Current public loadout')).toHaveLength(2);
 expect(screen.getAllByText('Nuclear Source')).toHaveLength(2);
 expect(screen.queryByRole('button')).toBeNull();
});
it('renders build quantities and opens the public build sector in one click',()=>{
 const view=makeView(),sector=view.sectors[0],inspect=vi.fn();
 render(<AiActionPanel view={view} entry={{...base,presentation:{kind:'build',sectorIds:[sector.id],components:[{type:'cruiser',count:2},{type:'orbital',count:1}]}}} onInspectSector={inspect}/>);
 expect(screen.getByRole('group',{name:'Built 2 Cruisers'})).toHaveTextContent('×2');
 expect(screen.getByRole('group',{name:'Built 1 Orbital'})).toHaveTextContent('×1');
 fireEvent.click(screen.getByRole('button',{name:`Inspect sector ${sector.tileId}`}));expect(inspect).toHaveBeenCalledWith(sector.id);
});
it('shows public destination fleet and falls back safely when an old ship is gone',()=>{
 const view=makeView(),ship=view.ships.find(s=>s.owner==='b')!,sector=view.sectors.find(s=>s.id===ship.sectorId)!;
 render(<AiActionPanel view={view} entry={{...base,presentation:{kind:'move',shipIds:[ship.id,'destroyed-old-ship'],sectorIds:[sector.id,'missing-old-sector']}}} onInspectSector={()=>{}}/>);
 expect(screen.getByRole('button',{name:`Inspect sector ${sector.tileId}`})).toBeInTheDocument();
 expect(screen.getByText('Current public fleets')).toBeInTheDocument();
 expect(screen.getByRole('group',{name:/Hydran Progress · 1 Interceptor/})).toBeInTheDocument();
 expect(screen.queryByText('destroyed-old-ship')).toBeNull();
});
it('shows only supplied public summary/details for choices without a presentation',()=>{
 render(<AiActionPanel view={makeView()} entry={{...base,summary:'Selected reputation',details:['The player completed their choice.']}} onInspectSector={()=>{}}/>);
 const panel=screen.getByRole('region',{name:'AI action details'});
 expect(within(panel).getByText('Selected reputation')).toBeInTheDocument();
 expect(panel).not.toHaveTextContent('recovery');
 expect(screen.queryByRole('button')).toBeNull();
});
