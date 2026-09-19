import {cleanup,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import FleetInspection from '../second-dawn-game/FleetInspection';
import {movementBattleEstimate} from '../../shared/eclipse/movementBattleEstimate';
vi.mock('../../shared/eclipse/movementBattleEstimate',()=>({movementBattleEstimate:vi.fn(async()=>({status:'estimate',winPercent:65,lowerPercent:54,upperPercent:75,trials:96,friendlyShips:1,enemyShips:1,defender:false}))}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
function fixture(){const state=createGame({seed:42,seats:[{id:'a',faction:'orion',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});const view=getPlayerView(state,'a')!,own=view.ships.find(s=>s.owner==='a')!,enemy=view.ships.find(s=>s.owner==='b')!;own.sectorId=enemy.sectorId;return {view,own,sectorId:enemy.sectorId};}
it('estimates the fleet already in the inspected sector without needing a movement selection',async()=>{
 const {view,own,sectorId}=fixture();render(<FleetInspection view={view} sectorId={sectorId} selectedShipIds={[]} showCombatOdds onClose={()=>{}}/>);
 await waitFor(()=>expect(screen.getByLabelText('Estimated combat outcome')).toHaveTextContent('≈65%'));
 expect(movementBattleEstimate).toHaveBeenCalledWith(view,[own.id],sectorId,expect.any(AbortSignal));
});
it('does not simulate or display odds when the room setting is off',()=>{
 const {view,sectorId}=fixture();render(<FleetInspection view={view} sectorId={sectorId} selectedShipIds={[]} onClose={()=>{}}/>);
 expect(screen.queryByLabelText('Estimated combat outcome')).toBeNull();expect(movementBattleEstimate).not.toHaveBeenCalled();
});
