import './autoPassControl.css';
interface Props {enabled:boolean;paused:boolean;disabled:boolean;onChange:(enabled:boolean)=>void}
export default function AutoPassControl({enabled,paused,disabled,onChange}:Props){
 return <div className="dg-auto-pass-control">
  <label title="After you pass, automatically skip reaction turns unless an opponent attacks your territory or fleet. Saved for this seat across devices and rounds."><input type="checkbox" checked={enabled} disabled={disabled} onChange={event=>{if(!disabled)onChange(event.target.checked);}}/><span>Auto-pass unless attacked</span></label>
  {enabled&&paused&&<><span className="dg-auto-pass-paused" role="status">Attacked · reactions restored</span><button className="dg-board-control" disabled={disabled} onClick={()=>onChange(true)}>Resume auto-pass</button></>}
 </div>;
}
