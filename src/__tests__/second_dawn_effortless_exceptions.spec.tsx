// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import {getMinorSpecies} from '../../shared/eclipse/minorSpecies';
import type {PendingDecision} from '../../shared/eclipse/types';
import EconomyDecision from '../second-dawn-game/EconomyDecision';
import ScifiDecision from '../second-dawn-game/ScifiDecision';
import FactionAbilityControls from '../second-dawn-game/FactionAbilityControls';
import MinorSpeciesMarket from '../second-dawn-game/MinorSpeciesMarket';
import DiplomacyPanel from '../second-dawn-game/DiplomacyPanel';
import GuildTradePanel from '../second-dawn-game/GuildTradePanel';
afterEach(cleanup);
function fixture(){const state=createGame({seed:42,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});state.activeSeatId='a';state.seats[0].resources={money:30,science:30,materials:30};return state;}
it('allocates a reward by quantity and puts the remaining pool on a chosen track',()=>{
 const state=fixture();const decision:PendingDecision={kind:'resource-reward',id:'resource',owner:'a',count:7,perChoice:5};state.pendingDecision=decision;const view=getPlayerView(state,'a')!,submit=vi.fn();render(<EconomyDecision decision={decision} view={view} candidates={legalCommands(view)} reputation={[]} disabled={false} onSubmit={submit}/>);
 fireEvent.change(screen.getByRole('spinbutton',{name:'Money allocation'}),{target:{value:'2'}});fireEvent.click(within(screen.getByRole('region',{name:'Science allocation'})).getByRole('button',{name:'Put remaining here'}));fireEvent.click(screen.getByRole('button',{name:'Confirm reward'}));expect(submit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:'resource',choice:{kind:'resource-reward',resources:['money','money','science','science','science','science','science']}});
});
it('automatically fills the only population-return destination without a picker',()=>{
 const state=fixture();const decision:PendingDecision={kind:'population-return',id:'return',owner:'a',resources:['money'],count:1};state.pendingDecision=decision;const view=getPlayerView(state,'a')!,submit=vi.fn();render(<EconomyDecision decision={decision} view={view} candidates={legalCommands(view)} reputation={[]} disabled={false} onSubmit={submit}/>);
 expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Confirm population return'}));expect(submit).toHaveBeenCalledWith({type:'resolve',decisionId:'return',choice:{kind:'population-return',resources:['money']}});
});
it('uses a sole legal free-technology track without a track picker',()=>{
 const state=fixture();state.technologyMarket=['fusion-drive'];const decision:PendingDecision={kind:'free-technology',id:'free',owner:'a',technologyIds:['fusion-drive']};state.pendingDecision=decision;const view=getPlayerView(state,'a')!,submit=vi.fn();render(<EconomyDecision decision={decision} view={view} candidates={legalCommands(view)} reputation={[]} disabled={false} onSubmit={submit}/>);fireEvent.click(screen.getByRole('button',{name:'Choose free Fusion Drive'}));expect(screen.queryByRole('radio')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Confirm free technology'}));expect(submit).toHaveBeenCalledWith({type:'resolve',decisionId:'free',choice:{kind:'free-technology',technologyId:'fusion-drive',track:'nano'}});
});
it('replaces one discovery in a full tray without clearing the other chosen instance',()=>{
 const submit=vi.fn();const decision:PendingDecision={kind:'discovery-draft',id:'draft',owner:'a',tileIds:['money','money','materials'],keepCount:2};render(<ScifiDecision decision={decision} disabled={false} onSubmit={submit}/>);const checkboxes=screen.getAllByRole('checkbox');fireEvent.click(checkboxes[0]);fireEvent.click(checkboxes[1]);fireEvent.click(screen.getByRole('button',{name:'Replace discovery 2'}));fireEvent.click(checkboxes[2]);fireEvent.click(screen.getByRole('button',{name:'Keep 2 discoveries'}));expect(submit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:'draft',choice:{kind:'discovery-draft',tileIds:['money','materials']}});
});
it('previews a faction conversion and lets another resource replace it before committing',()=>{
 const state=fixture();state.seats[0].faction='magellan';const view=getPlayerView(state,'a')!,submit=vi.fn();const candidates=(['science','money'] as const).map(resource=>({command:{type:'convert-colony-ship' as const,resource},label:'Convert',description:''}));render(<FactionAbilityControls view={view} candidates={candidates} disabled={false} onSubmit={submit} onAction={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:/Gain 1 science/}));expect(submit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:/Gain 1 money/}));fireEvent.click(screen.getByRole('button',{name:'Convert colony ship · gain 1 money'}));expect(submit).toHaveBeenCalledExactlyOnceWith({type:'convert-colony-ship',resource:'money'});
});
it('expands only the selected Minor Species purchase and permits replacing it freely',()=>{
 const view=getPlayerView(fixture(),'a')!;view.minorSpecies={market:['researchers','population']};view.private.reputation=[];const submit=vi.fn();render(<MinorSpeciesMarket view={view} disabled={false} onSubmit={submit}/>);expect(screen.queryByRole('button',{name:/Buy/})).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:`Select ${getMinorSpecies('researchers').name}`}));expect(screen.getAllByRole('button',{name:/Buy/})).toHaveLength(1);fireEvent.click(screen.getByRole('button',{name:`Select ${getMinorSpecies('population').name}`}));expect(screen.queryByRole('button',{name:/Buy Researchers/})).not.toBeInTheDocument();expect(submit).not.toHaveBeenCalled();
});
it('selects the actual private reputation tile before returning it',()=>{
 const view=getPlayerView(fixture(),'a')!;view.private.reputation=[2,4];const submit=vi.fn();render(<DiplomacyPanel view={view} candidates={[{command:{type:'discard-reputation',values:[2]},label:'Return 2',description:''}]} disabled={false} onSubmit={submit}/>);fireEvent.click(screen.getByRole('button',{name:'Your reputation: 2 VP'}));expect(submit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Return selected reputation · lose 2 VP'}));expect(submit).toHaveBeenCalledExactlyOnceWith({type:'discard-reputation',values:[2]});
});
it('retains a partially filled Guild exchange quantity when stock changes and identifies the shortage',()=>{
 const state=fixture();state.guildOffers=[{id:'offer',owner:'b',give:'materials',receive:'science',remaining:3}];const view=getPlayerView(state,'a')!,submit=vi.fn();const props={disabled:false,onSubmit:submit};const ui=render(<GuildTradePanel view={view} candidates={legalCommands(view)} {...props}/>);fireEvent.change(screen.getByRole('spinbutton',{name:'Exchange quantity for offer'}),{target:{value:'3'}});view.guildOffers![0].remaining=1;ui.rerender(<GuildTradePanel view={view} candidates={legalCommands(view)} {...props}/>);expect(screen.getByRole('spinbutton',{name:'Exchange quantity for offer'})).toHaveValue(3);expect(screen.getByRole('button',{name:'Pay 3 science · receive 3 materials'})).toBeDisabled();expect(screen.getByRole('status')).toHaveTextContent(/1 .*available/);
});
