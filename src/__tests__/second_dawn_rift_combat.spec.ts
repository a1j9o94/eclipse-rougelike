import { describe, expect, it } from 'vitest';
import { advanceCombat, resolveCombatChoice } from '../../shared/eclipse/battleEngine';
import { attackDieHits, riftDieOutcome, allocateRiftBackfire } from '../../shared/eclipse/combat';
import { initialBlueprints } from '../../shared/eclipse/blueprints';
import { randomInt, randomSeed } from '../../shared/eclipse/random';
import { processGameCommand } from '../../shared/eclipse/engine';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { advanceRound } from '../../shared/eclipse/rounds';
import type { GameState, Seat, GameEvent } from '../../shared/eclipse/types';
function seat(id: string): Seat {
  return {
    id,
    faction: "terran-directorate",
    controller: "human",
    resources: { money: 0, science: 0, materials: 0 },
    populationTracks: { money: 1, science: 1, materials: 1 },
    influenceOnTrack: 12,
    actionDiscs: {
      explore: 0,
      research: 0,
      build: 0,
      move: 0,
      influence: 0,
      upgrade: 0,
    },
    colonyShipsAvailable: 3,
    passed: true,
    eliminated: false,
    technologies: { military: [], grid: [], nano: [] },
    blueprints: initialBlueprints("terran-directorate"),
    ambassadors: [],
    traitor: false,
  };
}
function fixture(): GameState {
  return {
    rulesVersion: "test",
    catalogVersion: "test",
    revision: 0,
    round: 1,
    phase: "combat",
    activeSeatId: null,
    startSeatId: "a",
    firstPasser: "a",
    seats: [seat("a"), seat("b"), seat("c")],
    sectors: [
      {
        id: "s",
        tileId: "001",
        position: { q: 0, r: 0 },
        rotation: 0,
        owner: "a",
        population: [],
        orbital: false,
        monolith: false,
        discovery: false,
      },
      {
        id: "home",
        tileId: "001",
        position: { q: 1, r: 0 },
        rotation: 0,
        owner: "b",
        population: [],
        orbital: false,
        monolith: false,
        discovery: false,
      },
    ],
    ships: [
      {
        id: "a-i",
        owner: "a",
        type: "interceptor",
        sectorId: "s",
        damage: 0,
        arrival: 1,
      },
      {
        id: "b-i",
        owner: "b",
        type: "interceptor",
        sectorId: "s",
        damage: 0,
        arrival: 2,
      },
    ],
    technologyMarket: [],
    pendingDecision: null,
    privateSeats: ["a", "b", "c"].map((seatId) => ({
      seatId,
      reputation: [],
      discoveriesKept: [],
    })),
    random: randomSeed(9),
    supplies: {
      inner: [],
      middle: [],
      outer: [],
      technology: [],
      discovery: [],
      reputation: [1, 1, 1, 2, 2, 2, 3, 3, 4],
    },
    engine: {
      warpPortals: true,
      action: null,
      decisions: [],
      sectorDiscoveries: [],
      discardedSectors: { inner: [], middle: [], outer: [] },
      discardedDiscoveries: [],
      boxedSectors: [],
      battle: null,
      battleSectors: [],
      upkeepDone: [],
      scores: null,
      nextId: 1,
    },
  };
}

function seedFor(faces: number[]) {
 for (let seed=0;seed<100000;seed++) {
  let random=randomSeed(seed);
  if (faces.every(face=>{const roll=randomInt(random,6);random=roll.state;return roll.value+1===face;})) return randomSeed(seed);
 }
 throw new Error('No seed');
}
function roll(state: GameState, faces: number[]) {
 advanceCombat(state, []);
 const decision=state.pendingDecision!;
 expect(decision.kind).toBe('combat-turn');
 state.random=seedFor(faces);
 resolveCombatChoice(state, decision.owner, decision, {kind:'combat-turn',retreatTo:null}, []);
 const allocation=state.pendingDecision;
 if(allocation?.kind!=='combat-allocation') throw new Error('Missing saved roll');
 return allocation;
}
function riftFixture() {
 const s=fixture();
 s.seats[0].blueprints[0].parts=['rift-cannon','fusion-source','nuclear-drive',null];
 return s;
}
describe('Rift dice and compulsory backfire',()=>{
 it('applies Rift population damage and backfire once before offering a saved bombardment choice',()=>{
  const s=riftFixture();s.ships=s.ships.filter(ship=>ship.owner==='a');
  s.sectors[0].owner='b';s.sectors[0].population=[{squareId:'p0',resource:'money'}];
  s.random=seedFor([5]);const events:GameEvent[]=[];
  advanceRound(s,events);
  expect(s.pendingDecision).toMatchObject({kind:'bombardment',hits:3});
  expect(s.ships).toHaveLength(0);
  expect(events.some(e=>e.message.includes('backfire'))).toBe(true);
  const random=structuredClone(s.random);advanceRound(s,events);expect(s.random).toEqual(random);
 });
 it('uses the six printed faces and never computer or shield modifiers',()=>{
  expect([1,2,3,4,5,6].map(riftDieOutcome)).toEqual([
   {damage:0,backfire:0},{damage:0,backfire:0},{damage:1,backfire:0},
   {damage:2,backfire:0},{damage:3,backfire:1},{damage:0,backfire:1},
  ]);
  expect(attackDieHits({face:3,computer:-20,weaponColor:'magenta'},99)).toBe(true);
  expect(attackDieHits({face:6,computer:99,weaponColor:'magenta'},0)).toBe(false);
  expect(attackDieHits({face:1,computer:99,weaponColor:'yellow'},0)).toBe(false);
 });
 it('pools backfire to destroy the largest killable Rift ship, then wounds the largest remaining',()=>{
  const targets=[{id:'d',size:4,hp:4},{id:'c',size:3,hp:2},{id:'i',size:1,hp:1}];
  expect(allocateRiftBackfire(targets,3)).toEqual([{targetId:'c',damage:2},{targetId:'i',damage:1}]);
  expect(allocateRiftBackfire(targets,5)).toEqual([{targetId:'d',damage:4},{targetId:'i',damage:1}]);
  expect(allocateRiftBackfire([{id:'d',size:4,hp:4},{id:'c',size:3,hp:2}],1)).toEqual([{targetId:'d',damage:1}]);
 });
 it('persists special roll damage and shield-independent targets across reconnect',()=>{
  const s=riftFixture();s.seats[1].blueprints[0].parts=['ion-cannon','nuclear-source','nuclear-drive','phase-shield'];
  const d=roll(s,[4]);
  expect(d.dice[0]).toMatchObject({weaponColor:'magenta',damage:2,hitTargets:['b-i']});
  expect(getPlayerView(JSON.parse(JSON.stringify(s)) as GameState,'a')?.pendingDecision).toEqual(d);
 });
 it('resolves outgoing damage even when backfire destroys its firing ship; credits opponent and shows both casualties',()=>{
  const s=riftFixture();const d=roll(s,[5]);const events:GameEvent[]=[];
  resolveCombatChoice(s,'a',d,{kind:'combat-allocation',allocations:[{dieId:d.dice[0].id,targetId:'b-i'}]},events);
  expect(s.ships).toHaveLength(0);
  expect(s.engine!.battle!.kills).toEqual(expect.arrayContaining([{owner:'a',value:1},{owner:'b',value:1}]));
  const volley=events.find(e=>e.combatVolley)?.combatVolley;
  expect(volley?.targets).toEqual(expect.arrayContaining([
   expect.objectContaining({id:'a-i',destroyed:true}),expect.objectContaining({id:'b-i',destroyed:true}),
  ]));
  expect(advanceCombat(s,events)).toBe(true);
 });
 it('cannot dodge backfire by submitting an empty or illegal allocation',()=>{
  const s=riftFixture();const d=roll(s,[5]);const before=structuredClone(s);
  const result=processGameCommand(s,'a',{type:'resolve',decisionId:d.id,choice:{kind:'combat-allocation',allocations:[]}});
  expect(result.ok).toBe(false);expect(s).toEqual(before);
 });
 it('accepts no target selection on a backfire-only die and never damages a ship without a Rift part',()=>{
  const s=riftFixture();s.ships.push({id:'plain',owner:'a',type:'dreadnought',sectorId:'s',damage:0});
  const d=roll(s,[6]);expect(d.dice[0].targets).toEqual([]);
  resolveCombatChoice(s,'a',d,{kind:'combat-allocation',allocations:[]},[]);
  expect(s.ships.map(ship=>ship.id)).toEqual(['b-i','plain']);
 });
});
