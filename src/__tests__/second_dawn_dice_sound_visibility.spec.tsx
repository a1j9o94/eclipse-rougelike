import {act,cleanup,render} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import ChoiceWorkspace from '../second-dawn-game/ChoiceWorkspace';
import DiceRoll3D from '../second-dawn-game/DiceRoll3D';
import type {PendingDecision} from '../../shared/eclipse/types';

const mocks=vi.hoisted(()=>({play:vi.fn(),stop:vi.fn()}));
vi.mock('../second-dawn-game/dice3d/audio',()=>({prepareDiceAudio:vi.fn(),playDiceImpact:mocks.play}));
const decision:PendingDecision={id:'visible-combat',owner:'a',kind:'discovery',tileId:'money',options:['keep','use'],sectorId:'home'};
let frame:FrameRequestCallback;
function Fixture({open,id}:{open:boolean;id:string}){
 return <ChoiceWorkspace decision={decision} open={open} onMinimize={()=>{}}><DiceRoll3D enabled={false} rollId={id} rolls={[{id:'die',face:3,color:'yellow'}]}/></ChoiceWorkspace>;
}
beforeEach(()=>{
 localStorage.clear();vi.clearAllMocks();mocks.play.mockReturnValue({stop:mocks.stop});
 vi.stubGlobal('requestAnimationFrame',vi.fn(callback=>{frame=callback;return 1;}));vi.stubGlobal('cancelAnimationFrame',vi.fn());
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function tick(now:number){act(()=>frame(now));}
it('stops a mounted choice when minimized and does not replay it on return',()=>{
 const rendered=render(<Fixture open id="hide-active-roll"/>);tick(0);tick(500);expect(mocks.play).toHaveBeenCalled();
 rendered.rerender(<Fixture open={false} id="hide-active-roll"/>);expect(mocks.stop).toHaveBeenCalled();
 const count=mocks.play.mock.calls.length;tick(820);expect(mocks.play).toHaveBeenCalledTimes(count);
 rendered.rerender(<Fixture open id="hide-active-roll"/>);tick(1100);expect(mocks.play).toHaveBeenCalledTimes(count);
});
it('waits until first reveal when a new choice initially renders hidden',()=>{
 const rendered=render(<Fixture open={false} id="initially-hidden-roll"/>);
 expect(requestAnimationFrame).not.toHaveBeenCalled();
 rendered.rerender(<Fixture open id="initially-hidden-roll"/>);tick(0);tick(500);expect(mocks.play).toHaveBeenCalled();
});
it('still plays a new visible roll with animations disabled after returning',()=>{
 const rendered=render(<Fixture open={false} id="old-hidden-roll"/>);
 rendered.rerender(<Fixture open id="new-visible-roll"/>);tick(0);tick(500);expect(mocks.play).toHaveBeenCalled();
});
