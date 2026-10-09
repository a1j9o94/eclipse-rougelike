import { describe, expect, it } from 'vitest';
import { resolveGeneralChoice } from '../../shared/eclipse/decisions';
import { processGameCommand } from '../../shared/eclipse/engine';
import { getPlayerView, visibleEvents } from '../../shared/eclipse/protocol';
import { createGame } from '../../shared/eclipse/setup';
import { initialBlueprints } from '../../shared/eclipse/blueprints';
import { advanceCombat, resolveCombatChoice } from '../../shared/eclipse/battleEngine';
import { initializeScifiDiscoveries, observeScifiEngagement, recordScifiWreck, returnFactoryPopulation, settleScifiBattle, resolveScifiBattleChoice } from '../../shared/eclipse/scifiBattle';
import { continuation, presentNextDecision } from '../../shared/eclipse/rulesState';
import type { BattleState, GameEvent, GameState } from '../../shared/eclipse/types';

function fixture(): GameState {
  return createGame({ seed: 10, warpPortals: true, seats: [
    { id: 'a', faction: 'terran-directorate', controller: 'human' },
    { id: 'b', faction: 'hydran', controller: 'human' },
    { id: 'c', faction: 'mechanema', controller: 'human' },
  ] });
}
function battle(state: GameState): BattleState {
  return continuation(state).battle = { id: 'test-battle', sectorId: state.sectors.find(s => s.owner === 'a')!.id,
    attacker: 'a', defender: 'b', stage: 'missiles', engagement: 0, groups: [], groupIndex: 0,
    retreats: [], kills: [], participants: ['a','b','c'], retreated: [], awarded: [], participationEligible: [] };
}

describe('science-fiction persisted battle and discovery abilities', () => {
  it('starts with a private setup draft, resolves the retained normal rewards and replays identically', () => {
    const state=createGame({seed:10,warpPortals:true,factionProfile:'scifi-v1',seats:[{id:'a',faction:'exfor',controller:'human'},{id:'b',faction:'bobiverse',controller:'human'}]});
    expect(state.pendingDecision?.kind).toBe('discovery-draft');
    expect(Object.values(state.seats[0].technologies).flat()).toContain('wormhole-generator');
    expect(getPlayerView(state,'b')?.pendingDecision).toBeNull();
    const d=state.pendingDecision!;
    if(d.kind!=='discovery-draft')throw new Error('Missing setup draft');
    // Pin known finite tiles so both the VP alternative and ordinary resource effect are exercised.
    d.tileIds=['materials','science','money']; state.supplies.discovery=['ancient-tech'];
    const command={type:'resolve' as const,decisionId:d.id,choice:{kind:'discovery-draft' as const,tileIds:['materials','science']}};
    const first=processGameCommand(state,'a',command),replayed=processGameCommand(JSON.parse(JSON.stringify(state)) as GameState,'a',command);
    expect(first.ok).toBe(true); expect(replayed).toEqual(first);
    if(!first.ok)throw new Error(first.error.message);
    expect(first.state.supplies.discovery).toEqual(['ancient-tech','money']);
    expect(visibleEvents(first.events,'b').every(event=>!event.message.includes('materials, science'))).toBe(true);
    const materialDecision=first.state.pendingDecision!; expect(materialDecision).toMatchObject({kind:'discovery',tileId:'materials'});
    const used=processGameCommand(first.state,'a',{type:'resolve',decisionId:materialDecision.id,choice:{kind:'discovery',option:'use'}});
    expect(used.ok).toBe(true); if(!used.ok)throw new Error(used.error.message);
    expect(used.state.seats[0].resources.materials).toBe(state.seats[0].resources.materials+6);
    const scienceDecision=used.state.pendingDecision!;
    const kept=processGameCommand(used.state,'a',{type:'resolve',decisionId:scienceDecision.id,choice:{kind:'discovery',option:'keep'}});
    expect(kept.ok).toBe(true); if(!kept.ok)throw new Error(kept.error.message);
    expect(kept.state.privateSeats[0].discoveriesKept).toEqual(['science']); expect(kept.state.pendingDecision).toBeNull();
    expect(kept.state.activeSeatId).toBe(state.activeSeatId);
  });
  it('drafts three finite discoveries, keeps two, returns the third, and survives reload without drafting twice', () => {
    const state = fixture(); state.seats[0].faction = 'exfor'; state.supplies.discovery = ['materials', 'materials', 'science', 'money'];
    initializeScifiDiscoveries(state); presentNextDecision(state);
    expect(state.pendingDecision).toMatchObject({ kind: 'discovery-draft', tileIds: ['materials', 'materials', 'science'], keepCount: 2 });
    const restored = JSON.parse(JSON.stringify(state)) as GameState;
    initializeScifiDiscoveries(restored);
    
    resolveScifiBattleChoice(restored, restored.seats[0], { kind:'discovery-draft', tileIds:['materials','materials'] }, []);
    expect(restored.supplies.discovery).toEqual(['money','science']);
    expect(continuation(restored).decisions.filter(d => d.kind === 'discovery')).toHaveLength(2);
    expect(continuation(restored).decisions.filter(d => d.kind === 'discovery-draft')).toHaveLength(0);
  });
  it('rejects fabricated or overdrawn discovery IDs, including duplicate tiles absent from the draft', () => {
    const state=fixture(); state.seats[0].faction='exfor'; state.supplies.discovery=['materials','science','money'];
    initializeScifiDiscoveries(state); presentNextDecision(state);
    expect(() => resolveScifiBattleChoice(state,state.seats[0],{kind:'discovery-draft',tileIds:['materials','materials']},[])).toThrow();
  });
  it('uses Bobiverse extra cruiser component supply when resolving an Ancient Cruiser discovery', () => {
    const state=fixture(); state.seats[0].faction='bobiverse'; const sector=state.sectors.find(s=>s.owner==='a')!;
    state.ships=Array.from({length:4},(_,index)=>({id:`cruiser-${index}`,owner:'a',type:'cruiser',sectorId:sector.id,damage:0}));
    resolveGeneralChoice(state,state.seats[0],{id:'reward',owner:'a',kind:'discovery',tileId:'ancient-cruiser',options:['keep','use'],sectorId:sector.id},{kind:'discovery',option:'use'});
    expect(state.ships.filter(ship=>ship.owner==='a'&&ship.type==='cruiser')).toHaveLength(5);
  });
  it('returns a destroyed mobile factory cube immediately once and lowers subsequent materials income', () => {
    const state=fixture(); state.seats[0].faction='bobiverse'; state.seats[0].populationTracks.materials=3;
    const ship=state.ships.find(s=>s.owner==='a')!; ship.factoryPopulation=true;
    returnFactoryPopulation(state,ship); returnFactoryPopulation(state,ship);
    expect(state.seats[0].populationTracks.materials).toBe(2);
    expect(continuation(state).decisions).toEqual([]);
  });
  it('lets the firing side target a populated factory and returns its cube through ordinary combat destruction', () => {
    const state=fixture(), b=battle(state); state.phase='combat'; state.seats[0].faction='bobiverse'; state.seats[0].populationTracks.materials=3;
    state.ships=[{id:'factory',owner:'a',type:'interceptor',sectorId:b.sectorId,damage:0,factoryPopulation:true},{id:'empty',owner:'a',type:'interceptor',sectorId:b.sectorId,damage:0},{id:'enemy',owner:'b',type:'interceptor',sectorId:b.sectorId,damage:0}];
    b.groups=[{id:'b/interceptor',owner:'b',shipType:'interceptor',initiative:1}]; b.attackingOwner='b'; b.dice=[{id:'hit',face:6,damage:1,computer:0}]; b.splitDice=[];
    resolveCombatChoice(state,'b',{id:'alloc',owner:'b',kind:'combat-allocation',battleId:b.id,dice:[{id:'hit',face:6,damage:1,targets:['factory','empty']}]},{kind:'combat-allocation',allocations:[{dieId:'hit',targetId:'factory'}]},[]);
    expect(state.ships.map(s=>s.id)).toEqual(['empty','enemy']); expect(state.seats[0].populationTracks.materials).toBe(2);
  });
  it('records opponent research and only ancient hardware installed on participating ship classes for surviving Portiids', () => {
    const state=fixture(), b=battle(state); state.seats[0].faction='portiids'; state.seats[1].technologies.nano=['improved-hull'];
    state.seats[1].blueprints=initialBlueprints('hydran'); state.seats[1].blueprints.find(p=>p.shipType==='interceptor')!.parts[0]='ion-turret'; state.seats[1].blueprints.find(p=>p.shipType==='dreadnought')!.parts[0]='flux-shield';
    state.ships=[{id:'portiid',owner:'a',type:'interceptor',sectorId:b.sectorId,damage:0},{id:'opponent',owner:'b',type:'interceptor',sectorId:b.sectorId,damage:0}];
    observeScifiEngagement(state,b,['a','b']); state.ships[0].sectorId='retreated'; state.ships=state.ships.filter(s=>s.owner==='a');
    const events:GameEvent[]=[]; settleScifiBattle(state,b,events); presentNextDecision(state);
    expect(state.pendingDecision).toMatchObject({kind:'reverse-engineering',projects:[{kind:'technology',id:'improved-hull'},{kind:'ancient-part',id:'ion-turret'}]});
    
    resolveScifiBattleChoice(state,state.seats[0],{kind:'reverse-engineering',project:{kind:'ancient-part',id:'ion-turret'}},events);
    expect(state.seats[0].scifi?.reverseEngineeringProject).toEqual({kind:'ancient-part',id:'ion-turret'});
    settleScifiBattle(state,b,events); expect(continuation(state).decisions).toEqual([]);
  });
  it('does not award a project to wiped-out Portiids or observe ancient neutral technology', () => {
    const state=fixture(),b=battle(state); state.seats[0].faction='portiids'; state.seats[1].technologies.nano=['improved-hull'];
    state.ships=[{id:'p',owner:'a',type:'interceptor',sectorId:b.sectorId,damage:0},{id:'b',owner:'b',type:'interceptor',sectorId:b.sectorId,damage:0}];
    observeScifiEngagement(state,b,['a','b']); state.ships=state.ships.filter(s=>s.owner==='b'); settleScifiBattle(state,b,[]);
    expect(continuation(state).decisions).toEqual([]);
  });
  it('pays battle-wide friendly, neutral and third-party wrecks once to a surviving retired Belter participant', () => {
    const state=fixture(),b=battle(state); state.seats[0].faction='belters'; state.seats[0].resources.materials=0;
    const survivor={id:'belter',owner:'a',type:'interceptor' as const,sectorId:b.sectorId,damage:0}; state.ships=[survivor,{id:'opponent',owner:'b',type:'interceptor',sectorId:b.sectorId,damage:0}];
    observeScifiEngagement(state,b,['a','b']); survivor.sectorId='retreated';
    for(const id of ['own','ancient','third','fourth','own']) recordScifiWreck(b,{id,owner:'c',type:'interceptor',sectorId:b.sectorId,damage:0});
    const recovered=JSON.parse(JSON.stringify(state)) as GameState; const saved=continuation(recovered).battle!;
    settleScifiBattle(recovered,saved,[]); settleScifiBattle(recovered,saved,[]);
    expect(recovered.seats[0].resources.materials).toBe(3);
  });
  it('collects later third-party wrecks after retreating from the first engagement of a complete sector battle', () => {
    const state=fixture(); state.phase='combat'; state.seats[0].faction='belters'; state.seats[0].resources.materials=0;
    const home=state.sectors.find(sector=>sector.owner==='a')!; home.portalVp=1;
    const combatSector={...structuredClone(home),id:'fight',owner:null,position:{q:9,r:9},population:[]}; state.sectors.push(combatSector);
    state.seats[0].blueprints.find(bp=>bp.shipType==='interceptor')!.parts=['improved-hull','improved-hull','improved-hull','nuclear-drive'];
    state.ships=[{id:'a',owner:'a',type:'interceptor',sectorId:'fight',damage:0,arrival:3},{id:'b',owner:'b',type:'interceptor',sectorId:'fight',damage:0,arrival:1},{id:'c',owner:'c',type:'interceptor',sectorId:'fight',damage:0,arrival:2}];
    const events:GameEvent[]=[];
    for(let guard=0;guard<500;guard++){
      if(advanceCombat(state,events))break;
      const d=state.pendingDecision!;
      if(d.kind==='combat-turn')resolveCombatChoice(state,d.owner,d,{kind:'combat-turn',retreatTo:d.owner==='a'?home.id:null},events);
      else if(d.kind==='combat-allocation')resolveCombatChoice(state,d.owner,d,{kind:'combat-allocation',allocations:d.dice.map(die=>({dieId:die.id,targetId:die.targets[0]}))},events);
      else if(d.kind==='initiative-order')resolveCombatChoice(state,d.owner,d,{kind:'initiative-order',groupIds:d.groupIds},events);
      else throw new Error(`Unexpected decision ${d.kind}`);
      if(guard===499)throw new Error('Battle did not finish');
    }
    expect(state.ships.find(ship=>ship.id==='a')?.sectorId).toBe(home.id);
    expect(state.seats[0].resources.materials).toBe(1);
    expect(events.filter(event=>event.message.startsWith('Salvaged'))).toHaveLength(1);
  });
  it('does not pay salvage to an eliminated fleet or count wrecks from an earlier sector battle', () => {
    const state=fixture(),b=battle(state); state.seats[0].faction='belters'; state.seats[0].resources.materials=0;
    state.ships=[{id:'belter',owner:'a',type:'interceptor',sectorId:b.sectorId,damage:0},{id:'enemy',owner:'b',type:'interceptor',sectorId:b.sectorId,damage:0}];
    observeScifiEngagement(state,b,['a','b']); state.ships=state.ships.filter(s=>s.owner==='b'); recordScifiWreck(b,{id:'belter',owner:'a',type:'interceptor',sectorId:b.sectorId,damage:0}); settleScifiBattle(state,b,[]);
    expect(state.seats[0].resources.materials).toBe(0);
  });
  it('retains battle ledger across sequential engagements instead of settling between two fleets', () => {
    const state=fixture(); state.phase='combat'; state.seats[0].faction='belters'; state.seats[0].resources.materials=0;
    const s=state.sectors.find(t=>t.owner==='a')!;
    state.ships=[{id:'a',owner:'a',type:'interceptor',sectorId:s.id,damage:0,arrival:1},{id:'b',owner:'b',type:'interceptor',sectorId:s.id,damage:0,arrival:2},{id:'c',owner:'c',type:'interceptor',sectorId:s.id,damage:0,arrival:3}];
    advanceCombat(state,[]); const b=continuation(state).battle!;
    expect(b.scifi?.participantShips.c).toEqual(['c']);
    recordScifiWreck(b,state.ships.find(s=>s.owner==='c')!); state.ships=state.ships.filter(s=>s.owner!=='c'); state.pendingDecision=null;
    advanceCombat(state,[]);
    expect(continuation(state).battle!.scifi?.wreckIds).toEqual(['c']); expect(state.seats[0].resources.materials).toBe(0);
  });
});
