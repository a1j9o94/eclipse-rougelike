// @vitest-environment jsdom
import {cleanup,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import ResearchWorkspace from '../second-dawn-game/ResearchWorkspace';

afterEach(cleanup);
it('orders the available tiles in each track by cost without changing market draws or duplicate counts',()=>{
 const state=createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 state.technologyMarket=['plasma-missile','improved-hull','orbital','absorption-shield','gluon-computer','gauss-shield','nanorobots','conifold-field','fusion-drive','fusion-source','neutron-bombs','conifold-field'];
 const view=getPlayerView(state,'a')!;
 const before=JSON.stringify(view);
 const props={purchases:[],selected:null,draft:null,disabled:false,stale:false,stillLegal:true,acquired:null,onSelect:vi.fn(),onDraft:vi.fn(),onSubmit:vi.fn()};
 const rendered=render(<ResearchWorkspace view={view} {...props}/>);
 const names=(track:string)=>within(screen.getByRole('heading',{name:track,level:2}).parentElement!).getAllByRole('article').map(card=>card.getAttribute('aria-label'));
 expect(names('Military')).toEqual(['Neutron Bombs technology','Gluon Computer technology','Plasma Missile technology']);
 expect(names('Grid')).toEqual(['Gauss Shield technology','Fusion Source technology','Improved Hull technology']);
 expect(names('Nano')).toEqual(['Nanorobots technology','Fusion Drive technology','Orbital technology']);
 expect(names('Rare')).toEqual(['Conifold Field technology','Absorption Shield technology']);
 expect(screen.getByRole('button',{name:/Conifold Field ×2/})).toBeVisible();
 expect(JSON.stringify(view)).toBe(before);
 // A reshuffled public market retains the same visual order; drawing itself is untouched.
 rendered.rerender(<ResearchWorkspace view={{...view,technologyMarket:[...view.technologyMarket].reverse()}} {...props}/>);
 expect(names('Nano')).toEqual(['Nanorobots technology','Fusion Drive technology','Orbital technology']);
 expect(names('Rare')).toEqual(['Conifold Field technology','Absorption Shield technology']);
});
