import {describe, expect, it} from 'vitest';
import {createGalaxyGesture, screenToGalaxyViewport, zoomGalaxyAt} from '../second-dawn-game/galaxyGestures';
import type {GalaxyCamera, GalaxyViewport} from '../second-dawn-game/galaxyGestures';

const viewport:GalaxyViewport={x:0,y:0,width:400,height:200,clientLeft:10,clientTop:20,clientWidth:800,clientHeight:400};
const camera:GalaxyCamera={zoom:1,center:{x:200,y:100}};
const pointer=(id:number,x:number,y:number,target:string|null='sector:1')=>({id,x,y,target});
describe('galaxy touch camera',()=>{
 it('converts pointer coordinates through SVG letterboxing',()=>{
  expect(screenToGalaxyViewport({x:410,y:220},viewport)).toEqual({x:200,y:100});
  expect(screenToGalaxyViewport({x:410,y:220},{...viewport,clientHeight:800})).toEqual({x:200,y:0});
 });
 it('pans one finger in world coordinates while preserving zoom and suppressing the trailing tap',()=>{
  const gesture=createGalaxyGesture();gesture.down(pointer(1,210,120),camera,viewport);
  expect(gesture.move(pointer(1,214,121),camera,viewport)).toBeNull();
  const moved=gesture.move(pointer(1,250,140),camera,viewport)!;
  expect(moved).toEqual({zoom:1,center:{x:180,y:90}});
  expect(gesture.up(1)).toBeNull();expect(gesture.suppressesClick()).toBe(true);
 });
 it('keeps the world point beneath the moving pinch midpoint anchored',()=>{
  const gesture=createGalaxyGesture();gesture.down(pointer(1,210,220),camera,viewport);gesture.down(pointer(2,610,220),camera,viewport);
  const changed=gesture.move(pointer(2,810,220),camera,viewport)!;
  expect(changed.zoom).toBeCloseTo(1.5);
  // Midpoint moves from SVG x=200 to x=250. Its world point stays x=200.
  expect(changed.center.x+(250-200)/changed.zoom).toBeCloseTo(200);
  expect(gesture.up(1)).toBeNull();expect(gesture.up(2)).toBeNull();
 });
 it('never converts the remaining finger after a pinch into a tap',()=>{
  const gesture=createGalaxyGesture();gesture.down(pointer(1,200,200),camera,viewport);gesture.down(pointer(2,400,200),camera,viewport);
  gesture.up(2);expect(gesture.up(1)).toBeNull();
  gesture.down(pointer(3,200,200,'sector:3'),camera,viewport);
  expect(gesture.up(3)).toBe('sector:3');
 });
 it('cancels pointers without selecting, then accepts the next intentional tap',()=>{
  const gesture=createGalaxyGesture();gesture.down(pointer(1,200,200),camera,viewport);gesture.cancel();
  expect(gesture.up(1)).toBeNull();expect(gesture.suppressesClick()).toBe(true);
  gesture.down(pointer(2,200,200,'frontier:0'),camera,viewport);expect(gesture.up(2)).toBe('frontier:0');
 });
 it('zooms at an explicit point without changing its world position and clamps the range',()=>{
  const result=zoomGalaxyAt(camera,{x:300,y:100},viewport,20,5);
  expect(result.zoom).toBe(5);expect(result.center.x+(300-200)/5).toBe(300);
  expect(zoomGalaxyAt(camera,{x:200,y:100},viewport,.1,5).zoom).toBe(.6);
 });
});
