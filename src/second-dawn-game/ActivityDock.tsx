import type {GameCommand} from '../../shared/eclipse/types';
import {DRAFT_KEYS,type DraftKey} from './actionDraftStorage';
import {useActionDraftGuard} from './actionDraftContext';
import ActionIcon from './ActionIcon';

export type DraftActivity=GameCommand['type']|'recruitment'|'guild-trade'|'faction';
const activity=(key:DraftKey):DraftActivity|null=>key==='buildOpen'||key==='moveOpen'?null:key==='researchDraft'||key==='researchSelection'?'research':key==='exploreDraft'?'explore':key.startsWith('blueprint')?'upgrade':key.startsWith('build')?'build':key.startsWith('movement')||key==='moveSource'||key==='moveTarget'?'move':key.startsWith('influence')?'influence':key.startsWith('colonization')?'colonize':key.startsWith('trade')?'trade':key.startsWith('diplomacy')?'offer-diplomacy':key.startsWith('minorSpecies')?'recruitment':key.startsWith('guild')?'guild-trade':key==='factionDraft'?'faction':null;
const label=(value:DraftActivity)=>value==='offer-diplomacy'?'diplomacy':value==='guild-trade'?'Guild exchange':value;
const icon=(value:DraftActivity):GameCommand['type']=>value==='guild-trade'?'trade':value==='recruitment'?'buy-minor-species':value==='faction'?'convert-colony-ship':value;
export default function ActivityDock({current,disabled,onResume}:{current:DraftActivity;disabled:boolean;onResume:(action:DraftActivity)=>void}) {
 const guard=useActionDraftGuard();
 const actions=[...new Set(guard.draftKeys.map(activity).filter((kind):kind is DraftActivity=>kind!==null))];
 if(!actions.length&&!guard.canUndo)return null;
 const keys=actions.includes(current)?DRAFT_KEYS.filter(key=>activity(key)===current):[];
 return <section className="dg-activity-dock" aria-label="Activity dock">
  <span>Drafts</span><div className="dg-activity-drafts">{actions.map(action=><button key={action} aria-label={`Resume ${label(action)} draft`} aria-pressed={current===action} onClick={()=>onResume(action)}><ActionIcon kind={icon(action)}/>{label(action)[0].toUpperCase()+label(action).slice(1)}</button>)}</div>
  {keys.length>0&&<button aria-label={`Reset ${label(current)} draft`} disabled={disabled} onClick={()=>guard.clear(keys)}>Reset</button>}
  <button aria-label="Undo draft edit" disabled={disabled||!guard.canUndo} onClick={guard.undo}>Undo</button>
 </section>;
}
