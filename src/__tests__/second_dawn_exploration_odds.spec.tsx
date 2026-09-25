import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {sectorDefinition} from '../../shared/eclipse/sectors';
import {sectorDrawOdds} from '../../shared/eclipse/sectorDrawOdds';
import ExploreOdds from '../second-dawn-game/ExploreOdds';

afterEach(cleanup);
const fixture=()=>createGame({seed:19,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}],warpPortals:true});

it('projects feature prevalence for the actual next draw pile without revealing tile identities',()=>{
 const state=fixture();state.supplies.inner=['101','102','108'];
 const expected=state.supplies.inner.map(id=>sectorDefinition(Number(id))!);
 const view=getPlayerView(state,'a')!;
 const offers=(resource:'science'|'money'|'materials')=>expected.filter(tile=>tile.population.some(square=>square.resource===resource||square.resource==='gray')).length;
 expect(view.sectorDrawOdds?.inner).toEqual({source:'draw',total:3,science:offers('science'),money:offers('money'),materials:offers('materials'),ancients:expected.filter(tile=>tile.ancients>0).length,artifacts:expected.filter(tile=>tile.artifacts>0).length});
 expect(JSON.stringify(view.sectorDrawOdds)).not.toContain('101');
 expect(view).not.toHaveProperty('supplies');
});

it('uses discard composition only after draw-pile exhaustion, then reports exhausted',()=>{
 const state=fixture();state.supplies.middle=[];state.engine!.discardedSectors.middle=['201','202'];
 const odds=sectorDrawOdds(state).middle;
 expect(odds.source).toBe('reshuffle');expect(odds.total).toBe(2);
 state.engine!.discardedSectors.middle=[];
 expect(sectorDrawOdds(state).middle).toEqual({source:'exhausted',total:0,science:0,money:0,materials:0,ancients:0,artifacts:0});
});

it('follows the selected setup inventory, including boxed outer sectors and optional portals',()=>{
 const seats=[{id:'a',faction:'eridani' as const,controller:'human' as const},{id:'b',faction:'hydran' as const,controller:'ai' as const}];
 const standard=createGame({seed:19,seats,warpPortals:false});
 const fullOuter=createGame({seed:19,seats,warpPortals:false,ruleOptions:{explorationRules:true}});
 const verify=(state:typeof standard)=>{
  const odds=sectorDrawOdds(state).outer;
  expect(odds.total).toBe(state.supplies.outer.length);
  expect(odds.artifacts).toBe(state.supplies.outer.filter(id=>(sectorDefinition(Number(id))?.artifacts??0)>0).length);
 };
 verify(standard);verify(fullOuter);
 expect(fullOuter.supplies.outer.length).toBeGreaterThan(standard.supplies.outer.length);
 expect(standard.supplies.outer).not.toContain('381');
 expect(standard.supplies.outer).not.toContain('382');
});

it('shows independent chance of at least one feature in a chosen ring',()=>{
 const view=getPlayerView(fixture(),'a')!;
 view.sectorDrawOdds={...view.sectorDrawOdds!,outer:{source:'draw',total:4,science:2,money:3,materials:1,ancients:1,artifacts:0}};
 render(<ExploreOdds view={view} position={{q:3,r:0}}/>);
 const group=screen.getByRole('group',{name:'Ring III next sector odds'});
 for(const name of ['Science: 50%','Money: 75%','Materials: 25%','Ancients: 25%','Artifact: 0%']){
  expect(within(group).getByRole('group',{name})).toHaveTextContent(/\d+%/);
 }
 expect(within(group).queryByText('Science')).toBeNull();
});
