import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {processGameCommand} from '../../shared/eclipse/engine';
import {legalCommands} from '../../shared/eclipse/legal';
import {SECTORS} from '../../shared/eclipse/sectors';
import {adjacentPosition} from '../../shared/eclipse/geometry';
import ExplorationDecision from '../second-dawn-game/ExplorationDecision';
import {createExplorationMapView} from '../second-dawn-game/explorationPreview';
afterEach(cleanup);
function fixture(){
 const state=createGame({seed:1703,warpPortals:true,seats:[{id:'human',faction:'terran-directorate',controller:'human'},{id:'enemy',faction:'hydran',controller:'ai'}]});
 const command=legalCommands(getPlayerView(state,'human')!).find(c=>c.command.type==='explore')!.command;
 const result=processGameCommand(state,'human',command);if(!result.ok)throw Error(result.error.message);
 const view=getPlayerView(result.state,'human')!,original=view.pendingDecision;if(original?.kind!=='exploration')throw Error('exploration fixture');
 const tile=SECTORS.find(tile=>tile.ancients>0&&tile.population.some(planet=>planet.advanced))!;
 const decision={...original,drawnTileIds:[String(tile.id)],placements:[{tileId:String(tile.id),rotation:0}]};
 const position=([0,1,2,3,4,5]as const).map(edge=>adjacentPosition(decision.position,edge)).find(position=>!view.sectors.some(sector=>sector.position.q===position.q&&sector.position.r===position.r))!;
 view.sectors.push({id:'enemy-border',tileId:'221',owner:'enemy',position,rotation:0,population:[],orbital:false,monolith:false,discovery:false});
 view.ships.push({id:'enemy-cruiser',type:'cruiser',owner:'enemy',sectorId:'enemy-border',damage:0});
 return{view,decision,tile};
}
it('adds only the revealed sector and its Ancient defenders to an immutable public map preview',()=>{
 const {view,decision,tile}=fixture(),before=JSON.stringify(view);
 const preview=createExplorationMapView(view,decision,String(tile.id),2)!;
 expect(preview.view.sectors).toHaveLength(view.sectors.length+1);
 expect(preview.sector.position).toEqual(decision.position);expect(preview.sector.rotation).toBe(2);
 expect(preview.sector.owner).toBeNull();expect(preview.sector.population).toEqual([]);
 expect(preview.view.ships.filter(ship=>ship.sectorId===preview.sector.id&&ship.type==='ancient')).toHaveLength(tile.ancients);
 expect(JSON.stringify(view)).toBe(before);
 expect(createExplorationMapView(view,decision,'not-drawn',0)).toBeNull();
});
it('shows the drawn sector on the real galaxy with visible contents and readable neighboring fleets',()=>{
 const {view,decision,tile}=fixture(),before=JSON.stringify(view),submit=vi.fn();
 render(<ExplorationDecision view={view} decision={decision} disabled={false} onSubmit={submit}/>);
 const map=screen.getByRole('group',{name:'Galaxy map'});
 expect(within(map).getAllByRole('button',{name:/^Inspect sector /})).toHaveLength(view.sectors.length+1);
 expect(screen.getByRole('heading',{name:'Planets & population'})).toBeVisible();
 expect(screen.getAllByRole('img',{name:'Advanced planet'}).length).toBeGreaterThan(0);
 expect(screen.getByRole('group',{name:new RegExp(`Ancients · ${tile.ancients} Ancient`)})).toBeVisible();
 expect(screen.getByRole('heading',{name:'Sector features'})).toBeVisible();
 expect(screen.queryByText(/Player \d/)).toBeNull();
 fireEvent.click(within(map).getByRole('button',{name:/Inspect sector 221, Hydran Progress/}));
 expect(screen.getByRole('group',{name:'Hydran Progress · 1 Cruiser'})).toBeVisible();
 expect(within(map).getByRole('button',{name:new RegExp(`Inspect sector ${tile.id}, uncontrolled,.*new sector preview`)})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Rotate clockwise'}));
 expect(JSON.stringify(view)).toBe(before);expect(submit).not.toHaveBeenCalled();
});
it('fits the candidate and neighboring hex extents within the preview viewport',async()=>{
 const {fitExplorationCamera}=await import('../second-dawn-game/explorationPreview');
 const camera=fitExplorationCamera([{q:0,r:0},{q:1,r:0},{q:0,r:1}],{width:360,height:170,viewWidth:900,viewHeight:800},true);
 const scale=Math.min(360/900,170/800);
 for(const position of [{q:0,r:0},{q:1,r:0},{q:0,r:1}]){
  const x=Math.sqrt(3)*60*(position.q+position.r/2),y=90*position.r;
  expect((Math.abs(x-camera.center.x)+58)*scale*camera.zoom).toBeLessThanOrEqual(180);
  expect((Math.abs(y-camera.center.y)+58)*scale*camera.zoom).toBeLessThanOrEqual(85);
 }
 expect(camera.zoom).toBeGreaterThanOrEqual(.6);expect(camera.zoom).toBeLessThanOrEqual(5);
});
