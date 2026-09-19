import {createContext,useContext,useCallback,useSyncExternalStore} from 'react';
const DICE_KEY='eclipse.second-dawn.dice3d.v1';
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
