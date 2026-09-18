import { describe, expect, it } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { previewColonizationDraft } from '../second-dawn-game/colonizationPlanning';

describe('colonization consequence preview',()=>{
  it('shows exact cubes, colony ships, and marginal income for a mixed multi-sector draft',()=>{
    const state=createGame({seed:9,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
    const seat=state.seats[0];seat.colonyShipsAvailable=3;seat.populationTracks={money:2,science:4,materials:1};
    const preview=previewColonizationDraft(getPlayerView(state,'a')!,[{resource:'money'},{resource:'science'}]);
    expect(preview).toMatchObject({colonyShipsBefore:3,colonyShipsAfter:1,legal:true});
    expect(preview.resources.find(resource=>resource.resource==='money')).toMatchObject({cubesBefore:9,cubesAfter:8,incomeBefore:4,incomeAfter:6,incomeDelta:2});
    expect(preview.resources.find(resource=>resource.resource==='science')).toMatchObject({cubesBefore:7,cubesAfter:6,incomeBefore:8,incomeAfter:10,incomeDelta:2});
  });
  it('marks a draft illegal when it exceeds ships or a population track',()=>{
    const state=createGame({seed:9,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});state.seats[0].colonyShipsAvailable=1;state.seats[0].populationTracks.money=11;
    expect(previewColonizationDraft(getPlayerView(state,'a')!,[{resource:'money'},{resource:'science'}]).legal).toBe(false);
  });
});
