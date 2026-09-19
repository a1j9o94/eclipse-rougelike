import {useState} from 'react';
import {createPortal} from 'react-dom';
import type {PlayerView} from '../../shared/eclipse/types';
import GameDialog from './GameDialog';
import './sectorDecks.css';

const rings=[{key:'inner',mark:'I',name:'Inner'},{key:'middle',mark:'II',name:'Middle'},{key:'outer',mark:'III',name:'Outer'}] as const;
function StackIcon({mark}:{mark:string}){
 return <svg viewBox="0 0 40 44" aria-hidden="true"><path d="m3 26 17 10 17-10v5L20 41 3 31Zm0-6 17 10 17-10v5L20 35 3 25Z" fill="currentColor" opacity=".35"/><path d="m20 2 17 10v14L20 36 3 26V12Z" fill="#17222d" stroke="currentColor" strokeWidth="1.5"/><text x="20" y="24" textAnchor="middle" fill="currentColor" fontSize="14" fontFamily="Georgia,serif">{mark}</text></svg>;
}
export default function SectorDecks({view}:{view:PlayerView}){
 const [open,setOpen]=useState(false);
 const exact=!!view.sectorDeckCounts;
 const counts=rings.map(ring=>view.sectorDeckCounts?.[ring.key].drawPile??view.supplyCounts?.[ring.key]);
 const label=`Sector decks: ${rings.map((ring,index)=>`${ring.name} ${counts[index]??'unknown'} ${exact?'in draw pile':'available'}`).join(', ')}`;
 return <>
  <button type="button" className="dg-board-control dg-sector-decks-toggle" aria-label={label} aria-haspopup="dialog" onClick={()=>setOpen(true)}><span>Sector decks</span>{rings.map((ring,index)=><span className="dg-sector-deck-counter" key={ring.key}><StackIcon mark={ring.mark}/><b>{counts[index]??'—'}</b></span>)}</button>
  {open&&createPortal(<GameDialog title="Sector decks" onClose={()=>setOpen(false)} className="dg-sector-decks-dialog">
   <p>Exploration draws from the stack matching the frontier’s ring.</p>
   <div className="dg-sector-deck-grid">{rings.map(ring=>{
    const pile=view.sectorDeckCounts?.[ring.key],available=view.supplyCounts?.[ring.key];
    return <section key={ring.key} aria-label={`${ring.name} sectors · Ring ${ring.mark}`}>
     <StackIcon mark={ring.mark}/><h3>{ring.name}<small>Ring {ring.mark}</small></h3>
     {pile?<><dl><div><dt>Draw pile</dt><dd>{pile.drawPile}</dd></div><div><dt>Discard pile</dt><dd>{pile.discardPile}</dd></div></dl>{pile.drawPile===0&&<p className="dg-sector-deck-empty">{pile.discardPile>0?'Reshuffle on next draw':'Exhausted'}</p>}</>:available!==undefined?<dl><div><dt>Available</dt><dd>{available}</dd></div></dl>:<p>Count unavailable</p>}
    </section>;
   })}</div>
   <p className="sd-muted">Discards are reshuffled when their draw pile runs out. Tiles already drawn for an exploration choice are no longer in either pile.</p>
   {!exact&&<p className="sd-muted">Available totals include discards. Separate pile counts aren’t available in this view.</p>}
  </GameDialog>,document.body)}
 </>;
}
