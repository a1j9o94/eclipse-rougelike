import {useEffect,useRef,useState,type MouseEvent} from 'react';
import type {GameCommand} from '../../../shared/eclipse/types';
import type {PublicHistoryEntry} from '../../../shared/eclipse/history';
import {useDiceRollScope} from '../presentationSettings';
import {playCosmeticCue,stopCosmeticCues} from './runtime';
import type {CosmeticCue} from './synthesis';
export interface AcceptedSoundReceipt {revision:number;type:GameCommand['type']}
export interface SoundFeedbackOptions {revision:number;connected:boolean;busy:boolean;status:string;receipt?:AcceptedSoundReceipt;aiEntry:PublicHistoryEntry|null;aiVisible:boolean;reviewing:boolean}
export function commandSound(command:GameCommand):CosmeticCue|null{
 if(command.type==='trade-and-act')return commandSound(command.action);
 if(command.type==='set-auto-pass'||command.type==='resolve'&&(command.choice.kind==='combat-turn'||command.choice.kind==='combat-allocation'))return null;
 if(command.type==='move')return 'move';
 if(command.type==='upgrade'||command.type==='research')return 'install';
 if(command.type==='build')return 'tile';
 if(command.type==='resolve'&&command.choice.kind==='exploration')return command.choice.tileId!==null&&!command.choice.drawAnother?'tile':null;
 return 'confirm';
}
let previewInstance=0;
const consumed=new Set<string>();
function consume(key:string):boolean{if(consumed.has(key))return false;consumed.add(key);if(consumed.size>512)consumed.delete(consumed.values().next().value!);return true;}
/** Human success is receipt-driven; AI feedback uses only the currently visible public presentation. */
export interface GameSoundFeedback {combatLive(revision:number):boolean;submitted(command:GameCommand):void;rejected():void;capture():void;clicked(event:MouseEvent<HTMLElement>):void}
export function useGameSoundFeedback(options:SoundFeedbackOptions):GameSoundFeedback{
 const diceScope=useDiceRollScope(),[previewScope]=useState(()=>`preview-${previewInstance++}`);
 const scope=diceScope.startsWith('preview:')?previewScope:diceScope,latest=useRef(options);latest.current=options;
 const trackedScope=useRef(scope),combatBoundary=useRef(options.revision);
 const mountedRevision=useRef(options.revision),lastConnected=useRef(options.connected),aiBoundary=useRef(options.revision);
 const pending=useRef<{command:GameCommand;revision:number;status:string}|null>(null),suppressClick=useRef(false);
 useEffect(()=>{const hide=()=>{if(document.hidden){combatBoundary.current=latest.current.revision;aiBoundary.current=latest.current.revision;pending.current=null;stopCosmeticCues();}};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);stopCosmeticCues();};},[]);
 useEffect(()=>{
  if(trackedScope.current!==scope){combatBoundary.current=options.revision;trackedScope.current=scope;mountedRevision.current=options.revision;aiBoundary.current=options.revision;pending.current=null;stopCosmeticCues();}
  if(!options.connected||!lastConnected.current){pending.current=null;aiBoundary.current=options.revision;}
  if(!options.connected||!lastConnected.current||options.reviewing||document.hidden)combatBoundary.current=options.revision;
  lastConnected.current=options.connected;
  const receipt=options.receipt,request=pending.current;
  if(request&&options.busy)request.status=options.status;
  if(request&&receipt&&receipt.revision>request.revision&&receipt.type===request.command.type&&receipt.revision<=options.revision){
   pending.current=null;
   if(consume(`${scope}:${receipt.revision}`)&&options.connected&&!options.reviewing&&!document.hidden){const cue=commandSound(request.command);if(cue)playCosmeticCue(cue);}
  }else if(request&&!options.busy&&options.status&&options.status!==request.status){pending.current=null;if(!document.hidden&&!options.reviewing)playCosmeticCue('reject');}
  const entry=options.aiEntry;
  if(entry&&entry.revision>aiBoundary.current){
   aiBoundary.current=entry.revision;
   const fresh=entry.revision===options.revision&&entry.revision>mountedRevision.current;
   if(consume(`${scope}:${entry.revision}`)&&fresh&&options.connected&&options.aiVisible&&!options.reviewing&&!document.hidden){const kind=entry.presentation?.kind;const cue=kind==='move'?'move':kind==='research'||kind==='upgrade'?'install':kind==='build'||kind==='explore'?'tile':null;if(cue)playCosmeticCue(cue);}
  }
 },[options,scope]);
 return {
  combatLive(revision:number){return trackedScope.current===scope&&latest.current.connected&&lastConnected.current&&!latest.current.reviewing&&!document.hidden&&revision===latest.current.revision&&revision>combatBoundary.current;},
  submitted(command:GameCommand){suppressClick.current=true;pending.current={command,revision:latest.current.revision,status:latest.current.status};},
  rejected(){suppressClick.current=true;playCosmeticCue('reject');},
  capture(){suppressClick.current=false;},
  clicked(event:MouseEvent<HTMLElement>){
   if(suppressClick.current)return;
   const target=event.target instanceof Element?event.target.closest('button,summary,input[type=checkbox],input[type=radio], [role=button]'):null;
   if(!target||target.closest('[data-sound="silent"]')||target.matches(':disabled,[aria-disabled=true]'))return;
   if(/skip|hide|close|dismiss|minimize/i.test(target.getAttribute('aria-label')??target.textContent??'')){stopCosmeticCues();return;}
   const cue=target.getAttribute('data-sound');playCosmeticCue(cue==='detent'?'detent':'selection');
  },
 };
}
