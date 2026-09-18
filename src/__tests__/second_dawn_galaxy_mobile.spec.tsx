import {expect,it,vi} from 'vitest';
import {fireEvent,render,screen,within} from '@testing-library/react';
import GalaxyBoard from '../second-dawn-game/GalaxyBoard';
import fixturesJson from '../second-dawn-game/reviewFixtures.json?raw';
import {getPlayerView} from '../../shared/eclipse/protocol';
import type {GameState} from '../../shared/eclipse/types';
const state=(JSON.parse(fixturesJson) as Record<string,GameState>).midgame;
const view=getPlayerView(state,state.seats[0].id)!;
it('offers a large sector alternative using the same selection callback and restores keyboard focus',()=>{
 const select=vi.fn();render(<GalaxyBoard compact view={view} candidates={[]} selected={null} onSelect={select} onExplore={()=>{}}/>);
 const toggle=screen.getByRole('button',{name:'Sectors'});fireEvent.click(toggle);
 const list=screen.getByRole('region',{name:'Galaxy sector list'});expect(list).toHaveFocus();
 fireEvent.keyDown(list,{key:'Escape'});expect(toggle).toHaveFocus();expect(screen.queryByRole('region')).toBeNull();
 fireEvent.click(toggle);fireEvent.click(within(screen.getByRole('region')).getByRole('button',{name:new RegExp(`^Sector ${view.sectors[0].tileId} `)}));
 expect(select).toHaveBeenCalledExactlyOnceWith(view.sectors[0].id);
 expect(screen.queryByRole('region')).toBeNull();
});
it('keeps a persisted camera on remount despite an old Fit request and preserves its center while zooming',()=>{
 const camera={zoom:2.4,center:{x:157,y:-93}},changed=vi.fn();
 const props={compact:true,view,candidates:[],selected:null,onSelect:()=>{},onExplore:()=>{},camera,onCameraChange:changed,fitRequest:4};
 const{rerender,container}=render(<GalaxyBoard {...props}/>);
 expect(changed).not.toHaveBeenCalled();expect(container.querySelector('[data-galaxy-camera]')).toHaveAttribute('transform',expect.stringContaining('translate(-157 93)'));
 fireEvent.click(screen.getByRole('button',{name:'Zoom in'}));expect(changed).toHaveBeenLastCalledWith({zoom:2.6,center:camera.center});
 rerender(<GalaxyBoard {...props} fitRequest={5}/>);expect(changed).toHaveBeenLastCalledWith({zoom:1,center:expect.objectContaining({x:expect.any(Number),y:expect.any(Number)})});
});
