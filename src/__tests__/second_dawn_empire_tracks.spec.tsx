import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import EmpireOverview from '../second-dawn-game/EmpireOverview';

afterEach(cleanup);
function fixture(){
 return getPlayerView(createGame({seed:42,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;
}
const callbacks={onSector:vi.fn(),onNavigate:vi.fn(),onBlueprints:vi.fn()};
it('shows all resource income tracks, current production, and the next cube without opening a panel',()=>{
 const view=fixture();view.seats[0].populationTracks={money:1,science:3,materials:6};
 render(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 for(const [name,income,next] of [['Money',3,4],['Science',6,8],['Materials',12,15]] as const){
  const track=screen.getByRole('region',{name:`${name} income track`});
  expect(track).toBeVisible();
  expect(within(track).getByRole('list')).toHaveTextContent('28');
  expect(within(track).getAllByRole('listitem')).toHaveLength(12);
  expect(track.querySelector('[aria-current="step"]')).toHaveTextContent(String(income));
  expect(within(track).getByText(`Next cube: +${next-income} income`)).toBeVisible();
 }
});
it('shows the full upkeep curve and added cost per action using actual empty influence slots',()=>{
 const view=fixture();view.seats[0].influenceOnTrack=8;
 render(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 const track=screen.getByRole('region',{name:'Influence upkeep track'});
 expect(within(track).getAllByRole('listitem')).toHaveLength(14);
 expect(track.querySelector('[aria-current="step"]')).toHaveAccessibleName('5 empty influence slots: 3 money upkeep, current');
 expect(within(track).getByText('Next new action: +2 upkeep · 5 total')).toBeVisible();
 expect(within(track).getByRole('listitem',{name:'7 empty influence slots: 7 money upkeep, increase 2'})).toBeVisible();
});
it('handles a returned cube covering base income and a fully depleted population track',()=>{
 const view=fixture();view.seats[0].populationTracks={money:-1,science:11,materials:0};
 render(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 const money=screen.getByRole('region',{name:'Money income track'}),science=screen.getByRole('region',{name:'Science income track'});
 expect(money.querySelector('[aria-current="step"]')).toHaveTextContent('0');
 expect(within(money).getByText('Next cube: +2 income')).toBeVisible();
 expect(within(science).getByText('Maximum income · no cubes on track')).toBeVisible();
 expect(science.querySelector('[aria-current="step"]')).toHaveTextContent('28');
});
it('uses the inspected empire and previews the influence cost of a passed reaction',()=>{
 const view=fixture();view.seats[0].populationTracks.money=10;view.seats[1].populationTracks.money=2;view.seats[1].passed=true;view.seats[1].influenceOnTrack=8;
 const before=JSON.stringify(view);
 render(<EmpireOverview view={view} seatId="b" {...callbacks}/>);
 expect(screen.getByRole('region',{name:'Money income track'}).querySelector('[aria-current="step"]')).toHaveTextContent('4');
 expect(within(screen.getByRole('region',{name:'Influence upkeep track'})).getByText('Next reaction: +2 upkeep · 5 total')).toBeVisible();
 expect(JSON.stringify(view)).toBe(before);
});
it('does not promise another action when no influence discs remain',()=>{
 const view=fixture();view.seats[0].influenceOnTrack=0;
 render(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 const track=screen.getByRole('region',{name:'Influence upkeep track'});
 expect(within(track).getByText('No influence discs available')).toBeVisible();
 expect(track.querySelector('[aria-current="step"]')).toHaveTextContent('30');
});
it('stacked extra influence discs stay at zero upkeep until another slot is exposed',()=>{
 const view=fixture();view.seats[0].influenceOnTrack=15;
 render(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 const track=screen.getByRole('region',{name:'Influence upkeep track'});
 expect(track.querySelector('[aria-current="step"]')).toHaveAccessibleName('0 empty influence slots: 0 money upkeep, current');
 expect(within(track).getByText('Next new action: +0 upkeep · 0 total')).toBeVisible();
 expect(within(track).queryByText('Next')).toBeNull();
});
it.each([[9,'3 money left','Exactly covered'],[7,'1 money left','2 money short'],[4,'2 money short','5 money short']] as const)('projects money plus income minus upkeep with %i money', (money,current,next)=>{
 const view=fixture();Object.assign(view.seats[0],{resources:{money,science:0,materials:0},influenceOnTrack:5});view.seats[0].populationTracks.money=2;
 render(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 const balance=screen.getByRole('region',{name:'Money after upkeep'});
 expect(within(balance).getByLabelText('With current upkeep')).toHaveTextContent(current);
 expect(within(balance).getByLabelText('After next new action')).toHaveTextContent(next);
 expect(balance).toHaveTextContent(`${money} money + 4 income − 13 upkeep`);
});
it('does not project an unavailable next action',()=>{
 const view=fixture();view.seats[0].influenceOnTrack=0;
 render(<EmpireOverview view={view} seatId="a" {...callbacks}/>);
 expect(screen.getByRole('region',{name:'Money after upkeep'})).toBeVisible();
 expect(screen.queryByLabelText('After next new action')).toBeNull();
});
