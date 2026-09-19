import {useEffect,useRef,type ReactNode} from 'react';
import './presentationSettings.css';
export interface GameDialogProps {title:string;onClose:()=>void;children:ReactNode;dismissOnBackdrop?:boolean;closeLabel?:string;className?:string;focusPrimary?:boolean}
export default function GameDialog({title,onClose,children,dismissOnBackdrop=true,closeLabel,className='',focusPrimary=false}:GameDialogProps){
 const ref=useRef<HTMLElement>(null);
 useEffect(()=>{const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;const primary=focusPrimary?ref.current?.querySelector<HTMLElement>('.dg-primary:not(:disabled)'):null;(primary??ref.current)?.focus();return()=>{if(previous?.isConnected)previous.focus();};},[focusPrimary]);
 return <div className="sd-app dg-settings-backdrop dg-recovery-backdrop" onClick={event=>{if(dismissOnBackdrop&&event.target===event.currentTarget)onClose();}}><section ref={ref} className={`dg-presentation-settings dg-game-controls ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onKeyDown={event=>{
  if(event.key==='Escape'){event.stopPropagation();onClose();}
  if(event.key==='Tab'){const nodes=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href],select:not(:disabled),[tabindex="0"]')??[]);event.preventDefault();const index=nodes.findIndex(node=>node===document.activeElement);const next=event.shiftKey?(index<=0?nodes.length-1:index-1):(index+1)%nodes.length;(nodes[next]??ref.current)?.focus();}
 }}><header><h2>{title}</h2><button onClick={onClose} aria-label={closeLabel??`Close ${title.toLowerCase()}`}>×</button></header>{children}</section></div>;
}
