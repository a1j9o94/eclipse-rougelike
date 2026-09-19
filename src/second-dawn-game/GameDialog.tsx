import {useEffect,useRef,type ReactNode} from 'react';
import './presentationSettings.css';
export interface GameDialogProps {title:string;onClose:()=>void;children:ReactNode}
export default function GameDialog({title,onClose,children}:GameDialogProps){
 const ref=useRef<HTMLElement>(null);
 useEffect(()=>{const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;ref.current?.focus();return()=>{if(previous?.isConnected)previous.focus();};},[]);
 return <div className="sd-app dg-settings-backdrop dg-recovery-backdrop" onClick={event=>{if(event.target===event.currentTarget)onClose();}}><section ref={ref} className="dg-presentation-settings dg-game-controls" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onKeyDown={event=>{
  if(event.key==='Escape'){event.stopPropagation();onClose();}
  if(event.key==='Tab'){const nodes=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href],select:not(:disabled),[tabindex="0"]')??[]);const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
 }}><header><h2>{title}</h2><button onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}>×</button></header>{children}</section></div>;
}
