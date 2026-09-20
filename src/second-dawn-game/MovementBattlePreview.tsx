import {useEffect,useState} from 'react';
import {movementBattleEstimate,type MovementBattleEstimate} from '../../shared/eclipse/movementBattleEstimate';
import type {PlayerView} from '../../shared/eclipse/types';
interface Props{view:PlayerView;shipIds:readonly string[];targetSectorId:string}
interface CompletedEstimate{view:PlayerView;selection:string;target:string;result:MovementBattleEstimate}
export default function MovementBattlePreview({view,shipIds,targetSectorId}:Props){
 const selection=[...shipIds].sort().join('|');
 const [completed,setCompleted]=useState<CompletedEstimate|null>(null);
 useEffect(()=>{const controller=new AbortController();movementBattleEstimate(view,selection.split('|'),targetSectorId,controller.signal).then(result=>{if(!controller.signal.aborted)setCompleted({view,selection,target:targetSectorId,result});}).catch(()=>{if(!controller.signal.aborted)setCompleted({view,selection,target:targetSectorId,result:{status:'unavailable',reason:'A quick estimate is unavailable for this fleet.'}});});return()=>controller.abort();},[view,selection,targetSectorId]);
 const result=completed?.view===view&&completed.selection===selection&&completed.target===targetSectorId?completed.result:null;
 if(result?.status==='peaceful')return null;
 return <section className="dg-movement-odds" aria-label="Estimated combat outcome" aria-live="polite">
  {!result?<p>Estimating fleet battle…</p>:result.status==='unavailable'?<p>{result.reason}</p>:<>
   <div className="dg-movement-odds-lead"><strong>≈{result.winPercent}%</strong><span>estimated fleet win</span></div>
   <div className="dg-movement-odds-meter" aria-hidden="true"><span style={{width:`${result.winPercent}%`}}/></div>
   <p>{result.friendlyShips} of your ships vs {result.enemyShips} enemy {result.enemyShips===1?'ship':'ships'}</p>
   {view.rulesMode==='less-random-v1'&&<p>Super Joker use is not included in this estimate.</p>}<details><summary>Estimate assumptions</summary><p>{result.trials} simulations · sampling range {result.lowerPercent}–{result.upperPercent}%. This is an estimate, not a guarantee.</p><p>Current public loadouts and damage, with your fleet {result.defender?'defending':'attacking'}. No voluntary retreats, later reinforcements or upgrades. Automatic hit allocation and tied ship order can differ from player choices.</p><p>Winning means your fleet survives and the enemy fleet is destroyed. It does not predict taking control or destroying population.</p></details>
  </>}
 </section>;
}
