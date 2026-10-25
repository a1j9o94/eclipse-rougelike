import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
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
it('shows the lowest effective rare price before arithmetic inspection',()=>{
 render(show(null));const card=within(screen.getByRole('article',{name:'Soliton Cannon technology'}));
 expect(card.queryByText('Base 9')).not.toBeInTheDocument();
 expect(card.getByRole('img',{name:/Research cost: from 7 science/})).toBeVisible();
 expect(card.queryByText('Minimum price reached')).not.toBeInTheDocument();
});
it('keeps the cost breakdown on selection and updates it for the chosen track including Minor Species',()=>{
 const ui=render(show('military'));let card=within(screen.getByRole('article',{name:'Soliton Cannon technology'}));
 fireEvent.click(card.getByRole('button',{name:'Inspect research price'}));
 expect(card.getByText('Base 9 − discount 4 · minimum 7 → 7 science')).toBeVisible();expect(card.getByRole('img',{name:/Research cost: 7 science/})).toBeVisible();
 ui.rerender(show('nano'));card=within(screen.getByRole('article',{name:'Soliton Cannon technology'}));
 expect(card.getByText('Base 9 − discount 1 · minimum 7 → 8 science')).toBeVisible();expect(card.getByRole('img',{name:/Research cost: 8 science/})).toBeVisible();
 expect(card.queryByText('Minimum price reached')).toBeNull();
 expect(screen.getByRole('button',{name:'Research · 8 science'})).toBeVisible();
});
