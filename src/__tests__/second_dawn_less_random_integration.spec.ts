import {describe,it,expect} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {processGameCommand} from '../../shared/eclipse/engine';
import {estimatePublicBattle} from '../../shared/eclipse/aiSimulation';
import {researchedTechnologyIds,ancientTechnologyChoices} from '../../shared/eclipse/technologies';
import {validateBlueprint} from '../../shared/eclipse/blueprints';
import type {GameState,GameCommand} from '../../shared/eclipse/types';
function game(){const s=createGame({seed:9,rulesMode:'less-random-v1',warpPortals:false,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'orion',controller:'human'}]});s.pendingDecision=null;s.engine!.decisions=[];s.activeSeatId='a';s.seats[0].resources={money:40,science:40,materials:40};return s;}
function act(s:GameState,c:GameCommand){const r=processGameCommand(s,'a',c);if(!r.ok)throw Error(r.error.message);return r.state;}
describe('Less Random cross-system technology behavior',()=>{
 it('Quantum research unlocks parts without adding a discount slot, and cannot be researched again',()=>{
  const s=game();const seat=s.seats[0];seat.developments=[{id:'quantum-labs',technologyId:'improved-hull'}];
  const bp=structuredClone(seat.blueprints[0]);bp.parts[bp.parts.length-1]='improved-hull';
  expect(validateBlueprint(seat.faction,bp,researchedTechnologyIds(seat),[])).toEqual([]);
  expect(ancientTechnologyChoices(['improved-hull'],seat.technologies,researchedTechnologyIds(seat))).toEqual([]);
  expect(processGameCommand(s,'a',{type:'research',tileId:'improved-hull',track:'grid'}).ok).toBe(false);
 });
 it('Advanced Colony Ships remains usable after Influence refresh',()=>{
  const s=game();s.seats[0].technologies.grid.push('advanced-colony-ships');s.seats[0].colonyShipsAvailable=3;
  const result=act(s,{type:'influence',removeSectorIds:[],addSectorIds:[]});
  expect(result.seats[0].colonyShipsAvailable).toBe(4);
 });
 it('Ancient Labs with an exhausted pool never strands the game in an empty choice',()=>{
  const s=game();s.supplies.discovery=[];s.lessRandom!.discoverySupply=[];
  const result=act(s,{type:'research-development',developmentId:'ancient-labs-development'});
  expect(result.pendingDecision).toBeNull();expect(result.engine!.decisions).toEqual([]);
 });
 it('combat estimates respect Antimatter Splitter from an outside-track Quantum slot',()=>{
  const s=game();const v=getPlayerView(s,'a');
  v.ships=v.ships.filter(ship=>ship.owner==='a'||ship.owner==='b');
  const own=v.ships.find(ship=>ship.owner==='a')!;const enemy=v.ships.find(ship=>ship.owner==='b')!;
  own.sectorId=enemy.sectorId;v.ships.push({...enemy,id:'enemy-two'});
  v.seats[0].blueprints[0].parts=['antimatter-cannon','fusion-source','nuclear-drive','gluon-computer'];
  const plain=estimatePublicBattle(v,[own.id],[enemy.id,'enemy-two'],4242,128);
  v.seats[0].developments=[{id:'quantum-labs',technologyId:'antimatter-splitter'}];
  const quantum=estimatePublicBattle(v,[own.id],[enemy.id,'enemy-two'],4242,128);
  v.seats[0].developments=[];v.seats[0].technologies.nano.push('antimatter-splitter');
  const tracked=estimatePublicBattle(v,[own.id],[enemy.id,'enemy-two'],4242,128);
  expect(tracked).not.toEqual(plain);expect(quantum).toEqual(tracked);
 });
});
