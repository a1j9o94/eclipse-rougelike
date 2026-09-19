import {act,cleanup,render,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import DiceRoll3D from '../second-dawn-game/DiceRoll3D';
import type {DiceThrowOptions} from '../second-dawn-game/dice3d/renderer';
const mocks=vi.hoisted(()=>({create:vi.fn(),dispose:vi.fn(),play:vi.fn(),stop:vi.fn()}));
vi.mock('../second-dawn-game/dice3d/renderer',()=>({createDiceThrow:mocks.create}));
vi.mock('../second-dawn-game/dice3d/audio',()=>({playDiceImpact:mocks.play}));
let frame:FrameRequestCallback;
const rolls=[{id:'sound-component',face:6,color:'blue'}];
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();mocks.create.mockReturnValue({dispose:mocks.dispose});mocks.play.mockReturnValue({stop:mocks.stop});vi.stubGlobal('requestAnimationFrame',vi.fn(callback=>{frame=callback;return 1;}));vi.stubGlobal('cancelAnimationFrame',vi.fn());});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('starts at the visible throw and explicit volley skip silences it',async()=>{
 const ui=render(<DiceRoll3D rollId="explicit-skip-sound" rolls={rolls} enabled/>);
 await waitFor(()=>expect(mocks.create).toHaveBeenCalledOnce());expect(mocks.play).not.toHaveBeenCalled();
 act(()=>{(mocks.create.mock.calls[0][0] as DiceThrowOptions).onStarted?.();frame(0);frame(500);});
 expect(mocks.play).toHaveBeenCalledOnce();
 ui.rerender(<DiceRoll3D rollId="explicit-skip-sound" rolls={rolls} enabled={false} skipped/>);
 expect(mocks.stop).toHaveBeenCalled();act(()=>frame(820));expect(mocks.play).toHaveBeenCalledOnce();
});
it('motion can switch off while sound continues independently',async()=>{
 const ui=render(<DiceRoll3D rollId="motion-independent-sound" rolls={rolls} enabled/>);
 await waitFor(()=>expect(mocks.create).toHaveBeenCalledOnce());
 act(()=>{(mocks.create.mock.calls[0][0] as DiceThrowOptions).onStarted?.();frame(0);frame(500);});
 ui.rerender(<DiceRoll3D rollId="motion-independent-sound" rolls={rolls} enabled={false}/>);
 expect(mocks.stop).not.toHaveBeenCalled();act(()=>frame(820));expect(mocks.play).toHaveBeenCalledTimes(2);
 ui.unmount();expect(mocks.stop).toHaveBeenCalled();
});
