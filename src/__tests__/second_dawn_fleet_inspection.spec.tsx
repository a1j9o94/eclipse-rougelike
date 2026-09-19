import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import FleetInspection from '../second-dawn-game/FleetInspection';
import {publicShipProfile,hitFaceDescription} from '../second-dawn-game/fleetInspectionModel';
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
 expect(screen.getByLabelText('Ship 1: 1 of 2 hit points, 1 damage')).toBeInTheDocument();
 expect(screen.queryByText(/private reputation/i)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Return to plan'}));expect(close).toHaveBeenCalledOnce();
});
it('explains natural faces correctly and tolerates vanished ships',()=>{
 expect(hitFaceDescription(0,0)).toBe('6 to hit');expect(hitFaceDescription(4,0)).toBe('2–6 to hit');expect(hitFaceDescription(0,4)).toBe('Natural 6 only');
 expect(publicShipProfile(fixture(),'gone')).toBeNull();
});
it('shows one effective public loadout per class with separate damage for each ship',()=>{
 const view=fixture(),enemy=view.ships.find(s=>s.owner==='b')!,seat=view.seats.find(s=>s.id==='b')!;
 seat.blueprints.find(b=>b.shipType==='interceptor')!.parts[3]='gluon-computer';
 view.ships.push({...enemy,id:'second-interceptor',damage:0});
 render(<FleetInspection view={view} sectorId={enemy.sectorId} selectedShipIds={[]} onClose={()=>{}}/>);
 expect(screen.getAllByRole('group',{name:'Interceptor installed loadout'})).toHaveLength(1);
 expect(screen.getByText('Gluon Computer')).toBeInTheDocument();
 expect(screen.getByRole('group',{name:'Gluon Computer statistics'})).toHaveTextContent('+3');
 expect(screen.getByText('Ion Cannon')).toBeInTheDocument();
 expect(screen.getByLabelText('Ship 1: 1 of 1 hit points, undamaged')).toBeInTheDocument();
 expect(screen.getByLabelText('Ship 2: 1 of 1 hit points, undamaged')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/replace|install/i})).toBeNull();
});
it('shows selected own loadouts and visual hit faces without treating enemy IDs as selected ships',()=>{
 const view=fixture(),own=view.ships.find(s=>s.owner==='a')!,enemy=view.ships.find(s=>s.owner==='b')!;
 render(<FleetInspection view={view} sectorId={enemy.sectorId} selectedShipIds={[own.id,enemy.id]} onClose={()=>{}}/>);
 expect(screen.getByRole('region',{name:'Your selected fleet'})).toBeInTheDocument();
 expect(screen.getAllByRole('group',{name:'Interceptor installed loadout'})).toHaveLength(2);
 expect(screen.getByRole('img',{name:/Your attack: 6 to hit/})).toBeInTheDocument();
});

it('includes outside-grid parts and keeps slot replacement overlays distinct from printed modules',()=>{
 const view=fixture(),enemy=view.ships.find(s=>s.owner==='b')!,blueprint=view.seats.find(s=>s.id==='b')!.blueprints.find(b=>b.shipType==='interceptor')!;
 blueprint.parts[0]='plasma-cannon';blueprint.outsideParts=['muon-source'];
 render(<FleetInspection view={view} sectorId={enemy.sectorId} selectedShipIds={[]} onClose={()=>{}}/>);
 expect(screen.queryByText('Ion Cannon')).toBeNull();
 expect(screen.getByText('Plasma Cannon')).toBeInTheDocument();
 expect(screen.getByRole('group',{name:'Outside-grid parts'})).toHaveTextContent('Muon Source');
 expect(screen.getByText('Empty slot')).toBeInTheDocument();
 expect(screen.getByText('Built into blueprint')).toBeInTheDocument();
});
it('traps keyboard focus and returns to the action without submitting a command',()=>{
 const view=fixture(),enemy=view.ships.find(s=>s.owner==='b')!,close=vi.fn();
 render(<FleetInspection view={view} sectorId={enemy.sectorId} selectedShipIds={[]} onClose={close}/>);
 const dialog=screen.getByRole('dialog');expect(dialog).toHaveFocus();
 fireEvent.keyDown(dialog,{key:'Tab',shiftKey:true});expect(screen.getByText('Public technologies')).toHaveFocus();
 fireEvent.keyDown(dialog,{key:'Tab'});expect(screen.getByRole('button',{name:'Return to plan'})).toHaveFocus();
 fireEvent.keyDown(dialog,{key:'Escape'});expect(close).toHaveBeenCalledOnce();
});
