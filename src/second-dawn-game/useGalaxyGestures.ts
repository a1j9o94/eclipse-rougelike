import {useRef} from 'react';
import type {PointerEvent as ReactPointerEvent,MouseEvent as ReactMouseEvent} from 'react';
import {createGalaxyGesture,type GalaxyCamera,type GalaxyViewport} from './galaxyGestures';
interface Options {camera:GalaxyCamera;viewport:{x:number;y:number;width:number;height:number};maxZoom:number;onCameraChange:(camera:GalaxyCamera)=>void;onTap:(target:string)=>void}
export function useGalaxyGestures({camera,viewport,maxZoom,onCameraChange,onTap}:Options){
 const gesture=useRef(createGalaxyGesture());
 const currentCamera=useRef(camera);currentCamera.current=camera;
 const dimensions=(svg:SVGSVGElement):GalaxyViewport=>{const rect=svg.getBoundingClientRect();return {...viewport,clientLeft:rect.left,clientTop:rect.top,clientWidth:rect.width,clientHeight:rect.height};};
 return {
  onPointerDown(event:ReactPointerEvent<SVGSVGElement>){
   if(event.button!==0)return;
   const target=event.target instanceof Element?event.target.closest('[data-galaxy-target]')?.getAttribute('data-galaxy-target')??null:null;
   gesture.current.down({id:event.pointerId,x:event.clientX,y:event.clientY,target},currentCamera.current,dimensions(event.currentTarget));
   try{event.currentTarget.setPointerCapture(event.pointerId);}catch{/* Synthetic events and a canceled browser pointer may have no capture target. */}
  },
  onPointerMove(event:ReactPointerEvent<SVGSVGElement>){
   const next=gesture.current.move({id:event.pointerId,x:event.clientX,y:event.clientY,target:null},currentCamera.current,dimensions(event.currentTarget),maxZoom);
   if(next){currentCamera.current=next;onCameraChange(next);}
  },
  onPointerUp(event:ReactPointerEvent<SVGSVGElement>){
   const target=gesture.current.up(event.pointerId);
   try{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}catch{/* The browser can release capture before this handler runs. */}
   if(target)onTap(target);
  },
  onPointerCancel(){gesture.current.cancel();},
  onLostPointerCapture(event:ReactPointerEvent<SVGSVGElement>){if(gesture.current.contains(event.pointerId))gesture.current.cancel();},
  onClickCapture(event:ReactMouseEvent<SVGSVGElement>){if(event.detail>0&&gesture.current.suppressesClick()){event.preventDefault();event.stopPropagation();}},
 };
}
