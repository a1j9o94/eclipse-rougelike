// @vitest-environment jsdom
import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands,type LegalCommandCandidate} from '../../shared/eclipse/legal';
import type {PlayerView} from '../../shared/eclipse/types';
import type {TechnologyId} from '../../shared/eclipse/technologies';
import {fundedCandidates} from '../second-dawn-game/fundedCandidates';
import {fundingOptions} from '../../shared/eclipse/funding';
import ResearchWorkspace from '../second-dawn-game/ResearchWorkspace';
import TradePanel from '../second-dawn-game/TradePanel';
import InfluencePlanner from '../second-dawn-game/InfluencePlanner';
import ColonizationPlanner from '../second-dawn-game/ColonizationPlanner';

afterEach(cleanup);
function position(){const state=createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});state.activeSeatId='a';state.seats[0].resources={money:30,science:30,materials:30};return state;}
function Research({view,onSubmit}:{view:PlayerView;onSubmit:ReturnType<typeof vi.fn>}){
 const [selected,setSelected]=useState<TechnologyId|null>(null);
 const [draft,setDraft]=useState<LegalCommandCandidate|null>(null);
 return <ResearchWorkspace view={view} purchases={[...legalCommands(view),...fundedCandidates(view)]} selected={selected} draft={draft} disabled={false} stale={false} stillLegal={!!draft&&([...legalCommands(view),...fundedCandidates(view)].some(candidate=>JSON.stringify(candidate.command)===JSON.stringify(draft.command))||draft.command.type==='trade-and-act'&&fundingOptions(view,draft.command.action).some(option=>JSON.stringify(option.command)===JSON.stringify(draft.command)))} acquired={null} onSelect={setSelected} onDraft={setDraft} onSubmit={onSubmit}/>;
}
it('replaces research A with B and C immediately and commits only C',()=>{
 const state=position();state.technologyMarket=['fusion-drive','gluon-computer','conifold-field'];const submit=vi.fn();render(<Research view={getPlayerView(state,'a')!} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:/Fusion Drive ×/}));fireEvent.click(screen.getByRole('button',{name:/Gluon Computer ×/}));fireEvent.click(screen.getByRole('button',{name:/Conifold Field ×/}));
 expect(screen.queryByText(/draft is still saved/)).not.toBeInTheDocument();
 fireEvent.click(within(screen.getByRole('region',{name:'Research Conifold Field'})).getByRole('button',{name:/Research ·/}));
 expect(submit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({type:'research',tileId:'conifold-field'}));
});
it('clears the previous commit when selecting an unavailable market tile',()=>{
 const state=position();state.technologyMarket=['fusion-drive','gluon-computer'];state.seats[0].resources={money:0,science:4,materials:0};render(<Research view={getPlayerView(state,'a')!} onSubmit={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:/Fusion Drive ×/}));fireEvent.click(screen.getByRole('button',{name:/Gluon Computer ×/}));
 expect(screen.queryByRole('button',{name:/Research ·/})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:/Return to .* draft/})).not.toBeInTheDocument();expect(screen.getByRole('alert')).toHaveTextContent('Not enough science');
});
it('retains a compatible research track when replacing a rare technology',()=>{
 const state=position();state.technologyMarket=['conifold-field','absorption-shield'];const submit=vi.fn();render(<Research view={getPlayerView(state,'a')!} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:/Conifold Field ×/}));fireEvent.click(screen.getByRole('radio',{name:'Nano'}));fireEvent.click(screen.getByRole('button',{name:/Absorption Shield ×/}));
 fireEvent.click(within(screen.getByRole('region',{name:'Research Absorption Shield'})).getByRole('button',{name:/Research ·/}));expect(submit).toHaveBeenCalledWith(expect.objectContaining({tileId:'absorption-shield',track:'nano'}));
});
it('keeps the purchase intact while inspecting an owned technology',()=>{
 const state=position();state.technologyMarket=['fusion-drive'];state.seats[0].technologies.grid.push('gluon-computer');const submit=vi.fn();render(<Research view={getPlayerView(state,'a')!} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:/Fusion Drive ×/}));fireEvent.click(screen.getByText('Your researched technologies'));fireEvent.click(screen.getByRole('button',{name:'Inspect researched Gluon Computer'}));
 expect(screen.getByRole('region',{name:'Research Fusion Drive'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:/Research ·/}));expect(submit).toHaveBeenCalledWith(expect.objectContaining({tileId:'fusion-drive'}));
});
it('preserves the trade quantity through source and output edits and shows affordability locally',()=>{
 const state=position();state.seats[0].resources.materials=2;const view=getPlayerView(state,'a')!,submit=vi.fn();render(<TradePanel view={view} candidates={legalCommands(view)} disabled={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Increase received amount'}));fireEvent.click(screen.getByRole('button',{name:'Increase received amount'}));fireEvent.click(screen.getByRole('button',{name:'Pay with materials'}));
 expect(screen.getByRole('img',{name:'Receive 3 science'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Confirm conversion'})).toBeDisabled();expect(screen.getByRole('status')).toHaveTextContent(/materials/);
 fireEvent.click(screen.getByRole('button',{name:'Pay with money'}));fireEvent.click(screen.getByRole('button',{name:'Receive materials'}));expect(screen.getByRole('img',{name:'Receive 3 materials'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Confirm conversion'}));expect(submit).toHaveBeenCalledExactlyOnceWith({type:'trade',from:'money',to:'materials',amount:3});
});
it('keeps an explicit influence source when the destination changes',()=>{
 const state=position();const source=state.sectors.find(s=>s.owner==='a')!;const a={...source,id:'first',tileId:'305',owner:null,population:[]},b={...a,id:'second',tileId:'306'};state.sectors.push(a,b);const candidates=[a,b].map(target=>({command:{type:'influence' as const,removeSectorIds:[source.id],addSectorIds:[target.id]},label:'Transfer',description:''}));const submit=vi.fn();const props={view:getPlayerView(state,'a')!,candidates,disabled:false,onSubmit:submit};const ui=render(<InfluencePlanner {...props} selectedSectorId={a.id}/>);
 fireEvent.click(screen.getByRole('button',{name:`Use disc from sector ${source.tileId}`}));ui.rerender(<InfluencePlanner {...props} selectedSectorId={b.id}/>);fireEvent.click(screen.getByRole('button',{name:`Withdraw from ${source.tileId} and control ${b.tileId}`}));expect(submit).toHaveBeenCalledExactlyOnceWith(candidates[1].command);
});
it('shows the incompatible influence source without substituting a track disc',()=>{
 const state=position();const source=state.sectors.find(s=>s.owner==='a')!;const a={...source,id:'first',tileId:'305',owner:null,population:[]},b={...a,id:'second',tileId:'306'};state.sectors.push(a,b);const candidates=[{command:{type:'influence' as const,removeSectorIds:[source.id],addSectorIds:[a.id]},label:'Transfer',description:''},{command:{type:'influence' as const,removeSectorIds:[],addSectorIds:[b.id]},label:'Control',description:''}];const props={view:getPlayerView(state,'a')!,candidates,disabled:false,onSubmit:vi.fn()};const ui=render(<InfluencePlanner {...props} selectedSectorId={a.id}/>);fireEvent.click(screen.getByRole('button',{name:`Use disc from sector ${source.tileId}`}));ui.rerender(<InfluencePlanner {...props} selectedSectorId={b.id}/>);
 expect(screen.getByRole('button',{name:`Withdraw from ${source.tileId} and control ${b.tileId}`})).toBeDisabled();expect(screen.getByText(/The disc from sector/)).toHaveTextContent(/source|disc from sector/i);expect(screen.getByRole('button',{name:'Use a disc from the track'})).toBeInTheDocument();
});
it('drafts a fixed-resource colony once and inspecting it again never removes the placement',()=>{
 const state=position();const sector=state.sectors.find(s=>s.owner==='a')!;sector.population=[];const command={type:'colonize' as const,placements:[{sectorId:sector.id,squareId:'p0',resource:'money' as const}]};const submit=vi.fn();render(<ColonizationPlanner view={getPlayerView(state,'a')!} candidates={[{command,label:'Colonize',description:''}]} disabled={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:/Colonize Money planet p0/}));expect(screen.queryByRole('button',{name:'Money population'})).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:/Colonize Money planet p0/}));fireEvent.click(screen.getByRole('button',{name:'Colonize 1 planet'}));expect(submit).toHaveBeenCalledExactlyOnceWith(command);
});
it('selects development A then B without spending and commits the displayed development',()=>{
 const state=position();state.ruleOptions={technologyVariant:true};const submit=vi.fn();render(<Research view={getPlayerView(state,'a')!} onSubmit={submit}/>);
 fireEvent.click(within(screen.getByRole('heading',{name:'Ancient Labs'}).closest('article')!).getByRole('button',{name:'Acquire'}));expect(submit).not.toHaveBeenCalled();
 fireEvent.click(within(screen.getByRole('heading',{name:'Quantum Labs'}).closest('article')!).getByRole('button',{name:'Acquire'}));fireEvent.click(screen.getByRole('button',{name:'Acquire Quantum Labs · 7 materials'}));expect(submit).toHaveBeenCalledExactlyOnceWith({type:'research-development',developmentId:'quantum-labs'});
});
it('previews Quantum research before committing the selected lab placement',()=>{
 const state=position();state.ruleOptions={technologyVariant:true};state.seats[0].developments=[{id:'quantum-labs'}];state.technologyMarket=['fusion-drive'];const submit=vi.fn();render(<Research view={getPlayerView(state,'a')!} onSubmit={submit}/>);fireEvent.click(screen.getByRole('button',{name:/Fusion Drive ×/}));fireEvent.click(screen.getByRole('button',{name:/Use Quantum Labs/}));expect(submit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Research · 0 science'}));expect(submit).toHaveBeenCalledExactlyOnceWith({type:'quantum-research',tileId:'fusion-drive',track:'nano'});
});

it('keeps an explicitly chosen funding resource when replacing research with a different price',()=>{
 const state=position();state.technologyMarket=['conifold-field','absorption-shield'];state.seats[0].resources.science=0;const submit=vi.fn();render(<Research view={getPlayerView(state,'a')!} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:/Conifold Field ×/}));fireEvent.click(screen.getByText('Change conversion'));fireEvent.click(screen.getByRole('button',{name:'Pay 10 money'}));fireEvent.click(screen.getByRole('button',{name:/Absorption Shield ×/}));fireEvent.click(screen.getByRole('button',{name:'Convert & Research · 6 science'}));expect(submit).toHaveBeenCalledWith({type:'trade-and-act',action:{type:'research',tileId:'absorption-shield',track:'military'},trades:[{from:'money',to:'science',amount:6}]});
});
it('retains an unaffordable research payment visibly instead of spending a different resource',()=>{
 const state=position();state.technologyMarket=['conifold-field','absorption-shield'];state.seats[0].resources={money:10,science:0,materials:30};const submit=vi.fn();render(<Research view={getPlayerView(state,'a')!} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:/Conifold Field ×/}));fireEvent.click(screen.getByText('Change conversion'));fireEvent.click(screen.getByRole('button',{name:'Pay 10 money'}));fireEvent.click(screen.getByRole('button',{name:/Absorption Shield ×/}));expect(screen.getByRole('button',{name:'Convert & Research · 6 science'})).toBeDisabled();expect(screen.getByRole('alert')).toHaveTextContent('selected payment');expect(submit).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Change conversion'));fireEvent.click(screen.getByRole('button',{name:'Pay 12 materials'}));fireEvent.click(screen.getByRole('button',{name:'Convert & Research · 6 science'}));expect(submit).toHaveBeenCalledWith(expect.objectContaining({trades:[{from:'materials',to:'science',amount:6}]}));
});
it('inspects an owned market copy without replacing the active purchase',()=>{
 const state=position();state.technologyMarket=['fusion-drive','gluon-computer'];state.seats[0].technologies.grid.push('gluon-computer');const submit=vi.fn();render(<Research view={getPlayerView(state,'a')!} onSubmit={submit}/>);fireEvent.click(screen.getByRole('button',{name:/Fusion Drive ×/}));fireEvent.click(screen.getByRole('button',{name:/Gluon Computer ×/}));expect(screen.getByRole('dialog',{name:'Gluon Computer'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Close technology inspection'}));fireEvent.click(screen.getByRole('button',{name:'Research · 4 science'}));expect(submit).toHaveBeenCalledExactlyOnceWith({type:'research',tileId:'fusion-drive',track:'nano'});
});
it('chooses a Shrine track space and actual planet, previews its placement, then commits once',()=>{
 const state=createGame({seed:42,factionProfile:'expanded-v2',seats:[{id:'a',faction:'lyra',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});state.activeSeatId='a';state.seats[0].resources={money:20,science:20,materials:20};const submit=vi.fn();render(<Research view={getPlayerView(state,'a')!} onSubmit={submit}/>);fireEvent.click(screen.getByRole('button',{name:'Select Science Shrine 1'}));const planets=screen.getAllByRole('button',{name:/Place Shrine on .*planet/});fireEvent.click(planets.find(button=>!button.hasAttribute('disabled'))!);expect(screen.getByLabelText('Planned Shrine')).toBeInTheDocument();expect(submit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Place science Shrine · 2 science'}));expect(submit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({type:'place-shrine',row:'science',column:0}));
});
