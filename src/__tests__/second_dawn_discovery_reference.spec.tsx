// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {createLessRandomDiscoverySupply,createDiscoverySupply,getDiscovery} from '../../shared/eclipse/discoveries';
import EmpireOverview from '../second-dawn-game/EmpireOverview';

afterEach(cleanup);
const callbacks={onSector:vi.fn(),onNavigate:vi.fn(),onBlueprints:vi.fn()};
function fixture(){return getPlayerView(createGame({seed:37,rulesMode:'less-random-v1',seats:[{id:'a',faction:'planta',controller:'human'},{id:'b',faction:'draco',controller:'human'}]}),'a')!;}
function openReference(){fireEvent.click(screen.getByRole('button',{name:'Show discovery tile options'}));return screen.getByRole('region',{name:'Discovery tile options'});}

it('opens every Less Random discovery type from Command Center, with current duplicate counts and revised missile stats',()=>{
 const view=fixture();view.lessRandom!.discoverySupply=['materials','materials','less-random-ion-missile'];
 render(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 expect(screen.queryByRole('article',{name:'Materials Cache'})).toBeNull();
 const reference=openReference();
 expect(within(reference).getAllByRole('article')).toHaveLength(new Set(createLessRandomDiscoverySupply()).size);
 for(const id of new Set(createLessRandomDiscoverySupply()))expect(within(reference).getByRole('article',{name:getDiscovery(id).name})).toBeVisible();
 expect(within(reference).getByRole('article',{name:'Materials Cache'})).toHaveTextContent('2 remaining');
 expect(within(reference).getByRole('article',{name:'Ancient Might'})).toHaveTextContent('Unavailable');
 expect(within(reference).getByRole('article',{name:'Ion Missile'})).toHaveTextContent('3 × 1');
 expect(within(reference).getByRole('article',{name:'Money & Resource Cache'})).toHaveTextContent('Gain 3 money, then choose 3 resources of one type');
 expect(within(reference).getByRole('article',{name:'Accelerated Evolution'})).toHaveTextContent('Choose 5 resources of one type');
 expect(within(reference).queryByText('Ancient Warp Portal')).toBeNull();
 expect(within(reference).queryByText('Rift Conductor')).toBeNull();
 expect(within(reference).getByText(/Keep a tile for 2 VP/)).toBeVisible();
});

it('searches tile names and effects without changing match state or triggering navigation',()=>{
 const view=fixture(),before=JSON.stringify(view);
 render(<EmpireOverview view={view} seatId="b" {...callbacks}/>);
 const reference=openReference(),search=within(reference).getByRole('searchbox',{name:'Find a discovery'});
 fireEvent.change(search,{target:{value:'reputation'}});
 expect(within(reference).getAllByRole('article')).toHaveLength(1);
 expect(within(reference).getByRole('article',{name:'Ancient Might'})).toHaveTextContent('1 VP for every 3 reputation VP');
 fireEvent.change(search,{target:{value:'not-a-tile'}});
 expect(within(reference).getByRole('status')).toHaveTextContent('No discoveries match');
 fireEvent.change(search,{target:{value:''}});
 expect(within(reference).getAllByRole('article')).toHaveLength(new Set(createLessRandomDiscoverySupply()).size);
 expect(JSON.stringify(view)).toBe(before);
 for(const callback of Object.values(callbacks))expect(callback).not.toHaveBeenCalled();
});

it('keeps the full reference available after depletion and updates stock when the public view changes',()=>{
 const view=fixture();view.lessRandom!.discoverySupply=[];
 const ui=render(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 const reference=openReference();
 expect(within(reference).getByText('0 tiles remaining in the public supply')).toBeVisible();
 expect(within(reference).getAllByText('Unavailable')).toHaveLength(new Set(createLessRandomDiscoverySupply()).size);
 view.lessRandom!.discoverySupply=['science'];
 ui.rerender(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 expect(within(reference).getByRole('article',{name:'Science Cache'})).toHaveTextContent('1 remaining');
 fireEvent.click(within(reference).getByRole('button',{name:'Hide discovery tile options'}));
 expect(within(reference).queryByRole('article')).toBeNull();
});

it('does not expose the public discovery reference in Standard mode or claim stock when variant data is missing',()=>{
 const view=fixture();delete view.rulesMode;
 const ui=render(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 expect(screen.queryByRole('region',{name:'Discovery tile options'})).toBeNull();
 view.rulesMode='less-random-v1';delete view.lessRandom;
 ui.rerender(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 expect(screen.queryByRole('region',{name:'Discovery tile options'})).toBeNull();
});


it('shows the Standard inventory when only public discovery choices are enabled',()=>{
 const state=createGame({seed:17,warpPortals:true,riftCannons:true,ruleOptions:{publicDiscoveries:true},seats:[{id:'a',faction:'planta',controller:'human'},{id:'b',faction:'draco',controller:'human'}]});
 render(<EmpireOverview view={getPlayerView(state,'a')!} seatId="a" {...callbacks}/>);
 const reference=openReference();
 expect(within(reference).getAllByRole('article')).toHaveLength(new Set(createDiscoverySupply(true,true)).size);
 expect(within(reference).getByRole('article',{name:'Ancient Warp Portal'})).toBeVisible();
 expect(within(reference).queryByRole('article',{name:'Ancient Might'})).toBeNull();
});
