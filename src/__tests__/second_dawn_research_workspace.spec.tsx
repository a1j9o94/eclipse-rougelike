// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import {processGameCommand} from '../../shared/eclipse/engine';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';

afterEach(cleanup);

function fixture(){
 const state=createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 state.activeSeatId='a';state.technologyMarket=['fusion-drive','gluon-computer'];state.seats[0].resources={money:8,science:1,materials:8};
 return state;
}

it('keeps benefit, track, funding, exact cost, and commit beside the selected tile',()=>{
 const view=getPlayerView(fixture(),'a')!,submit=vi.fn();
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getAllByRole('button',{name:'Research',exact:true})[0]);
 fireEvent.click(screen.getByRole('button',{name:/Fusion Drive ×/}));
 const purchase=screen.getByRole('region',{name:'Research Fusion Drive'});
 expect(document.activeElement).toBe(purchase);
 expect(within(purchase).getByText(/Unlocks this part for Upgrade/)).toBeInTheDocument();
 expect(within(purchase).getByText('Conversion required')).toBeInTheDocument();
 expect(within(purchase).getByRole('button',{name:/Research · 4 science/})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Confirm action'})).not.toBeInTheDocument();
 fireEvent.click(within(purchase).getByRole('button',{name:/Research · 4 science/}));
 expect(submit).toHaveBeenCalledTimes(1);
});

it('preserves an unfinished purchase while inspecting another technology',()=>{
 const view=getPlayerView(fixture(),'a')!;
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getAllByRole('button',{name:'Research',exact:true})[0]);
 fireEvent.click(screen.getByRole('button',{name:/Fusion Drive ×/}));
 fireEvent.click(screen.getByRole('button',{name:/Gluon Computer ×/}));
 expect(screen.getByRole('button',{name:'Return to Fusion Drive draft'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Return to Fusion Drive draft'}));
 expect(screen.getByRole('region',{name:'Research Fusion Drive'})).toBeInTheDocument();
});

it('shows acquired payoff only after the accepted result owns the tile and keeps research open',()=>{
 const state=fixture();state.seats[0].resources.science=20;
 const submit=vi.fn();const props={candidates:legalCommands(getPlayerView(state,'a')!),connected:true,busy:false,status:'',onSubmit:submit,onMenu:vi.fn()};
 const rendered=render(<SecondDawnBoard view={getPlayerView(state,'a')!} {...props}/>);
 fireEvent.click(screen.getAllByRole('button',{name:'Research',exact:true})[0]);fireEvent.click(screen.getByRole('button',{name:/Fusion Drive ×/}));fireEvent.click(screen.getByRole('button',{name:'Research · 4 science'}));
 rendered.rerender(<SecondDawnBoard view={getPlayerView(state,'a')!} {...props} lastAcceptedCommand={{revision:1,type:'research'}}/>);
 expect(screen.queryByText(/Acquired · Fusion Drive/)).not.toBeInTheDocument();
 const result=processGameCommand(state,'a',submit.mock.calls[0][0]);if(!result.ok)throw Error(result.error.message);
 const nextView=getPlayerView(result.state,'a')!;
 rendered.rerender(<SecondDawnBoard view={nextView} {...props} candidates={legalCommands(nextView)} lastAcceptedCommand={{revision:nextView.revision,type:'research'}}/>);
 expect(screen.getByText('Acquired · Fusion Drive')).toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'Research'})).toBeInTheDocument();
});

it('does not clear or redirect a newer research draft when an earlier receipt settles',()=>{
 const state=fixture();state.seats[0].resources.science=30;
 const submit=vi.fn();const initialView=getPlayerView(state,'a')!;const props={candidates:legalCommands(initialView),connected:true,busy:false,status:'',onSubmit:submit,onMenu:vi.fn()};
 const rendered=render(<SecondDawnBoard view={initialView} {...props}/>);
 fireEvent.click(screen.getAllByRole('button',{name:'Research',exact:true})[0]);fireEvent.click(screen.getByRole('button',{name:/Fusion Drive ×/}));fireEvent.click(screen.getByRole('button',{name:'Research · 4 science'}));
 fireEvent.click(screen.getByRole('button',{name:/Gluon Computer ×/}));fireEvent.click(screen.getByRole('button',{name:'Research Gluon Computer instead'}));
 const result=processGameCommand(state,'a',submit.mock.calls[0][0]);if(!result.ok)throw Error(result.error.message);const nextView=getPlayerView(result.state,'a')!;
 rendered.rerender(<SecondDawnBoard view={nextView} {...props} candidates={legalCommands(nextView)} lastAcceptedCommand={{revision:nextView.revision,type:'research'}}/>);
 expect(screen.getByText('Acquired · Fusion Drive')).toBeInTheDocument();
 expect(screen.getByRole('region',{name:'Research Gluon Computer'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:/Research · 13 science/})).toBeInTheDocument();
});

it('explains that research is blocked off-turn without implying price grants legality',()=>{
 const state=fixture();state.activeSeatId='b';const view=getPlayerView(state,'a')!;
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getAllByRole('button',{name:'Research',exact:true})[0]);fireEvent.click(screen.getByRole('button',{name:/Fusion Drive ×/}));
 expect(screen.getByRole('alert')).toHaveTextContent('Wait for your turn to research.');
 expect(screen.queryByRole('button',{name:/Research ·/})).not.toBeInTheDocument();
});

it('invalidates a preserved draft visibly when its market copy is depleted',()=>{
 const state=fixture();state.seats[0].resources.science=20;const view=getPlayerView(state,'a')!;const controls={connected:true,busy:false,status:'',onSubmit:vi.fn(),onMenu:vi.fn()};
 const rendered=render(<SecondDawnBoard view={view} candidates={legalCommands(view)} {...controls}/>);fireEvent.click(screen.getAllByRole('button',{name:'Research',exact:true})[0]);fireEvent.click(screen.getByRole('button',{name:/Fusion Drive ×/}));
 state.technologyMarket=['gluon-computer'];state.revision++;const next=getPlayerView(state,'a')!;rendered.rerender(<SecondDawnBoard view={next} candidates={legalCommands(next)} {...controls}/>);
 expect(screen.getByRole('alert')).toHaveTextContent('No market copy remains.');
 expect(screen.getByRole('button',{name:'Research · 4 science'})).toBeDisabled();
});

it('explains an unfundable science shortfall',()=>{
 const state=fixture();state.seats[0].resources={money:0,science:0,materials:0};const view=getPlayerView(state,'a')!;
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);fireEvent.click(screen.getAllByRole('button',{name:'Research',exact:true})[0]);fireEvent.click(screen.getByRole('button',{name:/Fusion Drive ×/}));
 expect(screen.getByRole('alert')).toHaveTextContent('Not enough science or convertible resources. This technology costs at least 4 science.');
});
