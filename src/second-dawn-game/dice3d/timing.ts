export const DICE_THROW_DURATION_MS=1160;
export const DICE_SETTLED_MS=1440;
export const diceThrowDelay=(index:number):number=>Math.min(index*12,120);
export interface DiceImpactCue {atMs:number;strength:number;pan:number}
/** Same four contacts as throwPose; volume grows gently rather than per die. */
export function diceImpactCues(count:number):DiceImpactCue[] {
 const visible=Math.max(0,Math.min(24,Math.floor(count)));
 return Array.from({length:visible},(_,index)=>[.42,.70,.90,1].map((progress,bounce)=>({
  atMs:progress*DICE_THROW_DURATION_MS+diceThrowDelay(index),
  strength:[1,.52,.25,.10][bounce]/Math.sqrt(visible),
  pan:visible===1?0:(index/(visible-1)-.5)*1.2,
 }))).flat().sort((a,b)=>a.atMs-b.atMs);
}
/** A paused/slow browser must not play all missed impacts on its next frame. */
export function impactsBetween(cues:readonly DiceImpactCue[],previous:number,current:number):DiceImpactCue[] {
 return cues.filter(cue=>cue.atMs>previous&&cue.atMs<=current&&current-cue.atMs<90);
}
