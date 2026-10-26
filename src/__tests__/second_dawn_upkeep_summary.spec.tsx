import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import UpkeepSummary from '../second-dawn-game/UpkeepSummary';
afterEach(cleanup);
function view(){const state=createGame({seed:9,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});const seat=state.seats[0];seat.resources.money=2;seat.populationTracks.money=1;seat.influenceOnTrack=10;return getPlayerView(state,'a')!;}
it('leads with remaining affordable actions and responds to every ordinary click',()=>{
 const rendered=render(<UpkeepSummary view={view()}/>),summary=screen.getByLabelText(/3 more actions affordable this round/);
 expect(within(summary).getByText('3 actions affordable')).toBeInTheDocument();expect(within(summary).queryByText(/money|Round end|4/)).toBeNull();
 expect(screen.getByText('Held')).not.toBeVisible();fireEvent.click(summary,{detail:1});expect(rendered.container.querySelector('details')).toHaveAttribute('open');
 expect(screen.getByText('Held')).toBeVisible();expect(screen.getByText('−1')).toBeVisible();expect(screen.getByText('+3')).toBeVisible();
 fireEvent.click(summary,{detail:2});expect(screen.getByText('Held')).not.toBeVisible();
 fireEvent.click(summary,{detail:3});expect(screen.getByText('Held')).toBeVisible();
 expect(summary).not.toHaveAttribute('title',expect.stringMatching(/double.click/i));
});
it('supports assistive activation and Escape from the details back to the trigger',()=>{
 const rendered=render(<UpkeepSummary view={view()} onOpenTracks={()=>{}}/>),summary=screen.getByLabelText(/3 more actions affordable this round/);
 fireEvent.click(summary,{detail:0});expect(screen.getByText('Held')).toBeVisible();
 const tracks=screen.getByRole('button',{name:'Inspect economy tracks'});tracks.focus();
 fireEvent.keyDown(tracks,{key:'Escape'});expect(rendered.container.querySelector('details')).not.toHaveAttribute('open');expect(summary).toHaveFocus();
 // Enter/Space native summary activation is verified in the real-browser header check.
 fireEvent.click(summary,{detail:0});expect(screen.getByText('Held')).toBeVisible();
});
it('shows no affordable actions for an unfunded round and keeps the amount in its details',()=>{const v=view();v.seats[0].resources.money=0;v.seats[0].influenceOnTrack=6;render(<UpkeepSummary view={v}/>);const summary=screen.getByLabelText(/0 more actions affordable this round/);expect(summary).toHaveTextContent('0 actions affordable');expect(summary).not.toHaveTextContent('4 short');fireEvent.click(summary,{detail:1});expect(screen.getByText('−7')).toBeVisible();expect(screen.getByText('-4')).toBeVisible();});
it('does not replace combat status with the player’s prior pass state',()=>{const v=view();v.phase='combat';v.seats[0].passed=true;render(<UpkeepSummary view={v}/>);expect(screen.queryByText(/Passed|Reactions only/)).toBeNull();expect(screen.getByText('Combat')).toBeInTheDocument();});
it('does not promise new actions after passing or exhausting influence discs',()=>{const v=view();v.seats[0].passed=true;const ui=render(<UpkeepSummary view={v}/>);expect(screen.getByText('Passed')).toBeInTheDocument();v.seats[0].passed=false;v.seats[0].influenceOnTrack=0;v.seats[0].resources.money=100;ui.rerender(<UpkeepSummary view={v}/>);expect(screen.getByText('No action discs')).toBeInTheDocument();});
it('omits forecasts once final scores are shown',()=>{const v=view();v.phase='finished';const {container}=render(<UpkeepSummary view={v}/>);expect(container).toBeEmptyDOMElement();});
