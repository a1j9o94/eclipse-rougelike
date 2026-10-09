import {afterEach, expect, it} from 'vitest';
import {cleanup, render} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {getTechnology} from '../../shared/eclipse/technologies';
import SectorPlanets from '../second-dawn-game/SectorPlanets';
import ColonizationPlanner from '../second-dawn-game/ColonizationPlanner';
import AdvancedPopulationPreview from '../second-dawn-game/AdvancedPopulationPreview';
import type {CommandCandidate} from '../second-dawn-game/SecondDawnBoard';

afterEach(cleanup);
it('keeps the advanced designation consistent across inspector, colonization and research', () => {
  const view=getPlayerView(createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;
  const sector=view.sectors.find(sector=>sector.owner==='a')!;
  sector.tileId='1';sector.population=[];
  view.seats[0].technologies.nano.push('advanced-labs');
  const candidates:CommandCandidate[]=[{command:{type:'colonize',placements:[{sectorId:sector.id,squareId:'p2',resource:'science'}]},label:'Colonize advanced science',description:'Use one colony ship'}];
  for(const component of [
    <SectorPlanets key="inspector" view={view} sector={sector} candidates={candidates}/>,
    <ColonizationPlanner key="colonize" view={view} candidates={candidates} disabled={false} onSubmit={()=>{}}/>,
    <AdvancedPopulationPreview key="research" view={view} technology={getTechnology('advanced-labs')}/>,
  ]) {
    const {container,unmount}=render(component);
    expect(container.querySelector('svg[data-planet-feature="advanced"]')).not.toBeNull();
    expect(container).not.toHaveTextContent('★');
    unmount();
  }
});
