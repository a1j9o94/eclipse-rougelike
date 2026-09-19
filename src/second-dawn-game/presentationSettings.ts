import {createContext,useContext,useCallback,useSyncExternalStore} from 'react';
const DICE_KEY='eclipse.second-dawn.dice3d.v1';
const SOUND_KEY='eclipse.second-dawn.dice-sound.v1';
const VOLUME_KEY='eclipse.second-dawn.dice-volume.v1';
const DEFAULT_VOLUME=.6;
let sessionSound=true;
let sessionVolume=DEFAULT_VOLUME;
const CHANGE_EVENT='eclipse-presentation-settings';
let sessionDice=true;
function readDice():boolean {
 try{return localStorage.getItem(DICE_KEY)!=='off';}catch{return sessionDice;}
}
function subscribe(listener:()=>void):()=>void {
 window.addEventListener('storage',listener);window.addEventListener(CHANGE_EVENT,listener);
 return ()=>{window.removeEventListener('storage',listener);window.removeEventListener(CHANGE_EVENT,listener);};
}
/** Preference syncs across mounted views/tabs; blocked storage keeps a session fallback. */
export function useDice3dEnabled():readonly [boolean,(enabled:boolean)=>void] {
 const enabled=useSyncExternalStore(subscribe,readDice,()=>true);
 const setEnabled=useCallback((value:boolean)=>{sessionDice=value;try{localStorage.setItem(DICE_KEY,value?'on':'off');}catch{/* Session preference remains available. */}window.dispatchEvent(new Event(CHANGE_EVENT));},[]);
 return [enabled,setEnabled];
}

export const DiceRollScopeContext=createContext('standalone');
export function useDiceRollScope():string{return useContext(DiceRollScopeContext);}

function boundedVolume(value:number):number{return Number.isFinite(value)?Math.max(0,Math.min(1,value)):DEFAULT_VOLUME;}
export function readDiceSoundEnabled():boolean {
 try{return localStorage.getItem(SOUND_KEY)!=='off';}catch{return sessionSound;}
}
export function readDiceSoundVolume():number {
 try{const saved=localStorage.getItem(VOLUME_KEY);return saved===null||saved.trim()===''?DEFAULT_VOLUME:boundedVolume(Number(saved));}catch{return sessionVolume;}
}
export function useDiceSoundEnabled():readonly [boolean,(enabled:boolean)=>void] {
 const enabled=useSyncExternalStore(subscribe,readDiceSoundEnabled,()=>true);
 const setEnabled=useCallback((value:boolean)=>{sessionSound=value;try{localStorage.setItem(SOUND_KEY,value?'on':'off');}catch{/* Session preference remains available. */}window.dispatchEvent(new Event(CHANGE_EVENT));},[]);
 return [enabled,setEnabled];
}
export function useDiceSoundVolume():readonly [number,(volume:number)=>void] {
 const volume=useSyncExternalStore(subscribe,readDiceSoundVolume,()=>DEFAULT_VOLUME);
 const setVolume=useCallback((value:number)=>{sessionVolume=boundedVolume(value);try{localStorage.setItem(VOLUME_KEY,String(sessionVolume));}catch{/* Session preference remains available. */}window.dispatchEvent(new Event(CHANGE_EVENT));},[]);
 return [volume,setVolume];
}
