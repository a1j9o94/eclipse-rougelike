// @vitest-environment jsdom
import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import ActionEconomy from '../second-dawn-game/ActionEconomy';
afterEach(cleanup);
it.each(['upgrade','build','move'] as const)('shows %s as a one-activation reaction with one influence disc and increased upkeep before a draft',action=>{const state=createGame({seed:9,seats:[{id:'a',faction:'mechanema',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});state.seats[0].passed=true;state.seats[0].influenceOnTrack=10;const view=getPlayerView(state,'a')!;render(<ActionEconomy view={view} action={action} preview={null}/>);expect(screen.getByText('New reaction · 1 activation · 1 influence disc')).toBeInTheDocument();expect(screen.getByText('Round-end upkeep: 1 → 2 money')).toBeInTheDocument();expect(screen.getByText(/Resource costs, available pieces and blueprint slots still apply/)).toBeInTheDocument();expect(screen.queryByText(/base builds \/ action|base installs \/ action/)).not.toBeInTheDocument();});

it.each(['upgrade','build','move'] as const)('does not charge a second disc for an already-open %s reaction',action=>{const state=createGame({seed:9,seats:[{id:'a',faction:'mechanema',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});state.seats[0].passed=true;state.seats[0].influenceOnTrack=9;state.engine.action={owner:'a',action,remaining:1};const view=getPlayerView(state,'a')!;render(<ActionEconomy view={view} action={action} preview={null}/>);expect(screen.getByText('Continue this reaction · no extra disc')).toBeInTheDocument();expect(screen.getByText('Round-end upkeep: 2 → 2 money')).toBeInTheDocument();});
