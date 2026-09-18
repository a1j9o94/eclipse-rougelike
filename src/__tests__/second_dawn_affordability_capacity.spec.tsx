import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {affordableActionCapacity,upkeepForecast} from '../second-dawn-game/upkeepForecast';
import UpkeepSummary from '../second-dawn-game/UpkeepSummary';
import ActionEconomy from '../second-dawn-game/ActionEconomy';
import {previewCommand} from '../../shared/eclipse/commandPreview';

afterEach(cleanup);

function view(){
 const state=createGame({seed:9,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});
 return getPlayerView(state,'a')!;
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

it('leads with affordable capacity and exposes the same calculation on tap',()=>{
 const v=view();v.seats[0].resources.money=2;v.seats[0].populationTracks.money=1;v.seats[0].influenceOnTrack=10;
 render(<UpkeepSummary view={v}/>);
 expect(screen.getByText('3 more actions affordable this round')).toBeInTheDocument();
 fireEvent.click(screen.getByText('3 more actions affordable this round'));
 expect(screen.getByText('2 money + 3 income − 1 upkeep = 4 left')).toBeInTheDocument();
 expect(screen.getByText('Forecast assumes no further trading, direct spending, territory or income changes, or special effects.')).toBeInTheDocument();
});

it('uses the authoritative draft projection for the after-this capacity',()=>{
 const v=view();v.seats[0].resources.money=2;v.seats[0].populationTracks.money=1;v.seats[0].influenceOnTrack=10;
 render(<ActionEconomy view={v} action="build" preview={previewCommand(v,{type:'build',builds:[]})}/>);
 expect(screen.getByText('After this: 2 affordable actions')).toBeInTheDocument();
});

it('accounts for known money spending, ongoing activations, and projected influence changes',()=>{
 const v=view();v.seats[0].resources.money=4;v.seats[0].populationTracks.money=1;v.seats[0].influenceOnTrack=10;
 render(<><ActionEconomy view={v} action="trade" preview={previewCommand(v,{type:'trade',from:'money',to:'science',amount:1})}/><ActionEconomy view={{...v,actionProgress:{owner:'a',action:'move',remaining:1}}} action="move" preview={previewCommand({...v,actionProgress:{owner:'a',action:'move',remaining:1}},{type:'move',moves:[]})}/><ActionEconomy view={v} action="influence" preview={previewCommand(v,{type:'influence',addSectorIds:[],removeSectorIds:[v.sectors.find(sector=>sector.owner==='a')!.id]})}/></>);
 expect(screen.getByText('After this: 2 affordable actions')).toBeInTheDocument();
 expect(screen.getByText('Continue this action · no extra disc')).toBeInTheDocument();
 expect(screen.getByText('After this: 4 affordable actions')).toBeInTheDocument();
 expect(screen.getByText('After this: 3 affordable actions · conditional on population choice')).toBeInTheDocument();
});

it('labels a null preview as current and calls income-changing drafts conditional',()=>{
 const v=view();v.seats[0].resources.money=4;v.seats[0].populationTracks.money=1;v.seats[0].influenceOnTrack=10;
 const conditional={...previewCommand(v,{type:'build',builds:[]}),populationChoiceMayChangeIncome:true};
 render(<><ActionEconomy view={v} action="build" preview={null}/><ActionEconomy view={v} action="build" preview={conditional}/></>);
 expect(screen.getByText('Current forecast: 4 affordable actions')).toBeInTheDocument();
 expect(screen.getByText('After this: 3 affordable actions · conditional on population choice')).toBeInTheDocument();
});

it('keeps next-action language out of passed and non-action-phase summaries',()=>{
 const v=view();v.seats[0].passed=true;
 const {rerender}=render(<UpkeepSummary view={v}/>);
 expect(screen.queryByText(/Next action:/)).toBeNull();
 rerender(<UpkeepSummary view={{...v,seats:v.seats.map((seat,index)=>index===0?{...seat,passed:false}:seat),phase:'upkeep'}}/>);
 expect(screen.queryByText(/Next action:/)).toBeNull();
});
