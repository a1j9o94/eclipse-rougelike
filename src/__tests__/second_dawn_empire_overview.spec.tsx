import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {SECTORS} from '../../shared/eclipse/sectors';
import {empireOverviewModel} from '../second-dawn-game/empireOverviewModel';
import EmpireOverview from '../second-dawn-game/EmpireOverview';
afterEach(cleanup);
function fixture(){
 const view=getPlayerView(createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;
 const gray=SECTORS.find(s=>s.population.some(p=>p.advanced&&p.resource==='gray'))!;
 view.sectors=[{...view.sectors[0],id:'own',owner:'a',tileId:'1',population:[],orbital:true},{...view.sectors[0],id:'flex',owner:'a',tileId:String(gray.id),population:[]},{...view.sectors[0],id:'enemy',owner:'b',tileId:'1',population:[]}];
 view.seats[0].technologies={military:[],grid:[],nano:[]};
 view.ships=[{id:'c',owner:'a',sectorId:'own',type:'cruiser',damage:1},{id:'i',owner:'a',sectorId:'flex',type:'interceptor',damage:0},{id:'e',owner:'b',sectorId:'own',type:'cruiser',damage:0}];
 return view;
}
it('counts physical empty planets once, separates flexible planets and preserves occupied squares',()=>{
 const view=fixture(),before=JSON.stringify(view),model=empireOverviewModel(view,'a');
 const empty=SECTORS.find(s=>s.id===1)!.population.length+SECTORS.find(s=>String(s.id)===view.sectors[1].tileId)!.population.length+1;
 expect(JSON.stringify(view)).toBe(before);expect(model.planets).toHaveLength(empty);expect(new Set(model.planets.map(p=>`${p.sectorId}:${p.squareId}`)).size).toBe(empty);
 expect(model.planets.find(p=>p.sectorId==='own'&&p.squareId==='p2')?.readyResources).toEqual([]);
 expect(model.planets.find(p=>p.squareId==='orbital')?.readyResources).toEqual(['money','science']);
 view.seats[0].technologies.nano=['advanced-labs'];
 expect(empireOverviewModel(view,'a').planets.find(p=>p.resource==='gray'&&p.advanced)?.readyResources).toEqual(['science']);
 view.sectors[0].population=[{squareId:'p2',resource:'science'}];
 expect(empireOverviewModel(view,'a').planets).toHaveLength(empty-1);
 expect(JSON.stringify(fixture())).toBe(before);
});
it('derives only the selected empire fleets, public score and current reaction capacities',()=>{
 const view=fixture(),model=empireOverviewModel(view,'a');
 expect(model.fleets.find(f=>f.type==='cruiser')?.locations).toEqual([{sectorId:'own',tileId:'1',count:1,damaged:1}]);
 view.private.reputation=[999];expect(empireOverviewModel(view,'a').score).toBe(model.score);
 view.seats[0].technologies.nano=['nanorobots'];
 expect(empireOverviewModel(view,'a').capacities.find(a=>a.action==='build')?.amount).toBe(3);
 view.seats[0].passed=true;
 expect(empireOverviewModel(view,'a').capacities.map(a=>a.amount)).toEqual([0,0,0,1,1,1]);
});
it('provides planet, fleet, research and trade navigation without submitting commands',()=>{
 const view=fixture(),onSector=vi.fn(),onNavigate=vi.fn(),onBlueprints=vi.fn();
 render(<EmpireOverview view={view} seatId="a" onSector={onSector} onNavigate={onNavigate} onBlueprints={onBlueprints}/>);
 fireEvent.click(screen.getByRole('button',{name:'Inspect Cruiser blueprint'}));expect(onBlueprints).toHaveBeenCalledWith('cruiser');
 fireEvent.click(within(screen.getByRole('group',{name:'Cruiser fleet'})).getByRole('button',{name:/Sector 1/}));expect(onSector).toHaveBeenCalledWith('own');
 fireEvent.click(screen.getByRole('button',{name:'Colonize planets'}));expect(onNavigate).toHaveBeenCalledWith('colonize');
 fireEvent.click(screen.getByRole('button',{name:'Research technology'}));expect(onNavigate).toHaveBeenCalledWith('Research');
 fireEvent.click(screen.getByRole('button',{name:/Convert resources/}));expect(onNavigate).toHaveBeenCalledWith('Trade');
 expect(screen.getByRole('heading',{name:'Faction abilities'})).toBeVisible();expect(screen.getByRole('heading',{name:'Move activations'})).toBeVisible();
});
it('opponents expose researched effects locally, never own market actions or private rewards',()=>{
 const view=fixture();view.private.reputation=[987];view.private.discoveriesKept=['secret-discovery'];
 const onNavigate=vi.fn();render(<EmpireOverview view={view} seatId="b" onSector={vi.fn()} onNavigate={onNavigate} onBlueprints={vi.fn()}/>);
 expect(screen.getByRole('heading',{name:'Hydran Progress'})).toBeVisible();
 expect(screen.queryByRole('button',{name:'Research technology'})).toBeNull();expect(screen.queryByRole('button',{name:'Colonize planets'})).toBeNull();expect(screen.queryByRole('button',{name:/Convert resources/})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Inspect Advanced Labs'}));
 expect(screen.getByText(/You may colonize advanced science population spaces/)).toBeVisible();expect(onNavigate).not.toHaveBeenCalled();
 expect(screen.queryByText(/987|secret-discovery/)).toBeNull();
});
it('counts eligibility separately from colony ships, cubes, active turn and enemy fleets',()=>{
 const view=fixture();view.seats[0].technologies.grid=['advanced-robotics'];
 expect(empireOverviewModel(view,'a').planets.find(p=>p.resource==='gray'&&p.advanced)?.readyResources).toEqual([]);
 view.seats[0].technologies.grid=['metasynthesis'];
 view.seats[0].colonyShipsAvailable=0;view.seats[0].populationTracks={money:11,science:11,materials:11};view.activeSeatId='b';
 const model=empireOverviewModel(view,'a');
 expect(model.planets.find(p=>p.resource==='gray'&&p.advanced)?.readyResources).toEqual(['money','science','materials']);
 expect(model.colonyShips).toBe(0);expect(model.resources.every(r=>r.cubes===0)).toBe(true);
 expect(model.planets.filter(p=>p.sectorId==='own'&&p.readyResources.length>0).length).toBeGreaterThan(0);
});
it('uses each faction catalog colony ships, action capacities and real fleet blueprint values',async()=>{
 const {BASE_FACTIONS}=await import('../../shared/eclipse/catalog');
 for(const faction of BASE_FACTIONS){
  const enemy=BASE_FACTIONS.find(other=>other.color!==faction.color)!;
  const view=getPlayerView(createGame({seed:12,seats:[{id:'a',faction:faction.id,controller:'human'},{id:'b',faction:enemy.id,controller:'ai'}]}),'a')!;
  const model=empireOverviewModel(view,'a');
  expect(model.colonyShipCapacity).toBe(faction.colonyShips);expect(model.tradeRatio).toBe(faction.tradeRatio);
  expect(model.capacities.find(c=>c.action==='move')?.amount).toBe(faction.activations.move);
  expect(model.fleets.find(f=>f.type===faction.startingShip)?.count).toBe(1);
  expect(model.planets.every(p=>!view.sectors.find(s=>s.id===p.sectorId)!.population.some(cube=>cube.squareId===p.squareId))).toBe(true);
 }
});
it('planet selection navigates to its actual sector and does not mutate the view',()=>{
 const view=fixture(),before=JSON.stringify(view),onSector=vi.fn();
 render(<EmpireOverview view={view} seatId="a" onSector={onSector} onNavigate={vi.fn()} onBlueprints={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:/Flexible planets:/}));
 const gray=empireOverviewModel(view,'a').planets.find(p=>p.resource==='gray'&&p.advanced)!;
 fireEvent.click(screen.getByRole('button',{name:`Inspect sector ${gray.tileId}, advanced Flexible planet, research required`}));
 expect(onSector).toHaveBeenCalledWith('flex');expect(JSON.stringify(view)).toBe(before);
});
it('reopens the latest private reputation result only on the viewer’s own empire',()=>{
 const view=fixture();view.private.reputationSummary={id:'saved-reputation',round:1,battleId:'battle1',sectorId:'own',drawn:[2,4],selected:4,kept:[4],returned:[2]};
 const callbacks={onSector:vi.fn(),onNavigate:vi.fn(),onBlueprints:vi.fn()};
 const ui=render(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 expect(screen.queryByRole('region',{name:'Your reputation result'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Latest reputation draw'}));
 expect(screen.getByRole('status')).toHaveTextContent('Selected 4 VP');
 fireEvent.click(screen.getByRole('button',{name:'Dismiss reputation result'}));
 expect(screen.queryByRole('region',{name:'Your reputation result'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Latest reputation draw'}));
 ui.rerender(<EmpireOverview view={view} seatId="b" {...callbacks}/>);
 expect(screen.queryByRole('button',{name:'Latest reputation draw'})).toBeNull();
 expect(screen.queryByRole('region',{name:'Your reputation result'})).toBeNull();
 expect(screen.queryByText('Selected 4 VP')).toBeNull();
 view.private.seatId='b';ui.rerender(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 expect(screen.queryByRole('button',{name:'Latest reputation draw'})).toBeNull();
});
