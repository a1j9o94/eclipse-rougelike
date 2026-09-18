import {expect,it} from 'vitest';
import {switchPlayerCredential} from '../second-dawn-session/playerSession';
it('preserves the previous browser owner before switching to a fresh valid session',()=>{
 const old=`ecl1_${'a'.repeat(64)}`,next=`ecl1_${'b'.repeat(64)}`,data=new Map([['eclipse.second-dawn.guest.v1',old]]);const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
 switchPlayerCredential(storage,next);expect(data.get('eclipse.second-dawn.previous-player.v1')).toBe(old);expect(data.get('eclipse.second-dawn.guest.v1')).toBe(next);expect(()=>switchPlayerCredential(storage,'not-a-session')).toThrow();expect(data.get('eclipse.second-dawn.guest.v1')).toBe(next);
});
it('retains the original browser guest through multiple player switches and restoration',()=>{
 const original=`ecl1_${'a'.repeat(64)}`,second=`ecl1_${'b'.repeat(64)}`,third=`ecl1_${'c'.repeat(64)}`,data=new Map([['eclipse.second-dawn.guest.v1',original]]);const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
 switchPlayerCredential(storage,second);switchPlayerCredential(storage,third);
 expect(data.get('eclipse.second-dawn.original-player.v1')).toBe(original);
 switchPlayerCredential(storage,original);expect(data.get('eclipse.second-dawn.guest.v1')).toBe(original);
 expect(data.get('eclipse.second-dawn.original-player.v1')).toBe(original);
});
