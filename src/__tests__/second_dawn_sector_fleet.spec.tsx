import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import SectorFleet from '../second-dawn-game/SectorFleet';
afterEach(cleanup);
it('groups visual fleet counts by owner and class while retaining individual damage details',()=>{
 const state=createGame({seed:13,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 const view=getPlayerView(state,'a')!;const sectorId=view.ships[0].sectorId;
 view.ships=[{id:'i1',owner:'a',type:'interceptor',sectorId,damage:0,arrival:1},{id:'i2',owner:'a',type:'interceptor',sectorId,damage:1,arrival:2},{id:'i3',owner:'b',type:'interceptor',sectorId,damage:0,arrival:3},{id:'n1',owner:'ancient',type:'ancient',sectorId,damage:0,arrival:0}];
 render(<SectorFleet view={view} sectorId={sectorId}/>);
 expect(screen.getByRole('group',{name:'Eridani Empire · 2 Interceptors'})).toBeInTheDocument();
 expect(screen.getByRole('group',{name:'Hydran Progress · 1 Interceptor'})).toBeInTheDocument();
 expect(screen.getByRole('group',{name:'Ancients · 1 Ancient'})).toBeInTheDocument();
 expect(screen.getAllByRole('img',{name:/Interceptor blueprint silhouette/})).toHaveLength(2);
 fireEvent.click(screen.getAllByText('Damage details')[0]);expect(screen.getByText('Interceptor 2 · 1 damage')).toBeInTheDocument();
});

it('offers one inspection for the entire mixed fleet outside individual ship groups',()=>{
 const state=createGame({seed:13,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});const view=getPlayerView(state,'a')!,sectorId=view.sectors[0].id,onInspect=vi.fn();
 view.ships=[{id:'own',owner:'a',type:'interceptor',sectorId,damage:1,arrival:1},{id:'enemy',owner:'b',type:'cruiser',sectorId,damage:0,arrival:2},{id:'ancient',owner:'ancient',type:'ancient',sectorId,damage:0,arrival:0}];
 render(<SectorFleet view={view} sectorId={sectorId} onInspect={onInspect}/>);
 const inspect=screen.getByRole('button',{name:'Inspect fleet',exact:true});expect(screen.getAllByRole('button')).toHaveLength(1);expect(screen.queryByRole('button',{name:'Inspect capabilities'})).toBeNull();
 for(const group of screen.getAllByRole('group'))expect(within(group).queryByRole('button')).toBeNull();
 fireEvent.click(inspect);expect(onInspect).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByText('Damage details'));expect(screen.getByText('Interceptor 1 · 1 damage')).toBeVisible();
});
it('omits inspection when the sector has no ships or no inspection handler',()=>{
 const state=createGame({seed:13,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});const view=getPlayerView(state,'a')!,sectorId=view.ships[0].sectorId;
 const rendered=render(<SectorFleet view={view} sectorId={sectorId}/>);expect(screen.queryByRole('button')).toBeNull();
 rendered.rerender(<SectorFleet view={{...view,ships:[]}} sectorId={sectorId} onInspect={vi.fn()}/>);expect(screen.getByText('No ships in this sector.')).toBeInTheDocument();expect(screen.queryByRole('button')).toBeNull();
});
