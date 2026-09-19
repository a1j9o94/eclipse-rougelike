import {describe, expect, it} from 'vitest';
import {dieFaceNormal, finalDieQuaternion, rotateVector, throwPose, diceLayout} from '../second-dawn-game/dice3d/math';

describe('authoritative D6 presentation',()=>{
 it('puts every requested face upward after an arbitrary final yaw',()=>{
  for(let face=1;face<=6;face++)for(const yaw of [0,.6,2.7,5.1]){
   const normal=rotateVector(dieFaceNormal(face),finalDieQuaternion(face,yaw));
   expect(normal.x).toBeCloseTo(0,10);expect(normal.y).toBeCloseTo(1,10);expect(normal.z).toBeCloseTo(0,10);
  }
 });
 it('uses opposite faces totaling seven',()=>{
  for(let face=1;face<=6;face++){
   const a=dieFaceNormal(face),b=dieFaceNormal(7-face);
   expect(a.x+b.x).toBe(0);expect(a.y+b.y).toBe(0);expect(a.z+b.z).toBe(0);
  }
 });
 it('settles deterministically to the given result and position without changing input',()=>{
  const die={id:'authoritative',face:5,color:'blue'};
  const target={x:2,z:-1};
  expect(throwPose(die,1,target)).toEqual(throwPose(die,1,target));
  const pose=throwPose(die,1,target),normal=rotateVector(dieFaceNormal(die.face),pose.rotation);
  expect(normal.y).toBeCloseTo(1);expect(pose.x).toBe(2);expect(pose.z).toBe(-1);expect(pose.y).toBeCloseTo(.5);
  expect(die).toEqual({id:'authoritative',face:5,color:'blue'});
 });
 it('bounces and keeps the whole rounded die above the tray through the throw',()=>{
  for(let face=1;face<=6;face++)for(let step=0;step<=100;step++){
   const pose=throwPose({id:`die-${face}`,face,color:'red'},step/100,{x:0,z:0});
   const support=.44*[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}].reduce((sum,axis)=>sum+Math.abs(rotateVector(axis,pose.rotation).y),0)+.06;
   expect(pose.y).toBeGreaterThanOrEqual(support-1e-10);
  }
 });
 it('provides distinct in-bounds landing positions for narrow and wide trays',()=>{
  for(const width of [290,900]){
   const layout=diceLayout(24,width);
   expect(layout.positions).toHaveLength(24);
   expect(new Set(layout.positions.map(p=>`${p.x}/${p.z}`)).size).toBe(24);
   expect(layout.positions.every(p=>Math.abs(p.x)+.8<=layout.worldWidth/2&&Math.abs(p.z)+.8<=layout.worldDepth/2)).toBe(true);
  }
 });
});
