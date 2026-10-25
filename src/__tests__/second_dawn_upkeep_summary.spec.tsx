import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import UpkeepSummary from '../second-dawn-game/UpkeepSummary';
afterEach(cleanup);
function view(){const state=createGame({seed:9,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});const seat=state.seats[0];seat.resources.money=2;seat.populationTracks.money=1;seat.influenceOnTrack=10;return getPlayerView(state,'a')!;}
it('keeps only the round-end balance in the header and opens its breakdown deliberately',()=>{
 const rendered=render(<UpkeepSummary view={view()}/>),summary=screen.getByLabelText('Round-end balance: 4 money');
 expect(within(summary).getByText('4')).toBeInTheDocument();expect(within(summary).queryByText(/actions affordable/)).toBeNull();
 expect(screen.getByText('Held')).not.toBeVisible();fireEvent.click(summary);expect(rendered.container.querySelector('details')).toHaveAttribute('open');
 expect(screen.getByText('Held')).toBeVisible();expect(screen.getByText('−1')).toBeVisible();expect(screen.getByText('+3')).toBeVisible();
});
it('makes an actual shortfall visible without a rules paragraph',()=>{const v=view();v.seats[0].resources.money=0;v.seats[0].influenceOnTrack=6;render(<UpkeepSummary view={v}/>);expect(screen.getByLabelText('Round-end balance: -4 money')).toHaveTextContent('4 short');});
it('does not replace combat status with the player’s prior pass state',()=>{const v=view();v.phase='combat';v.seats[0].passed=true;render(<UpkeepSummary view={v}/>);expect(screen.queryByText(/Passed|Reactions only/)).toBeNull();expect(screen.getByLabelText('Round-end balance: 4 money')).toBeInTheDocument();});
it('omits forecasts once final scores are shown',()=>{const v=view();v.phase='finished';const {container}=render(<UpkeepSummary view={v}/>);expect(container).toBeEmptyDOMElement();});
