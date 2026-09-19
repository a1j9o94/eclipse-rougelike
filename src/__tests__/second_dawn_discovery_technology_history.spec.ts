import { describe, expect, it } from 'vitest';
import { processGameCommand } from '../../shared/eclipse/engine';
import { projectHistoryEntry } from '../../shared/eclipse/history';
import { commitCommand } from '../../shared/eclipse/protocol';
import { createGame } from '../../shared/eclipse/setup';
import type { JournalEntry } from '../../shared/eclipse/types';

describe('discovery technology history',()=>{
 it('names the actual free technology in an accepted journal without revealing the private discovery draw',()=>{
  const state=createGame({seed:7,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
  state.activeSeatId='a';state.technologyMarket=['fusion-drive'];
  state.pendingDecision={id:'private-free-decision',owner:'a',kind:'free-technology',technologyIds:['fusion-drive']};
  const science=state.seats[0].resources.science;
  const result=commitCommand({state,journal:[]},'a',{commandId:'private-request',expectedRevision:state.revision,command:{type:'resolve',decisionId:'private-free-decision',choice:{kind:'free-technology',technologyId:'fusion-drive',track:'nano'}}},{rulesVersion:state.rulesVersion,catalogVersion:state.catalogVersion},processGameCommand);
  expect(result.ok).toBe(true);if(!result.ok)throw new Error(result.error.message);
  expect(result.aggregate.state.seats[0].technologies.nano).toContain('fusion-drive');
  expect(result.aggregate.state.seats[0].resources.science).toBe(science);
  const journal=result.aggregate.journal.at(-1)!;
  journal.events.push({type:'draw',seatId:'a',visibility:{seatId:'a'},message:'Private ancient-tech draw and reputation 4,3'});
  const history=projectHistoryEntry(journal,result.aggregate.state.seats,state.round);
  expect(history.summary).toBe('Received Fusion Drive from discovery');
  expect(history.presentation).toEqual({kind:'research',technologyId:'fusion-drive'});
  expect(JSON.stringify(history)).not.toMatch(/private-free-decision|private-request|Private ancient-tech|4,3/);
 });

 it('upgrades older journal summaries while keeping kept discoveries and reputation opaque',()=>{
  const entry:JournalEntry={actor:'a',request:{commandId:'private',expectedRevision:2,command:{type:'resolve',decisionId:'secret',choice:{kind:'free-technology',technologyId:'improved-hull',track:'grid'}}},receipt:{commandId:'private',revision:3,eventCount:0},events:[]};
  expect(projectHistoryEntry(entry,[]).summary).toBe('Received Improved Hull from discovery');
  entry.request.command={type:'resolve',decisionId:'secret',choice:{kind:'discovery',option:'keep'}};
  expect(projectHistoryEntry(entry,[])).toMatchObject({summary:'Resolved discovery'});
  expect(projectHistoryEntry(entry,[]).presentation).toBeUndefined();
  entry.request.command={type:'resolve',decisionId:'secret',choice:{kind:'reputation',kept:[4,3]}};
  expect(projectHistoryEntry(entry,[])).toMatchObject({summary:'Selected reputation'});
  expect(JSON.stringify(projectHistoryEntry(entry,[]))).not.toMatch(/4,3|secret/);
 });
});
