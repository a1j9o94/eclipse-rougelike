// @vitest-environment jsdom
import {cleanup,fireEvent,render} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {SECTORS} from '../../shared/eclipse/sectors';
import {displayedWormholes} from '../second-dawn-game/visibleConnections';
import GalaxyBoard from '../second-dawn-game/GalaxyBoard';
afterEach(cleanup);
function fixture(){const view=getPlayerView(createGame({seed:41,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;const tile=SECTORS.find(t=>t.wormholes.includes(0)&&!t.wormholes.includes(3))!;const from={...view.sectors[0],id:'from',tileId:'1',rotation:0,position:{q:0,r:0}};const to={...from,id:'to',tileId:String(tile.id),position:{q:1,r:0}};view.sectors=[from,to];return{view,from,to};}
it('hides unmatched openings and frontier openings on the normal board',()=>{
 const {view,from,to}=fixture();expect(displayedWormholes(view,from)).toEqual([]);expect(displayedWormholes(view,to)).toEqual([]);
});
it('shows paired edges and technology-enabled connections on both sides',()=>{
 const {view,from,to}=fixture();view.seats[0].technologies.nano.push('wormhole-generator');
 expect(displayedWormholes(view,from)).toEqual([{edge:0,kind:'generator'}]);expect(displayedWormholes(view,to)).toEqual([{edge:3,kind:'generator'}]);
 to.tileId='1';expect(displayedWormholes(view,from)).toEqual([{edge:0,kind:'wormhole'}]);expect(displayedWormholes(view,to)).toEqual([{edge:3,kind:'wormhole'}]);
});
it('shows all printed openings while placing a sector without mutating its rotation',()=>{
 const {view,from}=fixture();from.rotation=2;const before=JSON.stringify(view);expect(displayedWormholes(view,from,true)).toHaveLength(6);expect(JSON.stringify(view)).toBe(before);
});
it('renders solid unconnected edges normally and visible openings in placement mode',()=>{
 const {view}=fixture();const props={view,candidates:[],selected:null,onSelect:vi.fn(),onExplore:vi.fn()};const ui=render(<GalaxyBoard {...props}/>);
 expect(ui.container.querySelectorAll('[data-wormhole-edge]')).toHaveLength(0);
 ui.rerender(<GalaxyBoard {...props} showPrintedWormholes/>);expect(ui.container.querySelectorAll('[data-wormhole-edge]').length).toBeGreaterThan(6);
});

it('reveals every rotated printed opening on the selected sector only',()=>{
 const {view,from}=fixture();from.rotation=2;const before=JSON.stringify(view);
 const props={view,candidates:[],onSelect:vi.fn(),onExplore:vi.fn()};
 const ui=render(<GalaxyBoard {...props} selected={from.id}/>);
 expect(ui.container.querySelector('[data-galaxy-target="sector:from"]')!.querySelectorAll('[data-wormhole-edge]')).toHaveLength(6);
 expect(ui.container.querySelector('[data-galaxy-target="sector:to"]')!.querySelectorAll('[data-wormhole-edge]')).toHaveLength(0);
 ui.rerender(<GalaxyBoard {...props} selected={null}/>);
 expect(ui.container.querySelectorAll('[data-wormhole-edge]')).toHaveLength(0);
 expect(JSON.stringify(view)).toBe(before);
});
it('reveals openings on pointer hover and keyboard focus without selecting or moving',()=>{
 const {view}=fixture(),onSelect=vi.fn();const ui=render(<GalaxyBoard view={view} candidates={[]} selected={null} onSelect={onSelect} onExplore={vi.fn()}/>);
 const tile=ui.container.querySelector('[data-galaxy-target="sector:from"]')!;
 fireEvent.pointerEnter(tile,{pointerType:'mouse'});expect(tile.querySelectorAll('[data-wormhole-edge]')).toHaveLength(6);
 fireEvent.pointerLeave(tile);expect(tile.querySelectorAll('[data-wormhole-edge]')).toHaveLength(0);
 fireEvent.focus(tile);expect(tile.querySelectorAll('[data-wormhole-edge]')).toHaveLength(6);
 fireEvent.blur(tile);expect(tile.querySelectorAll('[data-wormhole-edge]')).toHaveLength(0);
 expect(onSelect).not.toHaveBeenCalled();
});
it('keeps real connections distinct from unconnected printed openings when highlighted',()=>{
 const {view,from,to}=fixture();to.tileId='1';
 const holes=displayedWormholes(view,from,true);
 expect(holes).toContainEqual({edge:0,kind:'wormhole'});
 expect(holes.filter(hole=>hole.kind==='printed')).toHaveLength(5);
});
