import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import type {GameState} from '../../shared/eclipse/types';
import fixturesJson from '../second-dawn-game/reviewFixtures.json?raw';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function fixture(){const state=(JSON.parse(fixturesJson) as Record<string,GameState>).diplomacy;return getPlayerView(state,state.pendingDecision!.owner)!;}
it('views the galaxy, inspects a sector and returns with the ambassador cube selection preserved',()=>{
 const view=fixture(),submit=vi.fn();render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Accept exchange'}));
 fireEvent.click(screen.getByRole('radio',{name:'Science'}));
 const mapButton=screen.getByRole('button',{name:'View galaxy'});
 expect(mapButton.closest('.dg-choice-header')).not.toBeNull();
 expect(screen.queryByRole('button',{name:'Minimize ambassador exchange'})).toBeNull();
 fireEvent.click(mapButton);
 const map=screen.getByRole('group',{name:'Galaxy map'});expect(map).toBeVisible();
 fireEvent.click(within(map).getAllByRole('button',{name:/^Inspect sector /})[0]);
 expect(submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Return to ambassador exchange'}));
 expect(screen.getByRole('radio',{name:'Science'})).toHaveAttribute('aria-checked','true');
 fireEvent.click(screen.getByRole('button',{name:'Accept ambassadors'}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:view.pendingDecision!.id,choice:{kind:'diplomacy',accept:true,resource:'science'}});
});
it('allows Explore as map inspection during the exchange without starting an action or losing a decline',()=>{
 const view=fixture(),submit=vi.fn();render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Decline exchange'}));
 expect(screen.getByRole('button',{name:'Explore'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Explore'}));
 expect(screen.getByRole('group',{name:'Galaxy map'})).toBeVisible();
 expect(screen.queryByRole('button',{name:'Confirm action'})).toBeNull();expect(submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Return to ambassador exchange'}));
 expect(screen.getByRole('radio',{name:'Decline exchange'})).toHaveAttribute('aria-checked','true');
});
it('allows galaxy inspection while offline but still disables the exchange commitment',()=>{
 const view=fixture();render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected={false} busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'View galaxy'}));expect(screen.getByRole('group',{name:'Galaxy map'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Return to ambassador exchange'}));expect(screen.getByRole('button',{name:'Choose accept or decline'})).toBeDisabled();
});

it('keeps the mobile Galaxy navigation and return path usable during an exchange',()=>{
 vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const view=fixture(),submit=vi.fn();render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Accept exchange'}));
 fireEvent.click(screen.getByRole('radio',{name:'Science'}));
 fireEvent.click(within(screen.getByRole('navigation',{name:'Mobile game navigation'})).getByRole('button',{name:'Galaxy'}));
 const map=screen.getByRole('group',{name:'Galaxy map'});fireEvent.click(within(map).getAllByRole('button',{name:/^Inspect sector /})[0]);
 expect(screen.queryByRole('button',{name:'Build here'})).toBeNull();expect(submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Return to ambassador exchange'}));
 expect(screen.getByRole('radio',{name:'Science'})).toHaveAttribute('aria-checked','true');
});
it('preserves the chosen partner and cube during post-combat diplomacy inspection',()=>{
 const view=fixture(),submit=vi.fn();
 view.pendingDecision={id:'post-combat-exchange',owner:view.viewerSeatId,kind:'diplomacy-window',eligibleSeatIds:['p0'],populationSources:['money','science','materials']};
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Eridani Empire'}));fireEvent.click(screen.getByRole('radio',{name:'Science'}));
 fireEvent.click(screen.getByRole('button',{name:'Explore'}));expect(screen.getByRole('group',{name:'Galaxy map'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Return to ambassador exchange'}));
 expect(screen.getByRole('radio',{name:'Eridani Empire'})).toHaveAttribute('aria-checked','true');expect(screen.getByRole('radio',{name:'Science'})).toHaveAttribute('aria-checked','true');
 fireEvent.click(screen.getByRole('button',{name:'Offer ambassadors'}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:'post-combat-exchange',choice:{kind:'diplomacy-window',offerTo:'p0',resource:'science'}});
});
