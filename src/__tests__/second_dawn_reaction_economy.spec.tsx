// @vitest-environment jsdom
import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import ActionEconomy from '../second-dawn-game/ActionEconomy';
afterEach(cleanup);
it.each(['upgrade','build','move'] as const)('shows %s as a one-activation reaction with unchanged upkeep before a draft',action=>{const state=createGame({seed:9,seats:[{id:'a',faction:'mechanema',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});state.seats[0].passed=true;state.seats[0].influenceOnTrack=10;const view=getPlayerView(state,'a')!;render(<ActionEconomy view={view} action={action} preview={null}/>);expect(screen.getByText('Reaction · 1 activation · no influence disc')).toBeInTheDocument();expect(screen.getByText('Round-end upkeep: 1 → 1 money')).toBeInTheDocument();expect(screen.getByText(/Resource costs, available pieces and blueprint slots still apply/)).toBeInTheDocument();expect(screen.queryByText(/base builds \/ action|base installs \/ action/)).not.toBeInTheDocument();});
