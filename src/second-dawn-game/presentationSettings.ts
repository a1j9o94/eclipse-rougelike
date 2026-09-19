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

/** Each new sound channel is explicitly opt-in; corrupt values never enable it. */
function soundPreference(name:string,defaultVolume:number){
 const enabledKey=`eclipse.second-dawn.${name}.v1`,volumeKey=`eclipse.second-dawn.${name}-volume.v1`;
 let sessionEnabled=false,sessionLevel=defaultVolume;
 const bound=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):defaultVolume;
 const readEnabled=()=>{try{return localStorage.getItem(enabledKey)==='on';}catch{return sessionEnabled;}};
 const readVolume=()=>{try{const value=localStorage.getItem(volumeKey);return value===null||value.trim()===''?defaultVolume:bound(Number(value));}catch{return sessionLevel;}};
 const setEnabled=(value:boolean)=>{sessionEnabled=value;try{localStorage.setItem(enabledKey,value?'on':'off');}catch{/* Session fallback. */}window.dispatchEvent(new Event(CHANGE_EVENT));};
 const setVolume=(value:number)=>{sessionLevel=bound(value);try{localStorage.setItem(volumeKey,String(sessionLevel));}catch{/* Session fallback. */}window.dispatchEvent(new Event(CHANGE_EVENT));};
 return {readEnabled,readVolume,useEnabled():readonly [boolean,(value:boolean)=>void]{return [useSyncExternalStore(subscribe,readEnabled,()=>false),setEnabled];},useVolume():readonly [number,(value:number)=>void]{return [useSyncExternalStore(subscribe,readVolume,()=>defaultVolume),setVolume];}};
}
const effects=soundPreference('effects',.35),ambient=soundPreference('ambient',.15);
export const useGameEffectsEnabled=effects.useEnabled,useGameEffectsVolume=effects.useVolume;
export const useAmbientEnabled=ambient.useEnabled,useAmbientVolume=ambient.useVolume;
export const readGameEffectsEnabled=effects.readEnabled,readGameEffectsVolume=effects.readVolume;
