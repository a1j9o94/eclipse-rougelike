import {StrictMode} from 'react';
import {act,cleanup,fireEvent,render} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {useDiceRollSound,useDiceAudioActivation} from '../second-dawn-game/dice3d/useDiceRollSound';
const mocks=vi.hoisted(()=>({prepare:vi.fn(),play:vi.fn(),stop:vi.fn()}));
vi.mock('../second-dawn-game/dice3d/audio',()=>({prepareDiceAudio:mocks.prepare,playDiceImpact:mocks.play}));
let frame:FrameRequestCallback;
function Fixture({id='sound',animated=false}:{id?:string;animated?:boolean}) {
 useDiceAudioActivation();const sound=useDiceRollSound(id,3,animated);
 return <><button onClick={sound.start}>Start</button><button onClick={sound.stop}>Skip</button></>;
}
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();mocks.play.mockReturnValue({stop:mocks.stop});vi.stubGlobal('requestAnimationFrame',vi.fn(callback=>{frame=callback;return 1;}));vi.stubGlobal('cancelAnimationFrame',vi.fn());});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function tick(time:number){act(()=>frame(time));}
it('plays sound with animations off after a gesture and stops on skip',()=>{
 const view=render(<Fixture id="independent"/>);fireEvent.pointerDown(view.getByText('Start'));expect(mocks.prepare).toHaveBeenCalled();
 tick(0);tick(500);expect(mocks.play).toHaveBeenCalled();fireEvent.click(view.getByText('Skip'));expect(mocks.stop).toHaveBeenCalled();
});
it('waits for the visible throw to start and does not replay on rerender/remount',()=>{
 const view=render(<Fixture id="once-audio" animated/>);expect(requestAnimationFrame).not.toHaveBeenCalled();
 fireEvent.click(view.getByText('Start'));tick(0);tick(500);const count=mocks.play.mock.calls.length;
 view.rerender(<Fixture id="once-audio" animated/>);tick(501);expect(mocks.play).toHaveBeenCalledTimes(count);
 view.unmount();render(<Fixture id="once-audio"/>);expect(mocks.stop).toHaveBeenCalled();
});
it('stops active voices when muted or hidden and never resumes old impacts',()=>{
 const view=render(<Fixture id="mute-audio"/>);tick(0);tick(500);
 act(()=>{localStorage.setItem('eclipse.second-dawn.dice-sound.v1','off');window.dispatchEvent(new Event('storage'));});
 expect(mocks.stop).toHaveBeenCalled();view.unmount();
 localStorage.clear();mocks.stop.mockClear();render(<Fixture id="hidden-audio"/>);tick(0);tick(500);
 const hidden=vi.spyOn(document,'hidden','get').mockReturnValue(true);act(()=>document.dispatchEvent(new Event('visibilitychange')));expect(mocks.stop).toHaveBeenCalled();hidden.mockRestore();
});
it('does not start sound for an initially muted throw',()=>{
 localStorage.setItem('eclipse.second-dawn.dice-sound.v1','off');render(<Fixture id="muted"/>);expect(requestAnimationFrame).not.toHaveBeenCalled();
});

it('plays sound-only throws under StrictMode and stops on unmount',()=>{
 const view=render(<StrictMode><Fixture id="strict-sound"/></StrictMode>);tick(0);tick(500);expect(mocks.play).toHaveBeenCalled();view.unmount();expect(mocks.stop).toHaveBeenCalled();
});
