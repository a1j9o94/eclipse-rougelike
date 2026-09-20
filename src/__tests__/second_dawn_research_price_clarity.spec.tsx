import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import type {GameCommand,Track} from '../../shared/eclipse/types';
import ResearchWorkspace from '../second-dawn-game/ResearchWorkspace';

afterEach(cleanup);
function fixture(){
 const state=createGame({seed:11,warpPortals:false,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 state.activeSeatId='a';state.technologyMarket=['soliton-cannon'];
 state.seats[0].resources.science=20;
 state.seats[0].technologies={military:['neutron-bombs','starbase','plasma-cannon'],grid:[],nano:[]};
 state.seats[0].minorSpecies=[{id:'researchers'}];
 return getPlayerView(state,'a')!;
}
function show(track:Track|null){
 const view=fixture();
 const purchases=(['military','grid','nano'] as const).map(track=>({command:{type:'research',tileId:'soliton-cannon',track} as GameCommand,label:'Research',description:''}));
 return <ResearchWorkspace view={view} purchases={purchases} selected={track?'soliton-cannon':null} draft={track?purchases.find(p=>p.command.type==='research'&&p.command.track===track)!:null} disabled={false} stale={false} stillLegal acquired={null} onSelect={vi.fn()} onDraft={vi.fn()} onSubmit={vi.fn()}/>;
}
it('shows printed base and minimum alongside the lowest available rare research price',()=>{
 render(show(null));const card=within(screen.getByRole('article',{name:'Soliton Cannon technology'}));
 expect(card.getByText('Base 9')).toBeVisible();
 expect(card.getByText('Minimum 7')).toBeVisible();
 expect(card.getByText(/Best discount/)).toHaveTextContent('Best discount −4');
 expect(card.getByRole('img',{name:/Research cost: from 7 science/})).toBeVisible();
 expect(card.getByText('Minimum price reached')).toBeVisible();
});
it('keeps the cost breakdown on selection and updates it for the chosen track including Minor Species',()=>{
 const ui=render(show('military'));let card=within(screen.getByRole('article',{name:'Soliton Cannon technology'}));
 expect(card.getByText('Base 9')).toBeVisible();expect(card.getByText('Minimum 7')).toBeVisible();
 expect(card.getByText('Discount −4')).toBeVisible();expect(card.getByRole('img',{name:/Research cost: 7 science/})).toBeVisible();
 ui.rerender(show('nano'));card=within(screen.getByRole('article',{name:'Soliton Cannon technology'}));
 expect(card.getByText('Discount −1')).toBeVisible();expect(card.getByRole('img',{name:/Research cost: 8 science/})).toBeVisible();
 expect(card.queryByText('Minimum price reached')).toBeNull();
 expect(card.getByRole('button',{name:'Research · 8 science'})).toBeVisible();
});
