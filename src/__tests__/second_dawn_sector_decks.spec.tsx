import {afterEach,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import {processGameCommand} from '../../shared/eclipse/engine';
import SectorDecks from '../second-dawn-game/SectorDecks';

afterEach(cleanup);
function fixture(){return createGame({seed:19,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});}
it('projects only counts, keeping draw and discard piles distinct',()=>{
 const state=fixture();const tile=state.supplies.inner.pop()!;state.engine!.discardedSectors.inner.push(tile);
 const view=getPlayerView(state,'a')!;
 expect(view.sectorDeckCounts).toEqual({inner:{drawPile:state.supplies.inner.length,discardPile:1},middle:{drawPile:state.supplies.middle.length,discardPile:0},outer:{drawPile:state.supplies.outer.length,discardPile:0}});
 expect(view.supplyCounts!.inner).toBe(state.supplies.inner.length+1);
 expect(JSON.stringify(view.sectorDeckCounts)).not.toContain(tile);
 expect(view).not.toHaveProperty('supplies');expect(view).not.toHaveProperty('random');
});
it('updates counts when a tile is drawn, before placement',()=>{
 const state=fixture(),before=getPlayerView(state,'a')!;
 const candidate=legalCommands(before).find(c=>c.command.type==='explore')!;
 const result=processGameCommand(state,'a',candidate.command);expect(result.ok).toBe(true);if(!result.ok)return;
 const after=getPlayerView(result.state,'a')!;
 const sum=(counts:NonNullable<typeof before.sectorDeckCounts>)=>Object.values(counts).reduce((total,pile)=>total+pile.drawPile,0);
 expect(sum(after.sectorDeckCounts!)).toBe(sum(before.sectorDeckCounts!)-1);
});
it('shows ring counters and a readable draw/discard breakdown, including empty stacks',()=>{
 const view=getPlayerView(fixture(),'a')!;
 view.sectorDeckCounts={inner:{drawPile:4,discardPile:2},middle:{drawPile:0,discardPile:3},outer:{drawPile:0,discardPile:0}};
 render(<SectorDecks view={view}/>);
 fireEvent.click(screen.getByRole('button',{name:/Sector decks/}));
 const dialog=screen.getByRole('dialog',{name:'Sector decks'});
 expect(within(dialog).getByRole('region',{name:'Inner sectors · Ring I'})).toHaveTextContent('4');
 expect(within(dialog).getByRole('region',{name:'Inner sectors · Ring I'})).toHaveTextContent('2');
 expect(within(dialog).getByRole('region',{name:'Middle sectors · Ring II'})).toHaveTextContent('Reshuffle on next draw');
 expect(within(dialog).getByRole('region',{name:'Outer sectors · Ring III'})).toHaveTextContent('Exhausted');
 fireEvent.click(within(dialog).getByRole('button',{name:'Close sector decks'}));
 expect(screen.queryByRole('dialog')).toBeNull();
});
it('labels older view totals as available, never as exact draw piles',()=>{
 const view=getPlayerView(fixture(),'a')!;delete view.sectorDeckCounts;view.supplyCounts!.inner=6;
 render(<SectorDecks view={view}/>);fireEvent.click(screen.getByRole('button',{name:/Sector decks/}));
 const ring=screen.getByRole('region',{name:'Inner sectors · Ring I'});
 expect(ring).toHaveTextContent('6');expect(ring).toHaveTextContent('Available');expect(ring).not.toHaveTextContent('Draw pile');
});
it('shows unavailable data instead of inventing zero for old views',()=>{
 const view=getPlayerView(fixture(),'a')!;delete view.sectorDeckCounts;delete view.supplyCounts;
 render(<SectorDecks view={view}/>);fireEvent.click(screen.getByRole('button',{name:/Sector decks/}));
 expect(screen.getAllByText('Count unavailable')).toHaveLength(3);
});
it('refreshes an open deck view from the latest authoritative counts',()=>{
 const view=getPlayerView(fixture(),'a')!;
 const {rerender}=render(<SectorDecks view={view}/>);fireEvent.click(screen.getByRole('button',{name:/Sector decks/}));
 rerender(<SectorDecks view={{...view,sectorDeckCounts:{...view.sectorDeckCounts!,inner:{drawPile:0,discardPile:2}}}}/>);
 expect(screen.getByRole('region',{name:'Inner sectors · Ring I'})).toHaveTextContent('Reshuffle on next draw');
 expect(screen.getByRole('button',{name:/Sector decks: Inner 0 in draw pile/})).toBeInTheDocument();
});
