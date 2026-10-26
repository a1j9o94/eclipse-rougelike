import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {affordableActionCapacity,upkeepForecast,upkeepForecastAfter} from '../second-dawn-game/upkeepForecast';
import UpkeepSummary from '../second-dawn-game/UpkeepSummary';
import ActionEconomy from '../second-dawn-game/ActionEconomy';
import {previewCommand} from '../../shared/eclipse/commandPreview';
import type {PlayerView,GameCommand} from '../../shared/eclipse/types';

afterEach(cleanup);

function view(){
 const state=createGame({seed:9,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});
 return getPlayerView(state,'a')!;
}
function projectedCapacity(v:PlayerView,command:GameCommand){
 const preview=previewCommand(v,command),seat=v.seats.find(seat=>seat.id===v.viewerSeatId)!;
 return affordableActionCapacity(upkeepForecastAfter({money:preview.resourcesAfter.money,income:preview.moneyIncomeAfter,influenceDiscs:preview.influenceAfter,passed:seat.passed,eliminated:seat.eliminated}));
}

it('counts the largest number of new ordinary action discs affordable at the exact upkeep boundary',()=>{
 const v=view();v.seats[0].resources.money=2;v.seats[0].populationTracks.money=1;v.seats[0].influenceOnTrack=10;
 expect(affordableActionCapacity(upkeepForecast(v))).toMatchObject({status:'affordable',actions:3,nextUpkeep:2});
});

it('does not claim an action is affordable when the current round-end upkeep is already unfunded',()=>{
 const v=view();v.seats[0].resources.money=0;v.seats[0].populationTracks.money=0;v.seats[0].influenceOnTrack=7;
 expect(affordableActionCapacity(upkeepForecast(v))).toMatchObject({status:'unfunded',actions:0,shortfall:3});
});

it('reports passed, eliminated, and empty-disc capacity without inventing ordinary actions',()=>{
 const v=view();v.seats[0].passed=true;
 expect(affordableActionCapacity(upkeepForecast(v))).toMatchObject({status:'passed',actions:0});
 v.seats[0].passed=false;v.seats[0].eliminated=true;
 expect(affordableActionCapacity(upkeepForecast(v))).toMatchObject({status:'eliminated',actions:0});
 v.seats[0].eliminated=false;v.seats[0].influenceOnTrack=0;v.seats[0].resources.money=30;
 expect(affordableActionCapacity(upkeepForecast(v))).toMatchObject({status:'no-discs',actions:0});
});

it('leads with affordable capacity and exposes the same calculation on double-click',()=>{
 const v=view();v.seats[0].resources.money=2;v.seats[0].populationTracks.money=1;v.seats[0].influenceOnTrack=10;
 render(<UpkeepSummary view={v}/>);
 expect(screen.getByText('3 actions affordable')).toBeInTheDocument();
 fireEvent.doubleClick(screen.getByLabelText(/3 more actions affordable this round/));
 expect(screen.getByText('Held').nextElementSibling).toHaveTextContent('2');
 expect(screen.getByText('Income').nextElementSibling).toHaveTextContent('+3');
 expect(screen.getByText('Upkeep').nextElementSibling).toHaveTextContent('−1');
 expect(screen.getByText('After upkeep').nextElementSibling).toHaveTextContent('4');
});

it('uses the authoritative draft projection for the after-this capacity',()=>{
 const v=view();v.seats[0].resources.money=2;v.seats[0].populationTracks.money=1;v.seats[0].influenceOnTrack=10;
 expect(projectedCapacity(v,{type:'build',builds:[]})).toMatchObject({status:'affordable',actions:2});
});

it('accounts for known money spending, ongoing activations, and projected influence changes',()=>{
 const v=view();v.seats[0].resources.money=4;v.seats[0].populationTracks.money=1;v.seats[0].influenceOnTrack=10;
 expect(projectedCapacity(v,{type:'trade',from:'money',to:'science',amount:1})).toMatchObject({actions:2});
 expect(projectedCapacity({...v,actionProgress:{owner:'a',action:'move',remaining:1}},{type:'move',moves:[]})).toMatchObject({actions:4});
 const influence:GameCommand={type:'influence',addSectorIds:[],removeSectorIds:[v.sectors.find(sector=>sector.owner==='a')!.id]};
 expect(projectedCapacity(v,influence)).toMatchObject({actions:3});
 expect(previewCommand(v,influence).populationChoiceMayChangeIncome).toBe(true);
});

it('keeps empty previews out of the UI and calls income-changing drafts conditional',()=>{
 const v=view();v.seats[0].resources.money=4;v.seats[0].populationTracks.money=1;v.seats[0].influenceOnTrack=10;
 const conditional={...previewCommand(v,{type:'build',builds:[]}),populationChoiceMayChangeIncome:true};
 const ui=render(<ActionEconomy view={v} action="build" preview={null}/>);
 expect(ui.container).toBeEmptyDOMElement();
 ui.rerender(<ActionEconomy view={v} action="build" preview={conditional}/>);
 expect(screen.getByText('* Pending population choice')).toBeInTheDocument();
 expect(projectedCapacity(v,{type:'build',builds:[]})).toMatchObject({actions:3});
});

it('keeps next-action language out of passed and non-action-phase summaries',()=>{
 const v=view();v.seats[0].passed=true;
 const {rerender}=render(<UpkeepSummary view={v}/>);
 expect(screen.queryByText(/Next action:/)).toBeNull();
 rerender(<UpkeepSummary view={{...v,seats:v.seats.map((seat,index)=>index===0?{...seat,passed:false}:seat),phase:'upkeep'}}/>);
 expect(screen.queryByText(/Next action:/)).toBeNull();
});
