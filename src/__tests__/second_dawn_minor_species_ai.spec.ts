import {expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {processGameCommand} from '../../shared/eclipse/engine';
import {evaluateAiCommand,chooseAiCommand} from '../../shared/eclipse/ai';
import {sampleAiWorld} from '../../shared/eclipse/aiWorld';
import {evaluateStrategicPosition} from '../../shared/eclipse/aiEvaluation';
import {projectHistoryEntry} from '../../shared/eclipse/history';
import type {GameCommand,JournalEntry} from '../../shared/eclipse/types';
function fixture(){
 const state=createGame({seed:42,warpPortals:true,minorSpecies:true,seats:[{id:'a',faction:'terran-directorate',controller:'ai'},{id:'b',faction:'hydran',controller:'ai'}]});
 state.activeSeatId='a';state.minorSpecies={market:['researchers','prestige','population','cruisers']};state.seats[0].resources={money:30,science:8,materials:8};
 return state;
}
it('preserves the public finite minor-species market and ownership in sampled search worlds',()=>{
 const state=fixture();state.seats[1].minorSpecies=[{id:'ambassadors'}];
 const view=getPlayerView(state,'a')!,before=JSON.stringify(view),sample=sampleAiWorld(view,17);
 expect(sample.minorSpecies).toEqual(view.minorSpecies);expect(sample.minorSpecies).toEqual({market:['researchers','prestige','population','cruisers']});
 expect(sample.seats[1].minorSpecies).toEqual([{id:'ambassadors'}]);
 sample.minorSpecies!.market.pop();expect(JSON.stringify(view)).toBe(before);
});
it('values early research savings but protects upkeep money and existing reputation',()=>{
 const state=fixture(),buy:GameCommand={type:'buy-minor-species',minorSpeciesId:'researchers'};
 const early=evaluateAiCommand(getPlayerView(state,'a')!,buy);state.round=8;
 expect(early).toBeGreaterThan(evaluateAiCommand(getPlayerView(state,'a')!,buy));
 state.round=1;state.seats[0].resources.money=4;state.seats[0].influenceOnTrack=7;
 const poor=getPlayerView(state,'a')!;
 expect(evaluateAiCommand(poor,buy)).toBeLessThan(evaluateAiCommand(poor,{type:'pass'}));
 state.seats[0].resources.money=30;state.seats[0].influenceOnTrack=10;
 const view=getPlayerView(state,'a')!;
 expect(evaluateAiCommand(view,{...buy,returnReputation:[4]})).toBeLessThan(evaluateAiCommand(view,buy));
});
it('uses public tile counts for bonus VP without reading opponent reputation values',()=>{
 const state=fixture();state.round=8;state.seats[1].minorSpecies=[{id:'reputation'}];
 state.privateSeats[1].reputation=[1,2,3];const view=getPlayerView(state,'a')!;
 const first=evaluateStrategicPosition(view,'a');state.privateSeats[1].reputation=[4,4,4];
 expect(evaluateStrategicPosition(getPlayerView(state,'a')!,'a')).toBe(first);
 const noBonus=structuredClone(view);noBonus.seats[1].minorSpecies=[];
 expect(first).toBeLessThan(evaluateStrategicPosition(noBonus,'a'));
});
it('produces a legal affordable purchase when scoring is preferable to passing',()=>{
 const state=fixture();state.round=8;state.seats[0].influenceOnTrack=0;state.seats[0].resources.money=50;state.seats[0].populationTracks.money=11;state.seats[0].colonyShipsAvailable=0;
 const choice=chooseAiCommand(getPlayerView(state,'a')!,19)!;
 expect(choice.command.type).toBe('buy-minor-species');
 expect(processGameCommand(state,'a',choice.command).ok).toBe(true);
});
it('names the purchased minor species in public history without exposing returned reputation values',()=>{
 const entry:JournalEntry={actor:'a',request:{commandId:'private-request',expectedRevision:0,command:{type:'buy-minor-species',minorSpeciesId:'researchers',returnReputation:[4]}},receipt:{commandId:'private-request',revision:1,eventCount:0},events:[]};
 const row=projectHistoryEntry(entry,fixture().seats,1);
 expect(row.summary).toMatch(/Minor Species.*Research|Research.*Minor Species/i);
 expect(JSON.stringify(row)).not.toMatch(/returnReputation|private-request/);
});
it('keeps strategic search bounded and legal with the optional market enabled',async()=>{
 const {chooseStrategicAiCommand}=await import('../../shared/eclipse/aiSearch');
 const state=fixture(),view=getPlayerView(state,'a')!;
 const options={difficulty:'hard' as const,maxNodes:4,budgetMs:1000,now:()=>0};
 const choice=chooseStrategicAiCommand(view,88,options)!;
 expect(choice.search.nodes).toBeLessThanOrEqual(4);
 expect(processGameCommand(state,'a',choice.command).ok).toBe(true);
 const differentHidden=structuredClone(state);differentHidden.supplies.discovery.reverse();differentHidden.supplies.inner.reverse();differentHidden.random.value=99;
 expect(chooseStrategicAiCommand(getPlayerView(differentHidden,'a')!,88,options)).toEqual(choice);
});
