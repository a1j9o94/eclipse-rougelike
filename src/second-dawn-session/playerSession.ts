import {isGuestCredential} from '../../shared/eclipse/guest';
import type {CredentialStorage} from './guestStorage';
export function switchPlayerCredential(storage:CredentialStorage,next:string):void{
 if(!isGuestCredential(next))throw new Error('The server returned an invalid player session.');
 const old=storage.getItem('eclipse.second-dawn.guest.v1');
 if(old&&old!==next&&isGuestCredential(old)&&!isGuestCredential(storage.getItem('eclipse.second-dawn.original-player.v1')??''))storage.setItem('eclipse.second-dawn.original-player.v1',old);
 if(old&&old!==next&&isGuestCredential(old))storage.setItem('eclipse.second-dawn.previous-player.v1',old);
 storage.setItem('eclipse.second-dawn.guest.v1',next);
}
