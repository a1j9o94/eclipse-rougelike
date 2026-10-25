import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import CombatAutomationControl from '../second-dawn-game/CombatAutomationControl';
import {CombatVolleyAllocator} from '../second-dawn-game/CombatDecisionVisuals';
import type {PlayerView,PendingDecision} from '../../shared/eclipse/types';
afterEach(cleanup);
function fixture():PlayerView {
 const v=getPlayerView(createGame({seed:1,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]}),'a')!;
 const sectorId=v.ships.find(ship=>ship.owner==='a')!.sectorId;
 v.phase='combat';v.battle={id:'battle',sectorId,attacker:'a',defender:'b',stage:'engagement',engagement:1};
 v.pendingDecision={id:'turn',owner:'a',kind:'combat-turn',battleId:'battle',shipType:'interceptor',destinationIds:[]};return v;
}
it('offers explicit battle-specific enable, pause and resume controls',()=>{
 const view=fixture(),onChange=vi.fn();
 const {rerender}=render(<CombatAutomationControl view={view} status={null} disabled={false} onChange={onChange}/>);
 fireEvent.click(screen.getByRole('button',{name:'Auto fight'}));expect(onChange).toHaveBeenLastCalledWith(true);
 rerender(<CombatAutomationControl view={view} status={{battleId:'battle',status:'running',reason:null,controlVersion:1}} disabled={false} onChange={onChange}/>);
 fireEvent.click(screen.getByRole('button',{name:'Pause Auto fight'}));expect(onChange).toHaveBeenLastCalledWith(false);
 rerender(<CombatAutomationControl view={view} status={{battleId:'battle',status:'paused',reason:'ship-loss',controlVersion:1}} disabled={false} onChange={onChange}/>);
 expect(screen.getByRole('status')).toHaveTextContent('Ship lost');
 fireEvent.click(screen.getByRole('button',{name:'Resume Auto fight'}));expect(onChange).toHaveBeenLastCalledWith(true);
});
it('keeps special choices explicit and hides controls for uninvolved players',()=>{
 const view=fixture(),onChange=vi.fn();view.pendingDecision={id:'joker',owner:'a',kind:'super-joker',battleId:'battle',dice:[],remaining:1};
 const {rerender}=render(<CombatAutomationControl view={view} status={{battleId:'battle',status:'paused',reason:'special-decision',controlVersion:1}} disabled={false} onChange={onChange}/>);
 expect(screen.getByRole('button',{name:'Resume Auto fight'})).toBeDisabled();
 rerender(<CombatAutomationControl view={{...view,viewerSeatId:'spectator'}} status={null} disabled={false} onChange={onChange}/>);
 expect(screen.queryByRole('button')).toBeNull();
});
it('automatically assigns a manual preview without submitting it',()=>{
 const view=fixture(),target=view.ships.find(ship=>ship.owner==='b')!.id;
 const decision:Extract<PendingDecision,{kind:'combat-allocation'}>={id:'volley',owner:'a',kind:'combat-allocation',battleId:'battle',dice:[{id:'die',face:6,damage:1,targets:[target],hitTargets:[target]}]};
 const setValue=vi.fn();
 render(<CombatVolleyAllocator view={view} decision={decision} targetLabels={{[target]:'Enemy'}} values={{}} setValue={setValue} motionEnabled={false}/>);
 fireEvent.click(screen.getByRole('button',{name:'Auto assign'}));
 expect(setValue).toHaveBeenCalledWith('die',target);
 expect(screen.getByText('Adjust any assignment before resolving.')).toBeTruthy();
});
