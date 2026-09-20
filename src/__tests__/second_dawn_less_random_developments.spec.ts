import {describe,it,expect} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {processGameCommand} from '../../shared/eclipse/engine';
import {quantumResearchCost} from '../../shared/eclipse/developments';
import type {GameState,GameCommand} from '../../shared/eclipse/types';
function game() { const s=createGame({seed:12,warpPortals:false,rulesMode:'less-random-v1',seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'orion',controller:'human'}]});s.pendingDecision=null;s.engine!.decisions=[];s.seats[0].resources={money:30,science:30,materials:30};return s; }
function act(s:GameState,c:GameCommand){const r=processGameCommand(s,'a',c);if(!r.ok)throw new Error(r.error.message);return r.state;}
describe('outside-track developments',()=>{
 it('buys the singleton Ancient Labs for eight money and offers the public discovery supply',()=>{
  const s=act(game(),{type:'research-development',developmentId:'ancient-labs-development'});
  expect(s.seats[0].resources.money).toBe(22);
  expect(s.seats[0].developments).toContainEqual({id:'ancient-labs-development'});
  expect(Object.values(s.seats[0].technologies).flat()).not.toContain('ancient-labs-development');
  expect(s.pendingDecision?.kind).toBe('discovery');
  const before=structuredClone(s);const bad=processGameCommand(s,'b',{type:'research-development',developmentId:'ancient-labs-development'});expect(bad.ok).toBe(false);expect(s).toEqual(before);
 });
 it('Quantum Labs costs seven materials; later research bypasses a full track and deducts six below minimum',()=>{
  let s=act(game(),{type:'research-development',developmentId:'quantum-labs'});
  expect(s.seats[0].resources.materials).toBe(23);
  s.engine!.action=null;s.activeSeatId='a';
  s.seats[0].technologies.grid=['gauss-shield','fusion-source','positron-computer','advanced-economy','tachyon-drive','antimatter-cannon','quantum-grid'];
  expect(quantumResearchCost(s.seats[0],'improved-hull','grid')).toBe(0);
  s=act(s,{type:'quantum-research',tileId:'improved-hull',track:'grid'});
  expect(s.seats[0].technologies.grid).toHaveLength(7);
  expect(s.seats[0].resources.science).toBe(30);
  expect(s.seats[0].developments).toContainEqual({id:'quantum-labs',technologyId:'improved-hull'});
 });
 it('does not allow developments in historical Standard games',()=>{
  const s=game();delete s.rulesMode;delete s.lessRandom;
  expect(processGameCommand(s,'a',{type:'research-development',developmentId:'quantum-labs'}).ok).toBe(false);
 });
});
