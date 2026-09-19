import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {getMinorSpecies} from '../../shared/eclipse/minorSpecies';
import MinorSpeciesMarket,{AcquiredMinorSpecies} from '../second-dawn-game/MinorSpeciesMarket';
import DiplomacyPanel from '../second-dawn-game/DiplomacyPanel';
afterEach(cleanup);
function fixture(){
 const state=createGame({seed:21,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});
 const view=getPlayerView(state,'a')!;view.minorSpecies={market:['researchers','population','prestige','cruisers']};view.activeSeatId='a';
 view.seats[0].resources.money=20;view.seats[0].minorSpecies=[];view.private.reputation=[];
 return view;
}
it('shows the available tiles, money cost and effects, and buys through the actual command',()=>{
 const view=fixture(),onSubmit=vi.fn();render(<MinorSpeciesMarket view={view} disabled={false} onSubmit={onSubmit}/>);
 expect(screen.getAllByRole('article')).toHaveLength(4);
 const tile=screen.getByRole('article',{name:getMinorSpecies('researchers').name});
 expect(within(tile).getByText(/science cheaper/)).toBeVisible();
 fireEvent.click(within(tile).getByRole('button',{name:/Buy/}));
 expect(onSubmit).toHaveBeenCalledWith({type:'buy-minor-species',minorSpeciesId:'researchers'});
});
it('shows funding and turn blockers while allowing people to browse the market',()=>{
 const view=fixture();view.seats[0].resources.money=0;const onSubmit=vi.fn();
 const ui=render(<MinorSpeciesMarket view={view} disabled={false} onSubmit={onSubmit}/>);
 expect(screen.getAllByRole('button',{name:/Buy/}).every(button=>button.hasAttribute('disabled'))).toBe(true);
 expect(screen.getAllByText(/Need .* more money/).length).toBeGreaterThan(0);
 view.seats[0].resources.money=20;view.activeSeatId='b';ui.rerender(<MinorSpeciesMarket view={view} disabled={false} onSubmit={onSubmit}/>);
 expect(screen.getAllByText(/Wait for your action turn/).length).toBeGreaterThan(0);expect(onSubmit).not.toHaveBeenCalled();
});
it('requires a deliberate legal population choice and previews the income increase',()=>{
 const view=fixture();view.seats[0].populationTracks={money:1,science:2,materials:11};const onSubmit=vi.fn();
 render(<MinorSpeciesMarket view={view} disabled={false} onSubmit={onSubmit}/>);
 const tile=screen.getByRole('article',{name:getMinorSpecies('population').name});
 expect(within(tile).getByRole('button',{name:/Buy/})).toBeDisabled();
 expect(within(tile).getByRole('button',{name:'Materials population'})).toBeDisabled();
 fireEvent.click(within(tile).getByRole('button',{name:'Science population'}));
 expect(within(tile).getByText('Income 4 → 6')).toBeVisible();
 fireEvent.click(within(tile).getByRole('button',{name:/Buy/}));
 expect(onSubmit).toHaveBeenCalledWith({type:'buy-minor-species',minorSpeciesId:'population',resource:'science'});
});
it('requires explicit acknowledgement before a purchase returns a reputation tile',()=>{
 const view=fixture();view.private.reputation=[1,2,3,4];const onSubmit=vi.fn();
 render(<MinorSpeciesMarket view={view} disabled={false} onSubmit={onSubmit}/>);
 const tile=screen.getByRole('article',{name:getMinorSpecies('researchers').name});
 expect(within(tile).getByRole('button',{name:/Buy/})).toBeDisabled();
 fireEvent.click(within(tile).getByRole('checkbox',{name:/Return.*1 VP/}));
 fireEvent.click(within(tile).getByRole('button',{name:/Buy/}));
 expect(onSubmit).toHaveBeenCalledWith({type:'buy-minor-species',minorSpeciesId:'researchers',returnReputation:[1]});
});
it('shows acquired effects from public tiles without exposing reputation values',()=>{
 const view=fixture();view.seats[1].minorSpecies=[{id:'researchers'},{id:'population',resource:'materials'}];view.private.reputation=[999];
 render(<AcquiredMinorSpecies seat={view.seats[1]}/>);
 expect(screen.getByText(getMinorSpecies('researchers').name)).toBeVisible();
 expect(screen.getByText('Materials population')).toBeVisible();
 expect(screen.queryByText(/999/)).toBeNull();expect(screen.queryByRole('button',{name:/Buy/})).toBeNull();
});
it('warns about a money shortfall at upkeep before recruiting an ally',()=>{
 const view=fixture();view.seats[0].resources.money=4;view.seats[0].influenceOnTrack=6;view.seats[0].populationTracks.money=1;
 render(<MinorSpeciesMarket view={view} disabled={false} onSubmit={vi.fn()}/>);
 const tile=screen.getByRole('article',{name:getMinorSpecies('researchers').name});
 expect(within(tile).getByText('0 money remaining')).toBeVisible();
 expect(within(tile).getByRole('alert')).toHaveTextContent('4 money short at upkeep');
});
it('keeps the dedicated ambassador-space explanation after a Minor Species occupies it',()=>{
 const view=fixture();view.seats[0].faction='terran-directorate';view.seats[0].minorSpecies=[{id:'researchers'}];
 render(<DiplomacyPanel view={view} candidates={[]} disabled={false} onSubmit={vi.fn()}/>);
 expect(screen.getByText(/This faction has one dedicated ambassador space/)).toBeVisible();
 expect(screen.getByText(/1 Minor Species tile occupies this diplomatic rack/)).toBeVisible();
});
