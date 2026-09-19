// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,within,fireEvent} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {SECTORS} from '../../shared/eclipse/sectors';
import {getTechnology} from '../../shared/eclipse/technologies';
import type {PlayerView,Sector} from '../../shared/eclipse/types';
import {advancedPopulationOpportunity} from '../second-dawn-game/advancedPopulationOpportunity';
import ResearchWorkspace from '../second-dawn-game/ResearchWorkspace';

afterEach(cleanup);
function fixture():PlayerView {
 const state=createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 const view=getPlayerView(state,'a')!;
 const gray=SECTORS.find(s=>s.population.some(p=>p.advanced&&p.resource==='gray'))!;
 const sector=(id:string,tileId:number,owner:string|null):Sector=>({...view.sectors[0],id,tileId:String(tileId),owner,population:[]});
 view.sectors=[sector('center',1,'a'),sector('gray',gray.id,'a'),sector('enemy',1,'b'),sector('unowned',1,null)];
 view.seats[0].technologies={military:[],grid:[],nano:[]};
 view.seats[0].colonyShipsAvailable=3;
 view.seats[0].populationTracks={money:10,science:10,materials:11};
 view.technologyMarket=['advanced-labs','advanced-mining','advanced-economy','metasynthesis'];
 return view;
}
it('counts only empty controlled advanced matching or gray squares, regardless of turn',()=>{
 const view=fixture();view.activeSeatId='b';
 const result=advancedPopulationOpportunity(view,getTechnology('advanced-labs'))!;
 expect(result.eligible).toBe(2);expect(result.newOptions).toBe(2);expect(result.populationCapacity).toBe(1);
 view.sectors[0].population=[{squareId:'p2',resource:'science'}];
 expect(advancedPopulationOpportunity(view,getTechnology('advanced-labs'))!.eligible).toBe(1);
 expect(advancedPopulationOpportunity(view,getTechnology('fusion-drive'))).toBeNull();
});
it('deduplicates gray planets and shares resource cube supply for Metasynthesis',()=>{
 const view=fixture();
 const result=advancedPopulationOpportunity(view,getTechnology('metasynthesis'))!;
 const expected=view.sectors.filter(s=>s.owner==='a').reduce((n,s)=>n+SECTORS.find(d=>String(d.id)===s.tileId)!.population.filter(p=>p.advanced).length,0);
 expect(result.eligible).toBe(expected);expect(result.populationCapacity).toBe(2);
 view.seats[0].colonyShipsAvailable=1;
 expect(advancedPopulationOpportunity(view,getTechnology('metasynthesis'))!.populationCapacity).toBe(1);
 view.seats[0].colonyShipsAvailable=0;
 expect(advancedPopulationOpportunity(view,getTechnology('metasynthesis'))!.eligible).toBe(expected);
 expect(advancedPopulationOpportunity(view,getTechnology('metasynthesis'))!.populationCapacity).toBe(0);
});
it('distinguishes already unlocked squares from new resource options',()=>{
 const view=fixture();view.seats[0].technologies.grid=['advanced-economy'];
 expect(advancedPopulationOpportunity(view,getTechnology('advanced-labs'))!.newOptions).toBe(2);
 view.seats[0].technologies.nano=['metasynthesis'];
 expect(advancedPopulationOpportunity(view,getTechnology('advanced-labs'))!.newOptions).toBe(0);
 expect(advancedPopulationOpportunity(view,getTechnology('advanced-labs'))!.eligible).toBe(2);
 view.sectors=[];
 expect(advancedPopulationOpportunity(view,getTechnology('advanced-labs'))!.eligible).toBe(0);
});
it('shows visual counts on market and owned tiles and supply detail that refreshes with the view',()=>{
 const view=fixture(),onSubmit=vi.fn(),onSelect=vi.fn();
 const props={view,purchases:[],selected:'advanced-labs' as const,draft:null,disabled:false,stale:false,stillLegal:true,acquired:null,onSelect,onDraft:vi.fn(),onSubmit};
 const rendered=render(<ResearchWorkspace {...props}/>);
 const card=screen.getByRole('button',{name:/Advanced Labs ×/});
 expect(within(card).getByLabelText('2 eligible empty advanced planets for science')).toBeInTheDocument();
 const detail=screen.getByRole('region',{name:'Research Advanced Labs'});
 expect(within(detail).getByText(/Up to 1 population with current supplies/)).toBeInTheDocument();
 fireEvent.click(card);expect(onSubmit).not.toHaveBeenCalled();
 view.seats[0].technologies.nano=['advanced-labs'];view.sectors[0].population=[{squareId:'p2',resource:'science'}];
 rendered.rerender(<ResearchWorkspace {...props} view={{...view}}/>);
 expect(within(screen.getByRole('button',{name:'Inspect researched Advanced Labs'})).getByLabelText('1 eligible empty advanced planet for science')).toBeInTheDocument();
 expect(within(detail).getByText(/Already unlocked/)).toBeInTheDocument();
});

it.each([['advanced-labs','science'],['advanced-economy','money'],['advanced-mining','materials']] as const)('counts %s against catalog squares and ignores orbitals', (id,resource)=>{
 const view=fixture();view.sectors=view.sectors.filter(s=>s.owner==='a');
 view.sectors.forEach(s=>{s.orbital=true;});
 const expected=view.sectors.reduce((n,s)=>n+SECTORS.find(d=>String(d.id)===s.tileId)!.population.filter(p=>p.advanced&&(p.resource===resource||p.resource==='gray')).length,0);
 const before=JSON.stringify(view);
 expect(advancedPopulationOpportunity(view,getTechnology(id))!.eligible).toBe(expected);
 expect(JSON.stringify(view)).toBe(before);
});
it('allows twelve cubes on a track at minus one without inventing extra population spaces',()=>{
 const view=fixture();view.seats[0].populationTracks.science=-1;
 expect(advancedPopulationOpportunity(view,getTechnology('advanced-labs'))).toMatchObject({eligible:2,populationCapacity:2,cubes:[{resource:'science',available:12}]});
});
