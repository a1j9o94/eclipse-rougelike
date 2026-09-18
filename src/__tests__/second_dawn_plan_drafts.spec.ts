import {afterEach,expect,it} from 'vitest';
import {draftStorageKey,readActionDrafts,keysForCommand} from '../second-dawn-game/actionDraftStorage';
afterEach(()=>localStorage.clear());
it('restores public multi-sector build and movement plans and clears them only for their command',()=>{
 const partition={matchId:'plans',viewerSeatId:'a'};
 const buildOrder={items:[{id:'piece-1',component:'interceptor',sectorId:null},{id:'piece-2',component:'orbital',sectorId:'home'}],selectedItemId:'piece-1',fundingKey:''};
 const movementRoutes=[{sourceSectorId:'home',shipIds:['ship-a'],destinationSectorId:'border'}];
 localStorage.setItem(draftStorageKey(partition),JSON.stringify({version:1,...partition,values:{buildOrder:{revision:3,value:buildOrder},movementRoutes:{revision:3,value:movementRoutes}}}));
 const snapshot=readActionDrafts(localStorage,partition);
 expect(snapshot.values).toMatchObject({buildOrder:{value:buildOrder},movementRoutes:{value:movementRoutes}});
 expect(keysForCommand({type:'build',builds:[]})).toContain('buildOrder');
 expect(keysForCommand({type:'move',moves:[]})).toContain('movementRoutes');
 expect(keysForCommand({type:'research',tileId:'fusion-drive',track:'grid'})).not.toContain('movementRoutes');
});
it('rejects plan payloads with private fields or malformed placement coordinates',()=>{
 const partition={matchId:'plans',viewerSeatId:'a'};
 localStorage.setItem(draftStorageKey(partition),JSON.stringify({version:1,...partition,values:{buildOrder:{revision:3,value:{items:[{id:'p',component:'orbital',sectorId:{q:1}}],selectedItemId:'p',fundingKey:''}},movementRoutes:{revision:3,value:[{sourceSectorId:'home',shipIds:['ship'],destinationSectorId:'border',secret:4}]}}}));
 expect(readActionDrafts(localStorage,partition).values).toEqual({});
});
