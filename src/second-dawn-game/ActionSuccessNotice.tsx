import {useEffect,useRef,useState} from 'react';
import type {GameCommand} from '../../shared/eclipse/types';
import type {PublicHistoryEntry} from '../../shared/eclipse/history';
import './actionSuccess.css';
interface Receipt {revision:number;type:GameCommand['type']}
const labels:Partial<Record<GameCommand['type'],string>>={explore:'Sector explored',influence:'Influence updated',research:'Research completed',upgrade:'Blueprints upgraded',build:'Construction completed',move:'Ships moved',trade:'Resources converted','trade-and-act':'Conversion and action completed',colonize:'Planets colonized',pass:'Passed','finish-upkeep':'Upkeep completed','buy-activation':'Extra activation purchased','convert-colony-ship':'Colony ship converted'};
export default function ActionSuccessNotice({receipt,entries}:{receipt?:Receipt;entries:readonly PublicHistoryEntry[]}){
 const previous=useRef(receipt?.revision);
 const [accepted,setAccepted]=useState<Receipt|null>(null);
 useEffect(()=>{if(!receipt||receipt.revision===previous.current)return;previous.current=receipt.revision;if(labels[receipt.type])setAccepted(receipt);},[receipt]);
 useEffect(()=>{if(!accepted)return;const timer=setTimeout(()=>setAccepted(null),5500);return()=>clearTimeout(timer);},[accepted]);
 if(!accepted)return null;
 const entry=entries.find(item=>item.revision===accepted.revision);
 return <aside className="dg-action-success"><span aria-hidden="true">✓</span><div role="status" aria-live="polite"><small>Action saved</small><strong>{entry?.summary??labels[accepted.type]}</strong></div><button aria-label="Dismiss action confirmation" onClick={()=>setAccepted(null)}>×</button></aside>;
}
