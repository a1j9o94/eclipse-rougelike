// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {processGameCommand} from '../../shared/eclipse/engine';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import type {GameState} from '../../shared/eclipse/types';
import DecisionPanel from '../second-dawn-game/DecisionPanel';
afterEach(cleanup);
function fixture():GameState {
 const state=createGame({seed:1703,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 const candidate=legalCommands(getPlayerView(state,'a')!).find(c=>c.command.type==='explore')!;
 const result=processGameCommand(state,'a',candidate.command);if(!result.ok)throw Error(result.error.message);return result.state;
}
it('rotates the drawn tile in its real neighborhood, explains legality, and submits only the displayed legal orientation',()=>{
 const state=fixture(),view=getPlayerView(state,'a')!,decision=view.pendingDecision!;if(decision.kind!=='exploration')throw Error('fixture');
 const submit=vi.fn();render(<DecisionPanel view={view} decision={decision} reputation={[]} disabled={false} onSubmit={submit}/>);
 expect(screen.queryByRole('combobox')).toBeNull();expect(screen.getByRole('img',{name:'Exploration placement preview'})).toBeTruthy();
 const first=decision.placements[0].rotation;
 const legal=new Set(decision.placements.filter(p=>p.tileId===decision.drawnTileIds[0]).map(p=>p.rotation));
 for(let step=0;step<6;step++){
  const rotation=(first-step+6)%6;
  expect(screen.getByTestId('drawn-exploration-tile')).toHaveAttribute('data-rotation',String(rotation));
  expect(screen.getByRole('button',{name:'Place sector'})).toHaveProperty('disabled',!legal.has(rotation));
  expect(screen.getByRole('status').textContent).toMatch(legal.has(rotation)?/Ready to place/:/Cannot place/);
  fireEvent.click(screen.getByRole('button',{name:'Rotate clockwise'}));
 }
 expect(submit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Place sector'}));expect(submit).toHaveBeenCalledWith({type:'resolve',decisionId:decision.id,choice:{kind:'exploration',tileId:decision.drawnTileIds[0],rotation:first}});
});
it('disables commitment offline while still allowing rotation inspection',()=>{
 const view=getPlayerView(fixture(),'a')!;render(<DecisionPanel view={view} decision={view.pendingDecision!} reputation={[]} disabled onSubmit={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Rotate clockwise'}));expect(screen.getByRole('button',{name:'Place sector'})).toBeDisabled();expect(screen.getByRole('button',{name:'Discard sector'})).toBeDisabled();
});
it('keeps both saved Draco draws available and commits the chosen tile at its displayed rotation',()=>{
 const setup=createGame({seed:543,warpPortals:true,seats:[{id:'a',faction:'draco',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 const explore=legalCommands(getPlayerView(setup,'a')!).find(c=>c.command.type==='explore')!;
 const first=processGameCommand(setup,'a',explore.command);if(!first.ok)throw Error(first.error.message);
 const firstView=getPlayerView(first.state,'a')!;const firstDecision=firstView.pendingDecision!;if(firstDecision.kind!=='exploration')throw Error('fixture');
 const submit=vi.fn();const rendered=render(<DecisionPanel view={firstView} decision={firstDecision} reputation={[]} disabled={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Draw second Draco sector'}));
 const second=processGameCommand(first.state,'a',submit.mock.calls[0][0]);if(!second.ok)throw Error(second.error.message);
 const view=getPlayerView(second.state,'a')!;const decision=view.pendingDecision!;if(decision.kind!=='exploration')throw Error('fixture');
 rendered.rerender(<DecisionPanel view={view} decision={decision} reputation={[]} disabled={false} onSubmit={submit}/>);
 expect(screen.queryByRole('button',{name:'Draw second Draco sector'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:new RegExp(`Sector ${decision.drawnTileIds[1]}`)}));
 const rotation=Number(screen.getByTestId('drawn-exploration-tile').getAttribute('data-rotation'));
 fireEvent.click(screen.getByRole('button',{name:'Place sector'}));
 expect(submit).toHaveBeenLastCalledWith({type:'resolve',decisionId:decision.id,choice:{kind:'exploration',tileId:decision.drawnTileIds[1],rotation}});
});
