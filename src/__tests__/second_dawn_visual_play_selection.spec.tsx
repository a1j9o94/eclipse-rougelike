import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import {sectorDefinition} from '../../shared/eclipse/sectors';
import SectorPlanets from '../second-dawn-game/SectorPlanets';
import ColonizationPlanner from '../second-dawn-game/ColonizationPlanner';
import ResearchCost from '../second-dawn-game/ResearchCost';
import TradePanel from '../second-dawn-game/TradePanel';
import EconomyDecision from '../second-dawn-game/EconomyDecision';
import ScifiDecision from '../second-dawn-game/ScifiDecision';
import TechnologyStats from '../second-dawn-game/TechnologyStats';
import DiplomacyExchangePreview from '../second-dawn-game/DiplomacyExchangePreview';
import {getTechnology} from '../../shared/eclipse/technologies';
afterEach(cleanup);
function fixture(){const state=createGame({seed:1,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});state.activeSeatId='a';const sector=state.sectors.find(item=>item.owner==='a')!;sector.population=[];state.seats[0].resources={money:12,science:4,materials:8};return {state,sector,view:getPlayerView(state,'a')!};}
it('shows a blocked planet explanation only on that inspectable object',()=>{
 const {view,sector}=fixture();const index=sectorDefinition(Number(sector.tileId))!.population.findIndex(square=>square.advanced&&square.resource==='money');expect(index).toBeGreaterThan(-1);
 render(<SectorPlanets sector={view.sectors.find(item=>item.id===sector.id)!} view={view} candidates={legalCommands(view)}/>);
 expect(screen.queryByText('Colonization requirements')).not.toBeInTheDocument();
 expect(screen.queryByText(/Requires Advanced Economy/)).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:`Inspect Money planet p${index} in sector ${sector.tileId}`}));
 expect(screen.getByRole('status')).toHaveTextContent('Requires Advanced Economy');
 expect(screen.getByRole('button',{name:'Inspect Advanced Economy'})).toBeEnabled();
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('keeps opponent planet inspection free of repeated ownership requirements',()=>{
 const {view}=fixture();const sector=view.sectors.find(item=>item.owner==='b')!;
 render(<SectorPlanets sector={sector} view={view} candidates={[]}/>);
 expect(screen.queryByText(/Only this sector.s controller/)).not.toBeInTheDocument();
 expect(screen.queryByText('Colonization requirements')).not.toBeInTheDocument();
});
it('puts a planned colony on its planet and removes redundant empty-detail instructions',()=>{
 const {view,sector}=fixture();render(<ColonizationPlanner view={view} candidates={legalCommands(view)} selectedSectorId={sector.id} disabled={false} onSubmit={vi.fn()}/>);
 expect(screen.queryByText('Select a planet to see its compatible population cubes.')).not.toBeInTheDocument();
 const planet=screen.getByRole('button',{name:`Colonize Money planet p0 in sector ${sector.tileId}`});fireEvent.click(planet);
 expect(within(planet).getByRole('img',{name:'Planned Money cube'})).toBeInTheDocument();
 expect(screen.queryByText('Action and upkeep details')).not.toBeInTheDocument();
});
it('shows effective research price before optional arithmetic inspection',()=>{
 render(<ResearchCost cost={4} available={6} pricing={{base:7,minimum:3,discount:3}}/>);
 expect(screen.queryByText('Base 7')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Inspect research price'}));
 expect(screen.getByText(/7.*3.*4/)).toBeInTheDocument();
});
it('lets the player enter a trade quantity and explicitly choose the maximum',()=>{
 const {view}=fixture(),submit=vi.fn();render(<TradePanel view={view} candidates={legalCommands(view)} disabled={false} onSubmit={submit}/>);
 fireEvent.change(screen.getByRole('spinbutton',{name:'Science to receive'}),{target:{value:'4'}});
 expect(screen.getByRole('img',{name:'Spend 8 money'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Max'}));expect(screen.getByRole('spinbutton',{name:'Science to receive'})).toHaveValue(6);
 expect(submit).not.toHaveBeenCalled();
});
it('keeps unavailable resource choices inspectable without changing payment',()=>{
 const {view}=fixture();render(<TradePanel view={view} candidates={[{command:{type:'trade',from:'money',to:'science',amount:1},label:'Trade',description:''}]} disabled={false} onSubmit={vi.fn()}/>);
 const blocked=screen.getByRole('button',{name:'Receive money'});expect(blocked).not.toBeDisabled();fireEvent.click(blocked);
 expect(screen.getByRole('status')).toHaveTextContent('Money is unavailable for this exchange.');
 expect(screen.getByRole('button',{name:'Receive science'})).toHaveAttribute('aria-pressed','true');
});
it('shows the actual resource yield in a reward pool before allocation',()=>{
 const {view}=fixture();render(<EconomyDecision view={view} decision={{id:'reward',owner:'a',kind:'resource-reward',count:2,perChoice:5}} candidates={[]} reputation={[]} disabled={false} onSubmit={vi.fn()}/>);
 expect(screen.getByText('10 resources')).toBeInTheDocument();
 expect(screen.getByText('2 tokens · 5 resources each')).toBeInTheDocument();
 fireEvent.click(screen.getAllByRole('button',{name:'Put remaining here'})[0]);
 expect(screen.getByRole('button',{name:'Take 10 resources'})).toBeEnabled();
});
it('keeps the selected discovery visually identifiable in its replacement slot',()=>{
 render(<ScifiDecision decision={{id:'draft',owner:'a',kind:'discovery-draft',tileIds:['money','science'],keepCount:1}} disabled={false} onSubmit={vi.fn()}/>);
 fireEvent.click(screen.getAllByRole('checkbox')[0]);
 expect(within(screen.getByRole('button',{name:'Replace discovery 1'})).getByRole('img')).toBeInTheDocument();
});
it('identifies Wormhole Generator with the map opening symbol, distinct from a warp portal',()=>{
 const {container}=render(<TechnologyStats technology={getTechnology('wormhole-generator')}/>);
 expect(container.querySelector('[data-wormhole-mark="printed"]')).toBeInTheDocument();
 expect(container.querySelector('[data-structure="warp-portal"]')).not.toBeInTheDocument();
});

it('explains a minimum research price without presenting false arithmetic',()=>{
 render(<ResearchCost cost={3} available={6} pricing={{base:4,minimum:3,discount:2}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Inspect research price'}));
 expect(screen.queryByText('4 − 2 = 3 science · minimum 3 (minimum reached)')).not.toBeInTheDocument();
 expect(screen.getByText(/minimum 3/)).toBeInTheDocument();
});
it('shows only conversion commitment while covering bankruptcy with trade',()=>{
 const {view}=fixture();const decision={id:'bankrupt',owner:'a',kind:'bankruptcy' as const,shortfall:2,abandonableSectorIds:[view.sectors[0].id]};
 render(<EconomyDecision view={{...view,pendingDecision:decision}} decision={decision} candidates={legalCommands(view)} reputation={[]} disabled={false} onSubmit={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Convert to cover upkeep'}));
 expect(screen.getByRole('button',{name:'Confirm conversion'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Abandon selected sector'})).not.toBeInTheDocument();
});
it('keeps the betrayal consequence visible in either ambassador exchange entry point',()=>{
 const {view}=fixture();render(<DiplomacyExchangePreview seat={view.seats[0]} partner={view.seats[1]} resources={['money']} resource="money" onResourceChange={vi.fn()} disabled={false}/>);
 expect(screen.getByText('Betrayal: traitor card −2 VP')).toBeInTheDocument();
});
