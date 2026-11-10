// @vitest-environment jsdom
import {cleanup,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {previewCommand} from '../../shared/eclipse/commandPreview';
import {legalCommands} from '../../shared/eclipse/legal';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {capacity} from '../../shared/eclipse/rulesState';
import ActionEconomy from '../second-dawn-game/ActionEconomy';

afterEach(cleanup);

function fixture() {
 const state=createGame({seed:9,warpPortals:true,seats:[{id:'a',faction:'mechanema',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 state.activeSeatId='a';
 state.seats[0].passed=true;
 for(const sector of state.sectors.filter(sector=>sector.owner==='a'||sector.owner==='b'))sector.portalVp=1;
 return state;
}

it.each(['upgrade','build','move'] as const)('previews one influence disc and increased upkeep for a new %s reaction',action=>{
 const state=fixture();
 const seat=state.seats[0];
 seat.influenceOnTrack=10;
 expect(capacity(seat,action)).toBe(1);
 const view=getPlayerView(state,'a')!;
 const candidate=legalCommands(view).find(candidate=>candidate.command.type===action);
 expect(candidate).toBeDefined();
 const preview=previewCommand(view,candidate!.command);
 render(<ActionEconomy view={view} action={action} preview={preview}/>);
 const cost=within(screen.getByRole('region',{name:'Action cost preview'}));
 expect(cost.getByLabelText('1 influence disc')).toBeVisible();
 expect(cost.getByLabelText('Upkeep 1 to 2 money')).toBeVisible();
});

it.each(['upgrade','build','move'] as const)('does not charge a second disc or increase upkeep for an open %s reaction',action=>{
 const state=fixture();
 state.seats[0].influenceOnTrack=9;
 state.engine.action={owner:'a',action,remaining:1};
 const view=getPlayerView(state,'a')!;
 const candidate=legalCommands(view).find(candidate=>candidate.command.type===action);
 expect(candidate).toBeDefined();
 const preview=previewCommand(view,candidate!.command);
 expect(preview.influenceAfter).toBe(9);
 expect(preview.upkeepAfter).toBe(2);
 render(<ActionEconomy view={view} action={action} preview={preview}/>);
 expect(screen.queryByLabelText(/influence disc/)).toBeNull();
 expect(screen.queryByLabelText(/Upkeep .* money/)).toBeNull();
});
