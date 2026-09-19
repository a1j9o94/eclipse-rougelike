import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {neutralBlueprint} from '../../shared/eclipse/blueprints';
import type {GameState} from '../../shared/eclipse/types';
import fixturesJson from '../second-dawn-game/reviewFixtures.json?raw';
import BattleOverview from '../second-dawn-game/BattleOverview';
import FleetInspection from '../second-dawn-game/FleetInspection';

afterEach(cleanup);
function fixture(type:'ancient'|'guardian'|'gcds'){
 const state=(JSON.parse(fixturesJson) as Record<string,GameState>).combat;
 const view=getPlayerView(state,state.pendingDecision!.owner)!;
 view.battle!.defender=type;
 view.ships=view.ships.filter(ship=>ship.owner===view.battle!.attacker);
 view.ships.push({id:'neutral',owner:type,type,sectorId:view.battle!.sectorId,damage:1});
 return view;
}
it.each(['ancient','guardian','gcds'] as const)('identifies the standard %s blueprint in battle and shows each actual weapon die',type=>{
 const view=fixture(type),stats=neutralBlueprint(`${type}-standard`).stats;
 render(<BattleOverview view={view}/>);
 const neutral=screen.getByText('Standard defender blueprint').closest('.dg-battle-class')!;
 expect(within(neutral as HTMLElement).getByRole('group',{name:'Neutral ship weapons'}).querySelectorAll('.dg-eclipse-die')).toHaveLength(stats.weapons.reduce((n,weapon)=>n+weapon.dice,0));
 expect(within(neutral as HTMLElement).getByRole('img',{name:`HP: ${stats.hull}/${stats.hull+1}`})).toBeInTheDocument();
 expect(within(neutral as HTMLElement).getByRole('img',{name:`Computer: +${stats.computer}`})).toBeInTheDocument();
 if(type==='gcds')expect(within(neutral as HTMLElement).getByText('Galactic Center Defense System')).toBeInTheDocument();
});
it.each(['ancient','guardian','gcds'] as const)('shows standard %s identity and complete armament in fleet inspection',type=>{
 const view=fixture(type),stats=neutralBlueprint(`${type}-standard`).stats;
 render(<FleetInspection view={view} sectorId={view.battle!.sectorId} selectedShipIds={[]} onClose={()=>{}}/>);
 expect(screen.getByText('Standard defender blueprint')).toBeInTheDocument();
 const weapons=screen.getByRole('group',{name:'Neutral ship weapons'});
 expect(within(weapons).getByText(`${stats.weapons[0].dice} dice per ship`)).toBeInTheDocument();
 expect(within(weapons).getByText('1 damage per hit')).toBeInTheDocument();
 expect(weapons.querySelectorAll('.dg-eclipse-die')).toHaveLength(stats.weapons[0].dice);
 if(type==='gcds')expect(screen.getByRole('heading',{name:'Galactic Center Defense System'})).toBeInTheDocument();
});
