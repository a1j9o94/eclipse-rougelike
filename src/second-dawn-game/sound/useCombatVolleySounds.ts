import {useContext,useEffect,useRef} from 'react';
import type {GameEvent} from '../../../shared/eclipse/types';
import {DicePresentationVisibilityContext} from '../dice3d/visibility';
import {useDiceRollScope,useGameEffectsEnabled,useGameEffectsVolume} from '../presentationSettings';
import {playCosmeticCue} from './runtime';
import type {SoundHandle} from './synthesis';
type Volley=NonNullable<GameEvent['combatVolley']>;
const heard=new Set<string>();
function consume(key:string):boolean{if(heard.has(key))return false;heard.add(key);if(heard.size>512)heard.delete(heard.values().next().value!);return true;}
/** Firing and impact sounds are cosmetic, once-only presentations of accepted public volleys. */
export function useCombatVolleySounds({volleys,eligible,awaitingDice,skipped}:{volleys:readonly Volley[];eligible:boolean;awaitingDice:boolean;skipped:boolean}):void{
 const scope=useDiceRollScope(),visible=useContext(DicePresentationVisibilityContext);
 const [effects]=useGameEffectsEnabled(),[volume]=useGameEffectsVolume();
 const key=JSON.stringify([scope,volleys.map(volley=>[volley.battleId,volley.dice.map(die=>[die.id,die.face]),volley.targets.map(target=>[target.id,target.hpAfter])])]);
 const latest=useRef(volleys);latest.current=volleys;
 const state=useRef<{key:string;accepted:boolean;started:boolean}|null>(null);
 const cancel=useRef<()=>void>(()=>{});
 useEffect(()=>{
  const allowed=eligible&&visible&&effects&&volume>0&&!skipped&&!document.hidden;
  if(state.current?.key!==key){state.current={key,accepted:consume(key)&&allowed,started:false};}
  if(!allowed){state.current.accepted=false;cancel.current();return;}
  if(!state.current.accepted||state.current.started||awaitingDice)return;
  state.current.started=true;
  const handles:SoundHandle[]=[];
  const play=(cue:Parameters<typeof playCosmeticCue>[0])=>{const handle=playCosmeticCue(cue);if(handle)handles.push(handle);};
  const dice=latest.current.flatMap(volley=>volley.dice);
  if(dice.some(die=>die.weaponKind==='missile'))play('missile-launch');
  if(dice.some(die=>die.weaponKind==='cannon'))play('cannon-fire');
  const impact=setTimeout(()=>{
   if(document.hidden)return;
   const records=latest.current;
   if(records.some(volley=>volley.targets.some(target=>target.destroyed)))play('explosion');
   else if(records.some(volley=>volley.impacts.some(hit=>hit.hit&&hit.damage>0)))play('impact');
  },350);
  const stop=()=>{clearTimeout(impact);for(const handle of handles)handle.stop();};cancel.current=stop;
  return stop;
 },[key,eligible,visible,effects,volume,awaitingDice,skipped]);
 useEffect(()=>{const hide=()=>{if(document.hidden){if(state.current)state.current.accepted=false;cancel.current();}};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);cancel.current();};},[]);
}
