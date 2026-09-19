// @vitest-environment jsdom
import {render,screen,waitFor,fireEvent} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import MovementPlanner from '../second-dawn-game/MovementPlanner';
import {movementBattleEstimate} from '../../shared/eclipse/movementBattleEstimate';
vi.mock('../../shared/eclipse/movementBattleEstimate',()=>({movementBattleEstimate:vi.fn(async()=>({status:'estimate',winPercent:65,lowerPercent:54,upperPercent:75,trials:96,friendlyShips:1,enemyShips:1,defender:false}))}));
function fixture(){const state=createGame({seed:4,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});const source=state.sectors.find(sector=>sector.owner==='a')!,target=state.sectors.find(sector=>sector.owner==='b')!;source.portalVp=1;target.portalVp=1;return {view:getPlayerView(state,'a'),sourceSectorId:source.id,selectedTargetId:target.id,disabled:false,onTargetsChange:vi.fn(),onClose:vi.fn(),onSubmit:vi.fn()};}
describe('optional movement win previews',()=>{
 it('does not calculate or show an estimate unless the game setting enables it',()=>{vi.mocked(movementBattleEstimate).mockClear();render(<MovementPlanner {...fixture()}/>);fireEvent.click(screen.getByRole('checkbox'));expect(screen.queryByLabelText('Estimated combat outcome')).toBeNull();expect(movementBattleEstimate).not.toHaveBeenCalled();});
 it('shows an approximate chance with assumptions beside a selected destination',async()=>{render(<MovementPlanner {...fixture()} showCombatOdds/>);fireEvent.click(screen.getByRole('checkbox'));await waitFor(()=>expect(screen.getByLabelText('Estimated combat outcome')).toHaveTextContent('≈65%'));expect(screen.getByText('Estimate assumptions')).toBeVisible();fireEvent.click(screen.getByText('Estimate assumptions'));expect(screen.getByText(/54–75%/)).toBeVisible();expect(screen.getByText(/not a guarantee/)).toBeVisible();});
});
