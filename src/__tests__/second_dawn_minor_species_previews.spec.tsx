import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {addBuildItem,analyzeBuildOrder,emptyBuildOrder} from '../second-dawn-game/buildPlanning';
import {empireBuildOptions} from '../second-dawn-game/empireBuildOptions';
import {runningScore} from '../second-dawn-game/runningScore';
import {scoreInspection} from '../second-dawn-game/publicInspection';
import ResearchedTechnologies from '../second-dawn-game/ResearchedTechnologies';
import ScoreWorkspace from '../second-dawn-game/ScoreWorkspace';
import AiActionPanel from '../second-dawn-game/AiActionPanel';
afterEach(cleanup);
function fixture(){return getPlayerView(createGame({seed:1,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]}),'a')!;}
it('uses acquired engineers in both the build-order total and command-center ship prices',()=>{
 const view=fixture(),draft=addBuildItem(emptyBuildOrder(),'cruiser');
 const before=analyzeBuildOrder(view,draft).cost;view.seats[0].minorSpecies=[{id:'cruisers'}];
 expect(analyzeBuildOrder(view,draft).cost).toBe(before-1);
 expect(empireBuildOptions(view).find(option=>option.shipType==='cruiser')?.cost).toBe(before-1);
});
it('includes Research partners in visible current and future discount progression',()=>{
 const view=fixture();view.seats[0].minorSpecies=[{id:'researchers'}];
 render(<ResearchedTechnologies seat={view.seats[0]}/>);
 const track=screen.getByRole('group',{name:'Nano research discounts'});
 expect(within(track).getByText('Current discount: 2 science')).toBeVisible();
 expect(within(track).getByText('After next research: 3 science discount')).toBeVisible();
 expect(within(track).getByText('Includes 1 Minor Species discount')).toBeVisible();
});
it('scores public Minor Species bonuses using reputation counts, never tile values',()=>{
 const view=fixture();view.seats[1].minorSpecies=[{id:'reputation'},{id:'prestige'}];
 view.hiddenTileCounts.find(entry=>entry.seatId==='b')!.reputation=2;
 view.private.reputation=[999];const score=runningScore(view,'b').breakdown;
 expect(score.minorSpecies).toBe(5);expect(score.reputation).toBe(0);
 expect(scoreInspection(view,'b','minorSpecies').value).toBe(5);
 render(<ScoreWorkspace view={view} scores={[score]} playerNames={{}} onInspect={vi.fn()} onHome={vi.fn()} onPlayAgain={vi.fn()} onGalaxy={vi.fn()}/>);
 expect(screen.getByRole('button',{name:'Minor Species: 5 VP'})).toBeVisible();expect(screen.queryByText(/999/)).toBeNull();
});
it('shows AI recruitment with the same public effect card and no private return values',()=>{
 const view=fixture();view.private.reputation=[999];
 render(<AiActionPanel view={view} entry={{revision:4,actorSeatId:'b',actorName:'Eridani Empire',round:1,summary:'Recruited Minor Species',details:[],presentation:{kind:'minor-species',minorSpeciesId:'cruisers'}}} onInspectSector={vi.fn()}/>);
 expect(screen.getByRole('article',{name:'Cruiser engineers'})).toHaveTextContent('Each cruiser costs 1 fewer materials');
 expect(screen.queryByText(/999/)).toBeNull();expect(screen.queryByRole('button',{name:/Buy/})).toBeNull();
});
