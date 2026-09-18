export interface GalaxyPoint {x:number;y:number}
export interface GalaxyCamera {zoom:number;center:GalaxyPoint}
export interface GalaxyViewport {x:number;y:number;width:number;height:number;clientLeft:number;clientTop:number;clientWidth:number;clientHeight:number}
export interface GalaxyPointer extends GalaxyPoint {id:number;target:string|null}
export interface GalaxyGesture {
 down:(pointer:GalaxyPointer,camera:GalaxyCamera,viewport:GalaxyViewport)=>void;
 move:(pointer:GalaxyPointer,camera:GalaxyCamera,viewport:GalaxyViewport,maxZoom?:number)=>GalaxyCamera|null;
 up:(id:number)=>string|null;
 cancel:()=>void;
 active:()=>boolean;
 contains:(id:number)=>boolean;
 suppressesClick:()=>boolean;
}
const clamp=(zoom:number,maxZoom:number)=>Math.max(.6,Math.min(maxZoom,zoom));
export function screenToGalaxyViewport(point:GalaxyPoint,viewport:GalaxyViewport):GalaxyPoint {
 const scale=Math.min(viewport.clientWidth/viewport.width,viewport.clientHeight/viewport.height)||1;
 return {x:viewport.x+(point.x-viewport.clientLeft-(viewport.clientWidth-viewport.width*scale)/2)/scale,y:viewport.y+(point.y-viewport.clientTop-(viewport.clientHeight-viewport.height*scale)/2)/scale};
}
export function zoomGalaxyAt(camera:GalaxyCamera,point:GalaxyPoint,viewport:GalaxyViewport,zoom:number,maxZoom=5):GalaxyCamera {
 const next=clamp(zoom,maxZoom),dx=point.x-(viewport.x+viewport.width/2),dy=point.y-(viewport.y+viewport.height/2);
 return {zoom:next,center:{x:camera.center.x+dx/camera.zoom-dx/next,y:camera.center.y+dy/camera.zoom-dy/next}};
}
/** Per-gesture snapshots keep pinch anchors stable without depending on React event timing. */
export function createGalaxyGesture():GalaxyGesture {
 const pointers=new Map<number,GalaxyPointer>();
 let baseline:GalaxyPointer[]=[],startCamera:GalaxyCamera|null=null,startViewport:GalaxyViewport|null=null,lastCamera:GalaxyCamera|null=null;
 let moved=false,suppress=false;
 const rebase=(camera:GalaxyCamera,viewport:GalaxyViewport)=>{baseline=[...pointers.values()].slice(0,2).map(p=>({...p}));startCamera=camera;startViewport=viewport;lastCamera=camera;};
 return {
  down(pointer,camera,viewport){
   if(!pointers.size){moved=false;suppress=false;}
   pointers.set(pointer.id,pointer);if(pointers.size>1){moved=true;suppress=true;}
   rebase(camera,viewport);
  },
  move(pointer,camera,viewport,maxZoom=5){
   if(!pointers.has(pointer.id)||!startCamera||!startViewport)return null;
   pointers.set(pointer.id,{...pointer,target:pointers.get(pointer.id)!.target});
   const current=baseline.map(p=>pointers.get(p.id)).filter((p):p is GalaxyPointer=>!!p);
   if(current.length===1&&baseline.length===1){
    const from=baseline[0],to=current[0];
    if(!moved&&Math.hypot(to.x-from.x,to.y-from.y)<6)return null;
    moved=true;suppress=true;
    const a=screenToGalaxyViewport(from,startViewport),b=screenToGalaxyViewport(to,viewport);
    lastCamera={zoom:startCamera.zoom,center:{x:startCamera.center.x-(b.x-a.x)/startCamera.zoom,y:startCamera.center.y-(b.y-a.y)/startCamera.zoom}};
   }else if(current.length>=2){
    const [a,b]=baseline,[c,d]=current;
    const distance=Math.hypot(b.x-a.x,b.y-a.y);if(distance<1)return null;
    const before=screenToGalaxyViewport({x:(a.x+b.x)/2,y:(a.y+b.y)/2},startViewport),after=screenToGalaxyViewport({x:(c.x+d.x)/2,y:(c.y+d.y)/2},viewport);
    const zoom=clamp(startCamera.zoom*Math.hypot(d.x-c.x,d.y-c.y)/distance,maxZoom);
    lastCamera={zoom,center:{x:startCamera.center.x+(before.x-startViewport.x-startViewport.width/2)/startCamera.zoom-(after.x-viewport.x-viewport.width/2)/zoom,y:startCamera.center.y+(before.y-startViewport.y-startViewport.height/2)/startCamera.zoom-(after.y-viewport.y-viewport.height/2)/zoom}};
   }else {rebase(camera,viewport);return null;}
   return lastCamera;
  },
  up(id){
   const pointer=pointers.get(id);if(!pointer)return null;
   const target=!moved&&pointers.size===1?pointer.target:null;
   pointers.delete(id);suppress=true;
   if(pointers.size&&lastCamera&&startViewport)rebase(lastCamera,startViewport);
   return target;
  },
  cancel(){pointers.clear();baseline=[];startCamera=null;lastCamera=null;moved=true;suppress=true;},
  active:()=>pointers.size>0,
  contains:id=>pointers.has(id),
  suppressesClick:()=>suppress,
 };
}
