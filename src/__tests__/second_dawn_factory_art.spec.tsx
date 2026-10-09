import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import GalaxyBoard from '../second-dawn-game/GalaxyBoard';
import SectorFleet from '../second-dawn-game/SectorFleet';
import FleetInspection from '../second-dawn-game/FleetInspection';
import MovementPlanner from '../second-dawn-game/MovementPlanner';
import {CombatTargetCards} from '../second-dawn-game/CombatDecisionVisuals';

afterEach(cleanup);
it('keeps a loaded factory cube visible on the map and through fleet, movement and combat inspection',()=>{
 const state=createGame({seed:4,factionProfile:'scifi-v1',seats:[{id:'a',faction:'bobiverse',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});
 const ship=state.ships.find(ship=>ship.owner==='a')!;ship.factoryPopulation=true;
 const view=getPlayerView(state,'a')!;
 for(const component of [
  <GalaxyBoard key="map" view={view} candidates={[]} selected={ship.sectorId} onSelect={()=>{}} onExplore={()=>{}}/>,
  <SectorFleet key="fleet" view={view} sectorId={ship.sectorId}/>,
  <FleetInspection key="inspection" view={view} sectorId={ship.sectorId} selectedShipIds={[]} onClose={()=>{}}/>,
  <MovementPlanner key="movement" view={view} sourceSectorId={ship.sectorId} selectedTargetId={null} disabled={false} onTargetsChange={()=>{}} onClose={()=>{}} onSubmit={()=>{}}/>,
  <CombatTargetCards key="combat" view={view} targets={[ship.id]} targetLabels={{[ship.id]:'Interceptor 1'}} selected="" onSelect={()=>{}}/>,
 ]){
  const {container,unmount}=render(component);
  expect(container.querySelector('svg[data-attachment="materials-factory"]')).not.toBeNull();
  if(component.key==='fleet')expect(screen.getByText('1 Materials factory')).toBeVisible();
  unmount();
 }
 ship.factoryPopulation=false;
 const {container}=render(<SectorFleet view={getPlayerView(state,'a')!} sectorId={ship.sectorId}/>);
 expect(container.querySelector('[data-attachment="materials-factory"]')).toBeNull();
});
