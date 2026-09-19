import {expect,it} from 'vitest';
import {diceImpactCues,impactsBetween} from '../second-dawn-game/dice3d/timing';
it('matches each visible bounce and softens toward settling',()=>{
 const cues=diceImpactCues(1);
 expect(cues.map(cue=>cue.atMs)).toEqual([487.2,812,1044,1160]);
 expect(cues.every((cue,index)=>index===0||cue.strength<cues[index-1].strength)).toBe(true);
});
it('caps large volleys and normalizes their impact strength',()=>{
 expect(diceImpactCues(100)).toHaveLength(96);
 expect(diceImpactCues(24)[0].strength).toBeLessThan(diceImpactCues(1)[0].strength);
 expect(diceImpactCues(0)).toEqual([]);
});
it('emits crossed impacts once and drops a stalled frame backlog',()=>{
 const cues=diceImpactCues(1);
 expect(impactsBetween(cues,480,500)).toEqual([cues[0]]);
 expect(impactsBetween(cues,500,516)).toEqual([]);
 expect(impactsBetween(cues,0,1500)).toEqual([]);
});
