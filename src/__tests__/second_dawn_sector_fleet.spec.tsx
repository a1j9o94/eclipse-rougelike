import {render,screen,fireEvent} from '@testing-library/react';
import {expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import SectorFleet from '../second-dawn-game/SectorFleet';
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
