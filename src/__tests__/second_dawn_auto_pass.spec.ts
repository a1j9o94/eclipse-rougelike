import {describe,expect,it} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {processGameCommand} from '../../shared/eclipse/engine';
import {commitCommand,getPlayerView} from '../../shared/eclipse/protocol';
import {passTurn} from '../../shared/eclipse/turn';
import {advanceRound} from '../../shared/eclipse/rounds';
import type {GameCommand,GameState} from '../../shared/eclipse/types';
import {BASE_FACTIONS} from '../../shared/eclipse/catalog';
function game(count=3){return createGame({seed:32,warpPortals:true,seats:BASE_FACTIONS.filter(f=>f.species==='alien').slice(0,count).map((f,i)=>({id:String.fromCharCode(97+i),faction:f.id,controller:'human'}))});}
function apply(state:GameState,actor:string,command:GameCommand){const result=processGameCommand(state,actor,command);expect(result.ok).toBe(true);if(!result.ok)throw new Error(result.error.message);return result;}
function mover(count=2){const state=game(count);state.activeSeatId='b';state.seats[0].passed=true;state.seats[0].autoPassUnlessAttacked=true;state.firstPasser='a';state.engine!.action={owner:'b',action:'move',remaining:1};state.sectors.forEach(s=>{s.portalVp=1;});return state;}
describe('auto-pass unless attacked',()=>{
 it('requires the first pass and never spends actions or grants another first-pass bonus',()=>{
  const initial=game(),money=initial.seats[0].resources.money;
  const enabled=apply(initial,'a',{type:'set-auto-pass',enabled:true}).state;
  expect(enabled.activeSeatId).toBe('a');expect(enabled.seats[0].passed).toBe(false);expect(enabled.seats[0].resources.money).toBe(money);
  const passed=apply(enabled,'a',{type:'pass'}).state;
  expect(passed.activeSeatId).toBe('b');expect(passed.seats[0].resources.money).toBe(money+2);
  expect(initial.seats[0].autoPassUnlessAttacked).toBeUndefined();
 });
 it('skips multiple already-passed reaction turns once each and preserves clockwise order',()=>{
  const state=game();state.activeSeatId='b';state.engine!.action={owner:'b',action:'build',remaining:1};
  for(const seat of state.seats.filter(s=>s.id!=='b')){seat.passed=true;seat.autoPassUnlessAttacked=true;}
  const result=apply(state,'b',{type:'end-action'});
  expect(result.state.activeSeatId).toBe('b');expect(result.state.random).toEqual(state.random);
  expect(result.state.seats).toEqual(state.seats);expect(result.state.actionTurnSerial).toBe(3);
  expect(result.events.filter(e=>e.message.includes('automatically passes')).map(e=>e.seatId)).toEqual(['c','a']);
 });
 it('keeps passed players without the preference eligible to choose a reaction',()=>{
  const state=game();state.seats[1].passed=true;
  expect(apply(state,'a',{type:'pass'}).state.activeSeatId).toBe('b');
 });
 it('enabling during your passed turn immediately hands off, while off-turn disabling changes no turn',()=>{
  const state=game();state.seats[0].passed=true;state.firstPasser='a';
  const enabled=apply(state,'a',{type:'set-auto-pass',enabled:true}).state;
  expect(enabled.activeSeatId).toBe('b');
  const disabled=apply(enabled,'a',{type:'set-auto-pass',enabled:false}).state;
  expect(disabled.activeSeatId).toBe('b');expect(disabled.actionTurnSerial).toBe(enabled.actionTurnSerial);expect(disabled.seats[0].autoPassUnlessAttacked).toBe(false);
 });
 it('preserves open reactions and saved required decisions while preferences change',()=>{
  const state=game();state.seats[0].passed=true;state.engine!.action={owner:'a',action:'upgrade',remaining:1};
  expect(apply(state,'a',{type:'set-auto-pass',enabled:true}).state.engine!.action).toEqual(state.engine!.action);
  state.pendingDecision={id:'saved',owner:'b',kind:'discovery',tileId:'money',options:['keep','use']};
  const changed=apply(state,'a',{type:'set-auto-pass',enabled:true}).state;
  expect(changed.pendingDecision).toEqual(state.pendingDecision);expect(changed.activeSeatId).toBe('a');expect(changed.random).toEqual(state.random);
 });
 it.each(['owned sector','fleet sector'])('pauses on a hostile entry into an %s and gives the defender their reaction turn',targetKind=>{
  const state=mover(),target=targetKind==='owned sector'?state.sectors.find(s=>s.owner==='a')!:state.sectors.find(s=>s.owner===null)!;
  if(targetKind==='fleet sector'){state.ships=state.ships.filter(s=>s.sectorId!==target.id);state.ships.find(s=>s.owner==='a')!.sectorId=target.id;}
  const ship=state.ships.find(s=>s.owner==='b')!;
  const result=apply(state,'b',{type:'move',moves:[{shipId:ship.id,path:[target.id]}]});
  expect(result.state.seats[0].autoPassPausedRound).toBe(1);expect(result.state.activeSeatId).toBe('a');
  expect(result.events.some(e=>e.seatId==='a'&&e.message.includes('Auto-pass paused'))).toBe(true);
 });
 it('leaves an illegal movement batch unchanged, including interruption flags',()=>{
  const state=mover(),before=structuredClone(state),ship=state.ships.find(s=>s.owner==='b')!;
  const result=processGameCommand(state,'b',{type:'move',moves:[{shipId:ship.id,path:['missing']}]});
  expect(result.ok).toBe(false);expect(state).toEqual(before);
 });
 it('does not pause for movement in unrelated space',()=>{
  const state=mover(),ship=state.ships.find(s=>s.owner==='b')!,target=state.sectors.find(s=>s.owner===null)!;
  const result=apply(state,'b',{type:'move',moves:[{shipId:ship.id,path:[target.id]}]});
  expect(result.state.seats[0].autoPassPausedRound).toBeUndefined();expect(result.state.activeSeatId).toBe('b');
 });
 it('allows allied transit without pausing, but ending in allied territory pauses when betrayal commits',()=>{
  const state=mover(4),a=state.seats[0],b=state.seats[1],ship=state.ships.find(s=>s.owner==='b')!,target=state.sectors.find(s=>s.owner==='a')!;
  state.ships=state.ships.filter(s=>s.owner!=='a');
  a.ambassadors=['b'];b.ambassadors=['a'];state.engine!.action!.remaining=2;
  const entered=apply(state,'b',{type:'move',moves:[{shipId:ship.id,path:[target.id]}]}).state;
  expect(entered.seats[0].autoPassPausedRound).toBeUndefined();
  const left=apply(entered,'b',{type:'move',moves:[{shipId:ship.id,path:[state.sectors.find(s=>s.owner==='b')!.id]}]}).state;
  expect(left.seats[0].autoPassPausedRound).toBeUndefined();expect(left.seats[1].traitor).toBe(false);
  const betrayed=apply(entered,'b',{type:'end-action'}).state;
  expect(betrayed.seats[0].autoPassPausedRound).toBe(1);expect(betrayed.seats[1].traitor).toBe(true);
 });
 it('persists preference but expires attack interruption next round without silently passing initially',()=>{
  const state=game();state.seats[0].autoPassUnlessAttacked=true;state.seats[0].autoPassPausedRound=1;state.firstPasser='a';state.phase='cleanup';
  advanceRound(state,[]);expect(state.round).toBe(2);expect(state.activeSeatId).toBe('a');expect(state.seats[0].passed).toBe(false);expect(state.seats[0].autoPassUnlessAttacked).toBe(true);
  expect(getPlayerView(state,'a')!.seats[0].autoPassUnlessAttacked).toBe(true);
 });
 it('never loops when the final unpassed player passes and keeps standalone passTurn parity',()=>{
  const state=game(2);state.seats[1].passed=true;state.seats[1].autoPassUnlessAttacked=true;
  expect(apply(state,'a',{type:'pass'}).state.phase).not.toBe('action');
  const three=game();three.seats[1].passed=true;three.seats[1].autoPassUnlessAttacked=true;
  const passed=passTurn(three,'a');expect(passed.ok).toBe(true);if(passed.ok)expect(passed.state.activeSeatId).toBe('c');
 });

 it('rolls back an otherwise valid hostile entry when a later batched movement is illegal',()=>{
  const state=mover(),before=structuredClone(state),ship=state.ships.find(s=>s.owner==='b')!,target=state.sectors.find(s=>s.owner==='a')!;
  state.engine!.action!.remaining=2;before.engine!.action!.remaining=2;
  const result=processGameCommand(state,'b',{type:'move',moves:[{shipId:ship.id,path:[target.id]},{shipId:ship.id,path:['missing']}]});
  expect(result.ok).toBe(false);expect(state).toEqual(before);
 });
 it('keeps the interruption after a legal hostile entry followed by departure in the same batch',()=>{
  const state=mover(),ship=state.ships.find(s=>s.owner==='b')!,home=ship.sectorId,target=state.sectors.find(s=>s.owner==='a')!;
  state.ships=state.ships.filter(s=>s.owner!=='a');state.engine!.action!.remaining=2;
  const result=apply(state,'b',{type:'move',moves:[{shipId:ship.id,path:[target.id]},{shipId:ship.id,path:[home]}]});
  expect(result.state.seats[0].autoPassPausedRound).toBe(1);expect(result.state.activeSeatId).toBe('a');
 });
 it('does not let a preference command advance combat or dismiss your own saved decision',()=>{
  const state=game();state.phase='combat';state.activeSeatId='b';
  const changed=apply(state,'a',{type:'set-auto-pass',enabled:true}).state;
  expect(changed.phase).toBe('combat');expect(changed.engine).toEqual(state.engine);expect(changed.random).toEqual(state.random);
  state.pendingDecision={id:'saved',owner:'a',kind:'discovery',tileId:'money',options:['keep','use']};
  expect(apply(state,'a',{type:'set-auto-pass',enabled:false}).state.pendingDecision).toEqual(state.pendingDecision);
 });

 it('lets the player explicitly resume after an attack and pauses again on another invasion',()=>{
  const state=mover();state.activeSeatId='a';state.engine!.action=null;state.seats[0].autoPassPausedRound=1;
  const resumed=apply(state,'a',{type:'set-auto-pass',enabled:true}).state;
  expect(resumed.seats[0].autoPassPausedRound).toBeUndefined();expect(resumed.activeSeatId).toBe('b');
  resumed.engine!.action={owner:'b',action:'move',remaining:1};
  const ship=resumed.ships.find(s=>s.owner==='b')!,target=resumed.sectors.find(s=>s.owner==='a')!;
  const attacked=apply(resumed,'b',{type:'move',moves:[{shipId:ship.id,path:[target.id]}]}).state;
  expect(attacked.seats[0].autoPassPausedRound).toBe(1);expect(attacked.activeSeatId).toBe('a');
 });
 it('accepts revisioned off-turn preferences during another seat’s decision and replays duplicates',()=>{
  const state=game();state.pendingDecision={id:'saved',owner:'b',kind:'discovery',tileId:'money',options:['keep','use']};
  const request={commandId:'preference',expectedRevision:0,command:{type:'set-auto-pass' as const,enabled:true}},pin={rulesVersion:state.rulesVersion,catalogVersion:state.catalogVersion};
  const accepted=commitCommand({state,journal:[]},'a',request,pin,processGameCommand);expect(accepted.ok).toBe(true);if(!accepted.ok)return;
  expect(accepted.aggregate.state.pendingDecision).toEqual(state.pendingDecision);
  const duplicate=commitCommand(accepted.aggregate,'a',request,pin,processGameCommand);expect(duplicate.ok&&duplicate.duplicate).toBe(true);
  expect(commitCommand(accepted.aggregate,'b',{...request,commandId:'stale'},pin,processGameCommand)).toMatchObject({ok:false,error:{code:'STALE_REVISION'}});
  expect(commitCommand({state,journal:[]},'stranger',request,pin,processGameCommand)).toMatchObject({ok:false,error:{code:'NOT_A_SEAT'}});
 });
});
