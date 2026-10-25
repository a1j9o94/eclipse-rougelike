import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import Board from '../second-dawn-game/SecondDawnBoard';
import BuildPlanner from '../second-dawn-game/BuildPlanner';
import MobileNavigation from '../second-dawn-game/MobileNavigation';
import fixtures from '../second-dawn-game/reviewFixtures.json';
import {draftStorageKey} from '../second-dawn-game/actionDraftStorage';
import type {GameState} from '../../shared/eclipse/types';

afterEach(cleanup);
function fixture() {
 const state=createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});
 state.activeSeatId='a'; state.seats[0].resources={money:20,science:20,materials:20};
 return state;
}
it('keeps global navigation available while an activity is open',()=>{
 const navigate=vi.fn();
 render(<MobileNavigation selected="Galaxy" onSelect={navigate} pending={false} onDecision={vi.fn()} actionLabel="Build" onBack={vi.fn()} onDetails={vi.fn()}/>);
 fireEvent.click(within(screen.getByRole('navigation',{name:'Mobile game navigation'})).getByRole('button',{name:'Empire'}));
 expect(navigate).toHaveBeenCalledWith('Empire');
 expect(screen.getByRole('navigation',{name:'Current action'})).toBeVisible();
});
it('starts an ordinary turn without an acknowledgment dialog',()=>{
 const view=getPlayerView(fixture(),'a')!;
 render(<Board view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 expect(screen.queryByRole('dialog',{name:'Your turn'})).toBeNull();
 expect(screen.queryByRole('button',{name:'View turn'})).toBeNull();
 expect(screen.getByRole('button',{name:'Explore',exact:true})).toBeEnabled();
});
it('keeps the existing build control when every activation is placed',()=>{
 const state=fixture(); state.engine!.action={owner:'a',action:'build',remaining:1};
 const view=getPlayerView(state,'a')!,source=state.sectors.find(sector=>sector.owner==='a')!,submit=vi.fn();
 render(<BuildPlanner view={view} sectorId={source.id} embedded disabled={false} onClose={vi.fn()} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Add interceptor'}));
 fireEvent.click(screen.getByRole('button',{name:`Place interceptor in sector ${source.tileId}`}));
 expect(screen.queryByRole('dialog',{name:'Build order ready'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Build 1 ship · 3 materials'}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'build',builds:[{component:'interceptor',sectorId:source.id}]});
});
it('offers one upkeep settlement with colony opportunities before collecting income',()=>{
 const state=fixture(); state.phase='upkeep'; state.seats[0].colonyShipsAvailable=1;
 const source=state.sectors.find(sector=>sector.owner==='a')!; source.population=[];
 const view=getPlayerView(state,'a')!,submit=vi.fn();
 render(<Board view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={submit} onMenu={vi.fn()}/>);
 expect(screen.queryByRole('dialog',{name:'Upkeep is ready'})).toBeNull();
 const settlement=screen.getByRole('region',{name:'Upkeep settlement'});
 expect(within(settlement).getByRole('button',{name:/Colonize/})).toBeEnabled();
 fireEvent.click(within(settlement).getByRole('button',{name:'Collect income'}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'finish-upkeep'});
 expect(screen.queryByRole('dialog',{name:'Colonize before upkeep'})).toBeNull();
});
it('retains the battle scene and scroll through waiting and subsequent decisions',()=>{
 const state=fixtures.combat as GameState;
 const view=getPlayerView(state,state.pendingDecision!.owner)!;
 const props={candidates:legalCommands(view),connected:true,busy:false,status:'Saved',onSubmit:vi.fn(),onMenu:vi.fn()};
 const ui=render(<Board {...props} view={view}/>);
 const battle=screen.getByRole('region',{name:'Battle workspace'});battle.scrollTop=180;
 ui.rerender(<Board {...props} view={{...view,revision:view.revision+1,pendingDecision:null,waitingFor:{owner:'opponent',kind:'combat-turn'}}}/>);
 expect(screen.getByRole('region',{name:'Battle workspace'})).toBe(battle);
 ui.rerender(<Board {...props} view={{...view,revision:view.revision+2,pendingDecision:{...view.pendingDecision!,id:'next-roll'}}}/>);
 expect(screen.getByRole('region',{name:'Battle workspace'})).toBe(battle);
 expect(battle.scrollTop).toBe(180);
});

it('never exposes an inactive completion draft as the current activity commit',()=>{
 vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const state=fixture();state.engine!.action={owner:'a',action:'upgrade',remaining:1};const view=getPlayerView(state,'a')!;
 const partition={matchId:'inactive-completion',viewerSeatId:'a'},key=draftStorageKey(partition);
 localStorage.setItem(key,JSON.stringify({version:1,...partition,values:{action:{revision:view.revision,value:'upgrade'},screen:{revision:view.revision,value:'Blueprints'},commandDraft:{revision:view.revision,value:{command:{type:'end-action'},label:'Finish moving',description:'A previously reviewed betrayal'}}}}));
 try{
  render(<Board matchId={partition.matchId} view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
  expect(screen.queryByRole('button',{name:'Commit action'})).toBeNull();
 }finally{localStorage.removeItem(key);vi.unstubAllGlobals();}
});
