import {useRef, useState} from 'react';
import {act, cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useGalaxyGestures} from '../second-dawn-game/useGalaxyGestures';
import type {GalaxyCamera} from '../second-dawn-game/galaxyGestures';

function MapHarness() {
 const svgRef=useRef<SVGSVGElement>(null);
 const [camera,setCamera]=useState<GalaxyCamera>({zoom:1,center:{x:200,y:100}});
 const gestures=useGalaxyGestures({svgRef,camera,viewport:{x:0,y:0,width:400,height:200},maxZoom:3,onCameraChange:setCamera,onTap:()=>{}});
 return <><svg ref={svgRef} aria-label="Galaxy map" {...gestures}/><output>{JSON.stringify(camera)}</output></>;
}
function camera():GalaxyCamera{return JSON.parse(document.querySelector('output')!.textContent!);}
function mount(){
 render(<MapHarness/>);
 const map=screen.getByLabelText('Galaxy map');
 vi.spyOn(map,'getBoundingClientRect').mockReturnValue({x:10,y:20,left:10,top:20,right:810,bottom:420,width:800,height:400,toJSON:()=>({})});
 return map;
}
function wheel(target:Element,deltaY:number,options:WheelEventInit={}){
 const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:610,clientY:220,ctrlKey:true,deltaY,...options});
 act(()=>{target.dispatchEvent(event);});return event;
}
function safari(target:Element,type:string,scale:number){
 const event=new Event(type,{bubbles:true,cancelable:true});
 Object.assign(event,{scale,clientX:610,clientY:220});
 act(()=>{target.dispatchEvent(event);});return event;
}
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe('Mac trackpad galaxy zoom',()=>{
 it('handles native ctrl-wheel pinch inside the map and anchors the world under the cursor',()=>{
  const map=mount(),event=wheel(map,-100);
  expect(event.defaultPrevented).toBe(true);
  expect(camera().zoom).toBeGreaterThan(1);
  expect(camera().center.x+100/camera().zoom).toBeCloseTo(300);
  expect(camera().center.y).toBe(100);
 });
 it('leaves ordinary scrolling and pinch outside the map to the browser',()=>{
  const map=mount();
  expect(wheel(map,-100,{ctrlKey:false}).defaultPrevented).toBe(false);
  expect(wheel(document.body,-100).defaultPrevented).toBe(false);
  expect(camera().zoom).toBe(1);
 });
 it('normalizes line and page deltas and honors the map zoom limits',()=>{
  const map=mount();wheel(map,-1,{deltaMode:1});const line=camera().zoom;
  cleanup();const second=mount();wheel(second,-16);expect(camera().zoom).toBeCloseTo(line);
  wheel(second,-10,{deltaMode:2});expect(camera().zoom).toBe(3);
  wheel(second,10,{deltaMode:2});expect(camera().zoom).toBe(.6);
 });
 it('supports Safari cumulative gesture scale without applying matching ctrl-wheel events twice',()=>{
  const map=mount();expect(safari(map,'gesturestart',1).defaultPrevented).toBe(true);
  safari(map,'gesturechange',1.5);expect(camera().zoom).toBe(1.5);
  expect(wheel(map,-100).defaultPrevented).toBe(true);expect(camera().zoom).toBe(1.5);
  safari(map,'gesturechange',2);expect(camera().zoom).toBe(2);
  expect(camera().center.x+100/camera().zoom).toBeCloseTo(300);
  safari(map,'gestureend',2);wheel(map,-20);expect(camera().zoom).toBe(2);
 });
 it('uses the latest camera across consecutive wheel events and removes listeners on unmount',()=>{
  const map=mount();wheel(map,-50);const first=camera().zoom;wheel(map,-50);expect(camera().zoom).toBeCloseTo(first*first);
  cleanup();expect(wheel(map,-50).defaultPrevented).toBe(false);
 });
});
