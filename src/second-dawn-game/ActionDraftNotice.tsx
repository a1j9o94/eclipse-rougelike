import {useActionDraftGuard} from './actionDraftContext';
export default function ActionDraftNotice(){
 const guard=useActionDraftGuard();
 if(guard.storageAvailable)return null;
 return <aside className="dg-action-draft-notice" role="status"><p>Browser storage is unavailable. Keep this tab open to retain unconfirmed choices.</p></aside>;
}
