import {useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useDiceRollScope} from './presentationSettings';
import {pipPositions,presentationColor,type PresentedDie} from './dice3d/math';
import type {DiceThrowController} from './dice3d/renderer';
import './dice3d/dice3d.css';
import {DicePresentationVisibilityContext} from './dice3d/visibility';
import {useDiceRollSound} from './dice3d/useDiceRollSound';

export interface DiceRoll3DProps {rolls:readonly PresentedDie[];rollId:string;enabled:boolean;skipped?:boolean;onComplete?:()=>void;children?:ReactNode}
const recentThrows=new Set<string>();
function remember(key:string):void {recentThrows.add(key);if(recentThrows.size>256)recentThrows.delete(recentThrows.values().next().value!);}
function useReducedMotion():boolean {
  const [reduced,setReduced]=useState(()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{if(typeof matchMedia!=='function')return;const query=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(query.matches);update();query.addEventListener?.('change',update);return()=>query.removeEventListener?.('change',update);},[]);
  return reduced;
}
/** Optional visual feedback only. The original result controls remain immediately usable. */
export default function DiceRoll3D({rolls,rollId,enabled,skipped=false,onComplete,children}:DiceRoll3DProps) {
  const scope=useDiceRollScope(),key=JSON.stringify([scope,rollId]),reduced=useReducedMotion();
  const [activeKey,setActiveKey]=useState<string|null>(null),[fading,setFading]=useState(false);
  const canvas=useRef<HTMLCanvasElement>(null),latestRolls=useRef(rolls),complete=useRef(onComplete),notified=useRef(new Set<string>());
  latestRolls.current=rolls;complete.current=onComplete;
  const valid=rolls.length>0&&rolls.every(die=>Number.isInteger(die.face)&&die.face>=1&&die.face<=6);
  const visible=useContext(DicePresentationVisibilityContext);
  const allowed=visible&&enabled&&!skipped&&!reduced&&valid;
  const {start:startSound,stop:stopSound}=useDiceRollSound(key,valid?rolls.length:0,allowed,visible);
  useEffect(()=>{if(skipped)stopSound();},[skipped,stopSound]);
  const notify=useCallback((completedKey:string)=>{if(notified.current.has(completedKey))return;notified.current.add(completedKey);complete.current?.();},[]);
  useEffect(()=>{
    if(!visible){setActiveKey(null);return;}
    if(!allowed||recentThrows.has(key)){remember(key);setActiveKey(null);notify(key);return;}
    setFading(false);setActiveKey(key);
  },[key,allowed,visible,notify]);
  useEffect(()=>{
    if(activeKey!==key||!allowed||!canvas.current)return;
    let cancelled=false,controller:DiceThrowController|undefined,fadeTimer:ReturnType<typeof setTimeout>|undefined;
    const target=canvas.current;
    const unavailable=()=>{if(cancelled)return;startSound();remember(key);setActiveKey(null);notify(key);};
    void import('./dice3d/renderer').then(({createDiceThrow})=>{
      if(cancelled)return;
      controller=createDiceThrow({canvas:target,rolls:latestRolls.current,onStarted:startSound,onUnavailable:unavailable,onSettled:()=>{
        if(cancelled)return;setFading(true);notify(key);fadeTimer=setTimeout(()=>setActiveKey(null),140);
      }});
      remember(key);
    }).catch(unavailable);
    return()=>{cancelled=true;if(fadeTimer)clearTimeout(fadeTimer);controller?.dispose();};
  },[activeKey,key,allowed,notify,startSound]);
  function skip() {stopSound();remember(key);setActiveKey(null);notify(key);}
  return <>
    {children??<div className="dg-dice-static" role="group" aria-label="Dice results">{rolls.map(die=><span key={die.id} className="dg-dice-static-face" role="img" aria-label={`${die.color.charAt(0).toUpperCase()+die.color.slice(1)} die: ${die.face}`} style={{backgroundColor:presentationColor(die.color)}}><svg viewBox="0 0 40 40" aria-hidden="true">{(pipPositions[die.face]??[]).map(([x,y],index)=><circle key={index} cx={20+x*10} cy={20+y*10} r="3.2"/>)}</svg><span className="dg-dice-screen-reader">{die.face}</span></span>)}</div>}
    {activeKey===key&&allowed&&createPortal(<div className={`dg-dice-overlay${fading?' is-settled':''}`} data-roll-id={rollId}>
      <canvas ref={canvas} aria-hidden="true"/>
      <button type="button" className="dg-dice-skip" onClick={skip}>Skip dice animation</button>
      {rolls.length>24&&<span className="dg-dice-overflow">24 dice animated · all {rolls.length} results remain available</span>}
    </div>,document.body)}
  </>;
}
