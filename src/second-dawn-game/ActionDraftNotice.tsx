import { useActionDraftGuard } from './actionDraftContext';
export default function ActionDraftNotice(){
 const guard=useActionDraftGuard();
 if(!guard.stale&&guard.storageAvailable)return null;
 return <aside className="dg-action-draft-notice" role="status">{!guard.storageAvailable&&<p>Browser storage is unavailable. Keep this tab open to retain unconfirmed choices.</p>}{guard.stale&&<><p>The board changed. Review your saved choices and current costs before confirming.</p><button type="button" onClick={guard.review}>I’ve reviewed my draft</button><button type="button" onClick={()=>guard.clear()}>Discard saved drafts</button></>}</aside>;
}
