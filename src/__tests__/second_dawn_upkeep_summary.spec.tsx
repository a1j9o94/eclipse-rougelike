import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import UpkeepSummary from '../second-dawn-game/UpkeepSummary';
afterEach(cleanup);
it('keeps the header to an action count and puts the economic breakdown in its disclosure',()=>{
 const rendered=render(<UpkeepSummary view={view()}/>);
 const summary=rendered.container.querySelector('summary')!;
 expect(within(summary).getByText('3 actions affordable')).toBeInTheDocument();
 expect(within(summary).queryByText(/Round-end upkeep/)).toBeNull();
 expect(within(summary).queryByText(/Next action:/)).toBeNull();
 expect(summary).toHaveAttribute('title',expect.stringContaining('10 influence discs'));
 fireEvent.click(summary);
 expect(rendered.container.querySelector('details')).toHaveAttribute('open');
 expect(screen.getByText('2 money + 3 income − 1 upkeep = 4 left')).toBeVisible();
});
function view(){const state=createGame({seed:9,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});const seat=state.seats[0];seat.resources.money=2;seat.populationTracks.money=1;seat.influenceOnTrack=10;return getPlayerView(state,'a')!;}
it('shows the actual round-end bill, income equation, and next-disc forecast without selecting an action',()=>{render(<UpkeepSummary view={view()}/>);expect(screen.getByLabelText('Current upkeep: 1 money; 4 money left at round end')).toBeInTheDocument();expect(screen.getByText('Next action: 2 upkeep · 3 left')).toBeInTheDocument();fireEvent.click(screen.getByText('Round-end upkeep'));expect(screen.getByText('2 money + 3 income − 1 upkeep = 4 left')).toBeInTheDocument();});
it('warns about the next action crossing into a shortfall and identifies additional activations correctly',()=>{const v=view();v.seats[0].influenceOnTrack=7;v.actionProgress={owner:'a',action:'move',remaining:1};render(<UpkeepSummary view={v}/>);expect(screen.getByText('Next new action: 7 upkeep · 2 short')).toBeInTheDocument();expect(screen.getByText(/remaining Move activation uses no additional disc/i)).toBeInTheDocument();});
it('labels a passed player as reactions only during the action phase and explains the limits',()=>{const v=view();v.phase='action';v.seats[0].passed=true;const rendered=render(<UpkeepSummary view={v}/>);const summary=rendered.container.querySelector('summary')!;expect(within(summary).getByText('Reactions only')).toBeInTheDocument();expect(screen.getByText('Next reaction: 2 upkeep · 3 left')).toBeInTheDocument();expect(summary).toHaveAttribute('title',expect.stringContaining('Upgrade, Build or Move'));fireEvent.click(summary);expect(screen.getByText(/one activation, using one influence disc/)).toBeVisible();expect(screen.getByText(/Resource costs, available pieces and blueprint slots still apply/)).toBeVisible();});
it('keeps passed status outside the action phase instead of promising reactions',()=>{const v=view();v.phase='combat';v.seats[0].passed=true;const rendered=render(<UpkeepSummary view={v}/>);const summary=rendered.container.querySelector('summary')!;expect(within(summary).getByText('Passed')).toBeInTheDocument();expect(screen.queryByText('Reactions only')).not.toBeInTheDocument();});
