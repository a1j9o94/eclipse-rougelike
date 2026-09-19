/** Printed Eclipse combat dice. Face indices preserve the engine's existing D6 results.
 * Source: Eclipse Second Dawn rulebook, Combat; Eclipse2_RC_rules_web.pdf, Dice Rules.
 * Presentation only: never resolves hits or consumes randomness.
 */
export interface DieMark {kind:'hit'|'backfire'; x:number; y:number}
export interface EclipseFace {number?:number; marks:readonly DieMark[]; label:string}
export const BURST_POINTS='0,-9 2.8,-4.3 7,-5.6 5,0 8,4.4 2.9,4.5 0,9 -2.9,4.5 -8,4.4 -5,0 -7,-5.6 -2.8,-4.3';
const damageByColor:Readonly<Record<string,number>>={yellow:1,orange:2,blue:3,red:4};
const positions:Readonly<Record<number,readonly (readonly [number,number])[]>>={
  1:[[20,20]],2:[[11,20],[29,20]],3:[[12,11],[28,20],[12,29]],4:[[11,11],[29,11],[11,29],[29,29]],
};
export function eclipseDieFace(color:string,face:number):EclipseFace {
  const name=color.charAt(0).toUpperCase()+color.slice(1);
  if(color==='magenta') {
    const hits=face===3?1:face===4?2:face===5?3:0,backfire=face===5||face===6;
    const count=hits+(backfire?1:0);
    const marks=(positions[count]??[]).map(([x,y],index):DieMark=>({x,y,kind:index<hits?'hit':'backfire'}));
    return {marks,label:`Rift die: ${count?`${hits} damage${backfire?', 1 self-damage':''}`:'blank, miss'}`};
  }
  if(face===1)return {marks:[],label:`${name} die: blank, natural 1 always misses`};
  if(face===6&&damageByColor[color])return {marks:positions[damageByColor[color]].map(([x,y])=>({x,y,kind:'hit'})),label:`${name} die: ${damageByColor[color]} damage, natural 6 always hits`};
  return {number:face,marks:[],label:`${name} die: ${face}`};
}
