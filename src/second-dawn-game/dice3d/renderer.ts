import { Color, CanvasTexture, DirectionalLight, Group, HemisphereLight, Mesh, MeshStandardMaterial, PerspectiveCamera, PCFSoftShadowMap, PlaneGeometry, Scene, ShadowMaterial, Vector3, WebGLRenderer, SRGBColorSpace } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {diceLayout, dieFaceNormal, presentationColor, throwPose, type PresentedDie} from './math';

import {BURST_POINTS,eclipseDieFace} from './faces';

import {DICE_THROW_DURATION_MS,DICE_SETTLED_MS,diceThrowDelay} from './timing';

export interface DiceThrowController { dispose:()=>void }
export interface DiceThrowOptions { canvas:HTMLCanvasElement; rolls:readonly PresentedDie[]; onSettled:()=>void; onStarted?:()=>void; onUnavailable:()=>void }
export const MAX_RENDERED_DICE=24;

/** A short, cosmetic 3D throw whose endpoint is the already-authoritative result. */
export function createDiceThrow({canvas,rolls,onSettled,onStarted,onUnavailable}:DiceThrowOptions):DiceThrowController {
  const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});
  if(!context)throw new Error('WebGL2 unavailable');
  const renderer=new WebGLRenderer({canvas,context,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.outputColorSpace=SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=PCFSoftShadowMap;
  const scene=new Scene(),camera=new PerspectiveCamera(38,1,.1,100);
  camera.position.set(0,10,8);camera.lookAt(0,0,0);
  const ambient=new HemisphereLight('#d9eaff','#283040',2.4);scene.add(ambient);
  const light=new DirectionalLight('#ffe6c0',3.6);light.position.set(-4,8,5);light.castShadow=true;
  light.shadow.mapSize.set(512,512);light.shadow.bias=-.0003;light.shadow.normalBias=.02;scene.add(light);
  const rim=new DirectionalLight('#9acbff',1.2);rim.position.set(4,3,-5);scene.add(rim);
  const bodyGeometry=new RoundedBoxGeometry(1,1,1,3,.06);
  const markingGeometry=new PlaneGeometry(.88,.88);
  const materials:MeshStandardMaterial[]=[],textures:CanvasTexture[]=[];
  const markingMaterials=new Map<string,MeshStandardMaterial>();
  function faceMaterial(color:string,face:number):MeshStandardMaterial {
    const key=`${color}:${face}`,cached=markingMaterials.get(key);if(cached)return cached;
    const faceCanvas=document.createElement('canvas');faceCanvas.width=256;faceCanvas.height=256;
    const ctx=faceCanvas.getContext('2d');if(!ctx)throw new Error('Dice face drawing unavailable');
    ctx.scale(6.4,6.4);ctx.fillStyle='#fff8e8';ctx.strokeStyle='#fff8e8';
    const printed=eclipseDieFace(color,face);
    if(printed.number!==undefined){ctx.font='bold 28px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(printed.number),20,21);}
    const points=BURST_POINTS.split(' ').map(pair=>pair.split(',').map(Number));
    const markScale=printed.marks.length>1?.76:1;
    for(const mark of printed.marks) {
      ctx.beginPath();points.forEach(([x,y],index)=>{if(index===0)ctx.moveTo(mark.x+x*markScale,mark.y+y*markScale);else ctx.lineTo(mark.x+x*markScale,mark.y+y*markScale);});ctx.closePath();
      ctx.lineJoin='round';ctx.lineWidth=mark.kind==='backfire'?1.8:.6;
      if(mark.kind==='hit')ctx.fill();ctx.stroke();
    }
    const texture=new CanvasTexture(faceCanvas);texture.colorSpace=SRGBColorSpace;textures.push(texture);
    const material=new MeshStandardMaterial({map:texture,transparent:true,roughness:.5,depthWrite:false});
    markingMaterials.set(key,material);materials.push(material);return material;
  }
  const rendered=rolls.slice(0,MAX_RENDERED_DICE);
  const dice=rendered.map(die=>{
    const group=new Group(),color=new Color(presentationColor(die.color));
    const material=new MeshStandardMaterial({color,metalness:.10,roughness:.28});materials.push(material);
    const body=new Mesh(bodyGeometry,material);body.castShadow=true;body.receiveShadow=true;group.add(body);
    for(let face=1;face<=6;face++) {
      const normal=dieFaceNormal(face),marking=new Mesh(markingGeometry,faceMaterial(die.color,face));
      marking.position.set(normal.x*.501,normal.y*.501,normal.z*.501);
      marking.quaternion.setFromUnitVectors(new Vector3(0,0,1),new Vector3(normal.x,normal.y,normal.z));group.add(marking);
    }
    scene.add(group);return group;
  });
  const floorGeometry=new PlaneGeometry(1,1),floorMaterial=new ShadowMaterial({opacity:.24});
  const floor=new Mesh(floorGeometry,floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-.025;floor.receiveShadow=true;scene.add(floor);
  let layout=diceLayout(rendered.length,canvas.clientWidth||360),disposed=false,frame=0,startedAt:number|null=null;
  function resize() {
    if(disposed)return;
    const width=Math.max(100,window.innerWidth),height=Math.max(100,window.innerHeight);
    layout=diceLayout(rendered.length,Math.min(800,width*.72));
    renderer.setSize(width,height,false);
    const worldHeight=Math.max(8,layout.worldDepth*.8+4.2,(layout.worldWidth+3)/(width/height)),worldWidth=worldHeight*(width/height);
    const distance=worldHeight/(2*Math.tan(19*Math.PI/180));
    camera.aspect=width/height;camera.position.set(0,distance*.79,distance*.61);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
    floor.scale.set(worldWidth+5,layout.worldDepth+7,1);
    light.shadow.camera.left=-worldWidth;light.shadow.camera.right=worldWidth;light.shadow.camera.top=layout.worldDepth+5;light.shadow.camera.bottom=-layout.worldDepth-5;light.shadow.camera.updateProjectionMatrix();
  }
  function dispose() {
    if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',resize);canvas.removeEventListener('webglcontextlost',lostContext);
    bodyGeometry.dispose();markingGeometry.dispose();textures.forEach(texture=>texture.dispose());floorGeometry.dispose();floorMaterial.dispose();materials.forEach(material=>material.dispose());light.shadow.map?.dispose();
    renderer.dispose();renderer.forceContextLoss();scene.clear();
  }
  function lostContext(event:Event) {event.preventDefault();dispose();onUnavailable();}
  canvas.addEventListener('webglcontextlost',lostContext);
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(canvas.parentElement??canvas);window.addEventListener('resize',resize);
  resize();
  function animate(now:number) {
    if(disposed)return;
    if(startedAt===null){startedAt=now;onStarted?.();}const elapsed=now-startedAt;
    dice.forEach((group,index)=>{
      const delay=diceThrowDelay(index),progress=Math.min(1,Math.max(0,(elapsed-delay)/DICE_THROW_DURATION_MS));
      const pose=throwPose(rendered[index],progress,layout.positions[index]);
      group.position.set(pose.x,pose.y,pose.z);group.quaternion.set(pose.rotation.x,pose.rotation.y,pose.rotation.z,pose.rotation.w);
    });
    try{renderer.render(scene,camera);}catch{dispose();onUnavailable();return;}
    if(elapsed<DICE_SETTLED_MS)frame=requestAnimationFrame(animate);else onSettled();
  }
  frame=requestAnimationFrame(animate);
  return {dispose};
}
