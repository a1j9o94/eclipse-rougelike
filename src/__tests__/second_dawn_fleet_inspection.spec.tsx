import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import FleetInspection from '../second-dawn-game/FleetInspection';
import {publicShipProfile,hitFaceDescription} from '../second-dawn-game/fleetInspection';
afterEach(cleanup);
function fixture(){const state=createGame({seed:4,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});return getPlayerView(state,'a')!;}
it('compares actual selected public ships and retains neutral damage without private state',()=>{
 const view=fixture(),own=view.ships.find(s=>s.owner==='a')!,enemy=view.ships.find(s=>s.owner==='b')!;
 view.ships.push({id:'neutral',owner:'ancient',type:'ancient',sectorId:enemy.sectorId,damage:1});
 const close=vi.fn();render(<FleetInspection view={view} sectorId={enemy.sectorId} selectedShipIds={[own.id]} onClose={close}/>);
 expect(screen.getByRole('dialog',{name:/Fleet inspection/})).toBeInTheDocument();
 expect(screen.getByText(/Compare with your selected fleet/)).toBeInTheDocument();
 expect(screen.getAllByText(/to hit/).length).toBeGreaterThan(0);
 expect(publicShipProfile(view,'neutral')?.remainingHp).toBe(1);
 expect(screen.queryByText(/private reputation/i)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Return to plan'}));expect(close).toHaveBeenCalledOnce();
});
it('explains natural faces correctly and tolerates vanished ships',()=>{
 expect(hitFaceDescription(0,0)).toBe('6 to hit');expect(hitFaceDescription(4,0)).toBe('2–6 to hit');expect(hitFaceDescription(0,4)).toBe('Natural 6 only');
 expect(publicShipProfile(fixture(),'gone')).toBeNull();
});
