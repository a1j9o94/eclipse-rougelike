import { describe,it,expect } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { processGameCommand } from '../../shared/eclipse/engine';
import { ancientTechnologyChoices } from '../../shared/eclipse/technologies';
const game=()=>createGame({seed:10,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
describe('rare rewards cannot create unanswerable decisions',()=>{
 it('does not substitute a more expensive ancient technology when the cheapest track is full',()=>{
  const tracks={military:['neutron-bombs','gauss-shield','plasma-cannon','phase-shield','advanced-mining','tachyon-source','gluon-computer'],grid:[],nano:[]};
  expect(ancientTechnologyChoices(['starbase','improved-hull'],tracks)).toEqual([]);
 });
 it('offers only the VP side when no cheapest free technology can be placed',()=>{
  const s=game();s.seats[0].technologies.military=['neutron-bombs','gauss-shield','plasma-cannon','phase-shield','advanced-mining','tachyon-source','gluon-computer'];s.technologyMarket=['ancient-labs','starbase','improved-hull'];s.supplies.discovery=['ancient-tech'];s.seats[0].resources.science=99;
  const r=processGameCommand(s,'a',{type:'research',tileId:'ancient-labs',track:'nano'});expect(r.ok).toBe(true);if(r.ok)expect(r.state.pendingDecision).toMatchObject({kind:'discovery',options:['keep']});
 });
 it('rejects a mandatory portal placement with no controlled destination atomically',()=>{
  const s=game();s.sectors.find(t=>t.owner==='a')!.owner=null;s.seats[0].resources.science=99;s.technologyMarket=['warp-portal'];const before=JSON.stringify(s);
  expect(processGameCommand(s,'a',{type:'research',tileId:'warp-portal',track:'grid'}).ok).toBe(false);expect(JSON.stringify(s)).toBe(before);
 });
});
