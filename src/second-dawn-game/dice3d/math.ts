export interface PresentedDie { id: string; face: number; color: string }
export interface Vec3 { x: number; y: number; z: number }
export interface QuaternionValue extends Vec3 { w: number }
export interface LandingPosition { x: number; z: number }
export interface DiePose extends Vec3 { rotation: QuaternionValue }

export const dieColors: Readonly<Record<string,string>> = { yellow:'#e8bd3e', orange:'#dd7435', blue:'#387dc5', red:'#bf404b', magenta:'#c00082' };
export function presentationColor(color: string): string { return dieColors[color] ?? (/^#[0-9a-f]{6}$/i.test(color) ? color : '#d2b977'); }
export function dieFaceNormal(face: number): Vec3 {
  switch(face) {
    case 1: return {x:0,y:1,z:0};
    case 2: return {x:0,y:0,z:1};
    case 3: return {x:1,y:0,z:0};
    case 4: return {x:-1,y:0,z:0};
    case 5: return {x:0,y:0,z:-1};
    case 6: return {x:0,y:-1,z:0};
    default: throw new RangeError('A displayed D6 face must be an integer from 1 to 6.');
  }
}
function axisRotation(axis:Vec3, angle:number):QuaternionValue {
  const s=Math.sin(angle/2);return {x:axis.x*s,y:axis.y*s,z:axis.z*s,w:Math.cos(angle/2)};
}
function multiply(a:QuaternionValue,b:QuaternionValue):QuaternionValue {
  return {x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z};
}
export function rotateVector(v:Vec3,q:QuaternionValue):Vec3 {
  const result=multiply(multiply(q,{...v,w:0}),{x:-q.x,y:-q.y,z:-q.z,w:q.w});
  return {x:result.x,y:result.y,z:result.z};
}
export function finalDieQuaternion(face:number,yaw=0):QuaternionValue {
  dieFaceNormal(face);
  const rotations:Readonly<Record<number,QuaternionValue>>={
    1:{x:0,y:0,z:0,w:1},2:axisRotation({x:1,y:0,z:0},-Math.PI/2),
    3:axisRotation({x:0,y:0,z:1},Math.PI/2),4:axisRotation({x:0,y:0,z:1},-Math.PI/2),
    5:axisRotation({x:1,y:0,z:0},Math.PI/2),6:axisRotation({x:1,y:0,z:0},Math.PI),
  };
  return multiply(axisRotation({x:0,y:1,z:0},yaw),rotations[face]);
}
/** Local cosmetic variation. Never consumes the game RNG or determines a die face. */
function variation(id:string):number { let hash=2166136261;for(const char of id)hash=Math.imul(hash^char.charCodeAt(0),16777619);hash=Math.imul(hash^(hash>>>16),0x85ebca6b);hash=Math.imul(hash^(hash>>>13),0xc2b2ae35);return ((hash^(hash>>>16))>>>0)/4294967295; }
export function throwPose(die:PresentedDie,progress:number,target:LandingPosition):DiePose {
  const p=Math.min(1,Math.max(0,progress)),v=variation(die.id),remaining=(1-p)**2;
  const final=finalDieQuaternion(die.face,v*Math.PI*2);
  const rotation=multiply(axisRotation({x:Math.SQRT1_2,y:0,z:Math.SQRT1_2},remaining*Math.PI*(5+v*4)),final);
  const axes=[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}];
  const support=.44*axes.reduce((sum,axis)=>sum+Math.abs(rotateVector(axis,rotation).y),0)+.06;
  let height:number;
  if(p<.42)height=2.4*(1-(p/.42)**2);
  else if(p<.70){const t=(p-.42)/.28;height=.68*4*t*(1-t);}
  else if(p<.90){const t=(p-.70)/.20;height=.20*4*t*(1-t);}
  else {const t=(p-.90)/.10;height=.035*4*t*(1-t);}
  return {x:target.x-(1.2+v)*remaining,z:target.z+(1.3-v*.6)*remaining,y:support+height,rotation};
}
export function diceLayout(count:number,width:number):{positions:LandingPosition[];worldWidth:number;worldDepth:number;height:number} {
  const columns=Math.min(Math.max(1,count),Math.max(3,Math.min(10,Math.floor(width/72))));
  const rows=Math.ceil(count/columns),spacing=1.9;
  return {positions:Array.from({length:count},(_,index)=>({x:(index%columns-(Math.min(columns,count-Math.floor(index/columns)*columns)-1)/2)*spacing+(variation(`x-${index}`)-.5)*.4,z:(Math.floor(index/columns)-(rows-1)/2)*spacing+(variation(`z-${index}`)-.5)*.4})),worldWidth:Math.max(5,columns*spacing+2),worldDepth:Math.max(4,rows*spacing+2),height:Math.min(280,Math.max(165,rows*58+65))};
}
export const pipPositions:Readonly<Record<number,readonly (readonly [number,number])[]>>={
  1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[-1,1],[1,-1],[1,1]],
  5:[[-1,-1],[-1,1],[0,0],[1,-1],[1,1]],6:[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]],
};
