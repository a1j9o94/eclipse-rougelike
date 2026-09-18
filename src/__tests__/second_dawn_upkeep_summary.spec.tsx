import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import UpkeepSummary from '../second-dawn-game/UpkeepSummary';
afterEach(cleanup);
function view(){const state=createGame({seed:9,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});const seat=state.seats[0];seat.resources.money=2;seat.populationTracks.money=1;seat.influenceOnTrack=10;return getPlayerView(state,'a')!;}
it('shows the actual round-end bill, income equation, and next-disc forecast without selecting an action',()=>{render(<UpkeepSummary view={view()}/>);expect(screen.getByLabelText('Current upkeep: 1 money; 4 money left at round end')).toBeInTheDocument();expect(screen.getByText('Next action: 2 upkeep · 3 left')).toBeInTheDocument();fireEvent.click(screen.getByText('Round-end upkeep'));expect(screen.getByText('2 money + 3 income − 1 upkeep = 4 left')).toBeInTheDocument();});
it('warns about the next action crossing into a shortfall and identifies additional activations correctly',()=>{const v=view();v.seats[0].influenceOnTrack=7;v.actionProgress={owner:'a',action:'move',remaining:1};render(<UpkeepSummary view={v}/>);expect(screen.getByText('Next new action: 7 upkeep · 2 short')).toBeInTheDocument();expect(screen.getByText(/remaining Move activation uses no additional disc/i)).toBeInTheDocument();});
