import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import ShipPartStats from '../second-dawn-game/ShipPartStats';
import {describeShipPart} from '../second-dawn-game/itemDescriptions';
import {CombatVolleyAllocator} from '../second-dawn-game/CombatDecisionVisuals';
import {CombatPlayback} from '../second-dawn-game/BattleOverview';
import {riftCombatReviewFixture} from '../second-dawn-game/riftReviewFixture';

afterEach(cleanup);
it('offers a real persisted Rift roll in the playable combat preview',()=>{
  const state=riftCombatReviewFixture();
  expect(state.pendingDecision).toMatchObject({kind:'combat-allocation',owner:'rift',dice:[{face:5,damage:3,weaponColor:'magenta',hitTargets:['shield-dreadnought']}]});
});
it('explains the special die on research, upgrade and discovery part cards',()=>{
  render(<ShipPartStats partId="rift-cannon"/>);
  expect(screen.getByRole('group',{name:'Six Rift die faces'}).querySelectorAll('.dg-eclipse-die')).toHaveLength(6);
  expect(screen.getByText(/Filled burst: enemy damage/)).toBeInTheDocument();
  expect(describeShipPart('rift-conductor')).toMatch(/ignoring computers and shields/);
  expect(describeShipPart('rift-conductor')).toMatch(/Survive 1 additional damage/);
});
it('describes a backfire-only volley as no enemy damage, never a natural-six hit',()=>{
  render(<CombatVolleyAllocator decision={{id:'r',owner:'p',kind:'combat-allocation',battleId:'b',dice:[{id:'d',face:6,damage:0,weaponColor:'magenta',weaponKind:'cannon',targets:[],hitTargets:[]}]}} targetLabels={{}} values={{}} setValue={vi.fn()} motionEnabled={false}/>);
  expect(screen.getByText(/No enemy damage to assign/)).toBeInTheDocument();
  expect(screen.getByText(/0 damage, 1 self-damage/)).toBeInTheDocument();
  expect(screen.queryByText(/Natural 6 always hits/)).toBeNull();
});
it('identifies own-fleet impacts as Rift backfire in combat playback',()=>{
  render(<CombatPlayback fast volleys={[{battleId:'b',sectorId:'s',attacker:'p',defender:'q',dice:[{id:'d',face:6,damage:0,weaponColor:'magenta',weaponKind:'cannon'}],impacts:[{dieId:'d',targetId:'own',hit:true,damage:1}],targets:[{id:'own',owner:'p',shipType:'interceptor',hpBefore:1,hpAfter:0,destroyed:true,excess:0}]}]}/>);
  expect(screen.getAllByText(/Rift backfire/).length).toBeGreaterThan(0);
});
