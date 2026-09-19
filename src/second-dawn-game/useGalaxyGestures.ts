import {useEffect,useRef} from 'react';
import type {RefObject,PointerEvent as ReactPointerEvent,MouseEvent as ReactMouseEvent} from 'react';
import {createGalaxyGesture,screenToGalaxyViewport,zoomGalaxyAt,type GalaxyCamera,type GalaxyViewport} from './galaxyGestures';
interface Options {svgRef:RefObject<SVGSVGElement|null>;camera:GalaxyCamera;viewport:{x:number;y:number;width:number;height:number};maxZoom:number;onCameraChange:(camera:GalaxyCamera)=>void;onTap:(target:string)=>void}
export function useGalaxyGestures({svgRef,camera,viewport,maxZoom,onCameraChange,onTap}:Options){
 const gesture=useRef(createGalaxyGesture());
 const currentCamera=useRef(camera);currentCamera.current=camera;
 const dimensions=(svg:SVGSVGElement):GalaxyViewport=>{const rect=svg.getBoundingClientRect();return {...viewport,clientLeft:rect.left,clientTop:rect.top,clientWidth:rect.width,clientHeight:rect.height};};
 const latest=useRef({viewport,maxZoom,onCameraChange});latest.current={viewport,maxZoom,onCameraChange};
 useEffect(()=>{
  const svg=svgRef.current;if(!svg)return;
  let safariStart:{camera:GalaxyCamera;scale:number}|null=null,lastSafariEnd=-Infinity;
  const dimensions=():GalaxyViewport=>{const rect=svg.getBoundingClientRect();return {...latest.current.viewport,clientLeft:rect.left,clientTop:rect.top,clientWidth:rect.width,clientHeight:rect.height};};
  const apply=(next:GalaxyCamera)=>{currentCamera.current=next;latest.current.onCameraChange(next);};
  const wheel=(event:WheelEvent)=>{
   // Native listeners must be non-passive: React wheel listeners cannot reliably
   // cancel the browser's page zoom during a Mac trackpad pinch.
   event.preventDefault();
   if(gesture.current.active()||safariStart||performance.now()-lastSafariEnd<100)return;
   const bounds=dimensions();
   if(!event.ctrlKey){
    const dx=event.deltaX*(event.deltaMode===1?16:event.deltaMode===2?bounds.clientWidth:1);
    const dy=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?bounds.clientHeight:1);
    const scale=Math.min(bounds.clientWidth/bounds.width,bounds.clientHeight/bounds.height)*currentCamera.current.zoom;
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(scale)||scale<=0)return;
    const current=currentCamera.current;
    apply({...current,center:{x:current.center.x+dx/scale,y:current.center.y+dy/scale}});
    return;
   }
   const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?bounds.clientHeight:1);
   if(!Number.isFinite(pixels))return;
   const point=screenToGalaxyViewport({x:event.clientX,y:event.clientY},bounds);
   apply(zoomGalaxyAt(currentCamera.current,point,bounds,currentCamera.current.zoom*Math.exp(-pixels*.01),latest.current.maxZoom));
  };
  // Safari exposes cumulative GestureEvent scales instead of ctrl-wheel on
  // some macOS versions. A single gesture owns zoom so both streams never add.
  type SafariGestureEvent=Event&{scale?:number;clientX?:number;clientY?:number};
  const safari=(event:SafariGestureEvent)=>{
   if(gesture.current.active())return;
   const scale=event.scale;if(scale===undefined||!Number.isFinite(scale)||scale<=0)return;
   event.preventDefault();
   if(event.type==='gesturestart'){safariStart={camera:currentCamera.current,scale};return;}
   if(event.type==='gestureend'){safariStart=null;lastSafariEnd=performance.now();return;}
   if(!safariStart)return;
   const bounds=dimensions();
   const point=screenToGalaxyViewport({x:event.clientX??bounds.clientLeft+bounds.clientWidth/2,y:event.clientY??bounds.clientTop+bounds.clientHeight/2},bounds);
   apply(zoomGalaxyAt(safariStart.camera,point,bounds,safariStart.camera.zoom*scale/safariStart.scale,latest.current.maxZoom));
  };
  svg.addEventListener('wheel',wheel,{passive:false});
  for(const type of ['gesturestart','gesturechange','gestureend'])svg.addEventListener(type,safari,{passive:false});
  return()=>{
   svg.removeEventListener('wheel',wheel);
   for(const type of ['gesturestart','gesturechange','gestureend'])svg.removeEventListener(type,safari);
  };
 },[svgRef]);
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
