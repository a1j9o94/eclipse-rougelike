import {cleanup,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {SECTORS} from '../../shared/eclipse/sectors';
import GalaxyBoard from '../second-dawn-game/GalaxyBoard';
import type {CommandCandidate} from '../second-dawn-game/SecondDawnBoard';
afterEach(cleanup);
function fixture(){return getPlayerView(createGame({seed:41,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;}
it('labels each frontier with its draw ring before committing exploration',()=>{
 const view=fixture();const candidates:CommandCandidate[]=[1,2,3,4].map(q=>({command:{type:'explore',position:{q,r:0}},label:`Explore ${q}, 0`,description:'Draw sector'}));
 render(<GalaxyBoard view={view} candidates={candidates} selected={null} onSelect={vi.fn()} onExplore={vi.fn()}/>);
 for(const [q,ring] of [[1,'I'],[2,'II'],[3,'III'],[4,'III']] as const){const target=screen.getByRole('button',{name:new RegExp(`Explore.*${q}, 0.*Ring ${ring}$`)});expect(target).toHaveTextContent(`RING ${ring}`);}
});
it('uses influence discs and different discovery and artifact symbols instead of a decorative planet and VP',()=>{
 const view=fixture(),tile=SECTORS.find(tile=>tile.artifacts>0)!;
 view.sectors=[{...view.sectors[0],id:'features',tileId:String(tile.id),owner:'a',discovery:true}];view.ships=[];
 const {container}=render(<GalaxyBoard view={view} candidates={[]} selected={null} onSelect={vi.fn()} onExplore={vi.fn()}/>);
 expect(container.querySelector('.dg-sector-world')).toBeNull();expect(container.querySelector('.dg-sector-vp')).toBeNull();
 expect(screen.getByRole('img',{name:'Terran Directorate influence disc'})).toBeVisible();
 expect(screen.getByRole('img',{name:'Discovery reward available'})).toBeVisible();
 const artifact=screen.getByRole('img',{name:`${tile.artifacts} artifact${tile.artifacts===1?'':'s'}`});expect(artifact).toHaveTextContent(`×${tile.artifacts}`);
 expect(within(artifact).queryByTitle(/Discovery/)).toBeNull();
});
it('keeps distant unmatched exits hidden while revealing the entire selected neighborhood',()=>{
 const view=fixture(),sector={...view.sectors[0],tileId:'1',rotation:0};view.sectors=[{...sector,id:'center',position:{q:0,r:0}},{...sector,id:'near',position:{q:1,r:0}},{...sector,id:'far',position:{q:4,r:0}}];view.ships=[];
 const {container}=render(<GalaxyBoard view={view} candidates={[]} selected="center" onSelect={vi.fn()} onExplore={vi.fn()}/>);
 expect(container.querySelector('[data-galaxy-target="sector:near"]')!.querySelectorAll('[data-wormhole-edge]')).toHaveLength(6);
 expect(container.querySelector('[data-galaxy-target="sector:far"]')!.querySelectorAll('[data-wormhole-edge]')).toHaveLength(0);
 expect(container.querySelectorAll('[data-wormhole-kind="wormhole"]')).toHaveLength(2);
 expect(container.querySelector('[data-wormhole-kind="printed"] .dg-wormhole-opening')).not.toBeNull();
});
