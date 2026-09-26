import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import DiceRoll3D from '../second-dawn-game/DiceRoll3D';
import type {DiceThrowOptions} from '../second-dawn-game/dice3d/renderer';
import {DiceRollScopeContext} from '../second-dawn-game/presentationSettings';
const mocks=vi.hoisted(()=>({create:vi.fn(),dispose:vi.fn()}));
vi.mock('../second-dawn-game/dice3d/renderer',()=>({createDiceThrow:mocks.create}));
const rolls=[{id:'d1',face:6,color:'blue'},{id:'d2',face:2,color:'orange'}];
beforeEach(()=>{mocks.create.mockReset();mocks.dispose.mockReset();mocks.create.mockImplementation(()=>({dispose:mocks.dispose}));vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

it('shows every authoritative result immediately when disabled without loading a renderer',()=>{
 render(<DiceRoll3D rollId="off-test" rolls={rolls} enabled={false}/>);
 expect(screen.getByLabelText('Blue die: 6')).toBeInTheDocument();expect(screen.getByLabelText('Orange die: 2')).toBeInTheDocument();
 expect(mocks.create).not.toHaveBeenCalled();expect(document.querySelector('canvas')).toBeNull();
});
it('keeps child action controls usable and rolls only once across rerenders and remounts',async()=>{
 const submit=vi.fn(),complete=vi.fn();
 const {rerender,unmount}=render(<DiceRoll3D rollId="once-test" rolls={rolls} enabled onComplete={complete}><button onClick={submit}>Allocate</button></DiceRoll3D>);
 await waitFor(()=>expect(mocks.create).toHaveBeenCalledOnce());
 fireEvent.click(screen.getByRole('button',{name:'Allocate'}));expect(submit).toHaveBeenCalledOnce();
 rerender(<DiceRoll3D rollId="once-test" rolls={[...rolls]} enabled onComplete={complete}/>);
 expect(mocks.create).toHaveBeenCalledOnce();
 act(()=>{(mocks.create.mock.calls[0][0] as DiceThrowOptions).onSettled();});
 await waitFor(()=>expect(document.querySelector('canvas')).toBeNull());
 expect(complete).toHaveBeenCalledOnce();expect(mocks.dispose).toHaveBeenCalledOnce();
 unmount();render(<DiceRoll3D rollId="once-test" rolls={rolls} enabled/>);
 expect(mocks.create).toHaveBeenCalledOnce();
});
it('preserves static results if WebGL is unavailable',async()=>{
 mocks.create.mockImplementation(()=>{throw new Error('No WebGL');});
 render(<DiceRoll3D rollId="fallback-test" rolls={rolls} enabled/>);
 await waitFor(()=>expect(mocks.create).toHaveBeenCalledOnce());
 expect(screen.getByLabelText('Blue die: 6')).toBeInTheDocument();
 await waitFor(()=>expect(document.querySelector('canvas')).toBeNull());
});
it('skips or disables an active animation with cleanup and a single completion',async()=>{
 const complete=vi.fn();const {rerender}=render(<DiceRoll3D rollId="skip-test" rolls={rolls} enabled onComplete={complete}/>);
 await waitFor(()=>expect(mocks.create).toHaveBeenCalledOnce());
 fireEvent.click(screen.getByRole('button',{name:'Skip dice animation'}));
 expect(document.querySelector('canvas')).toBeNull();expect(mocks.dispose).toHaveBeenCalledOnce();expect(complete).toHaveBeenCalledOnce();
 rerender(<DiceRoll3D rollId="skip-test" rolls={rolls} enabled={false} onComplete={complete}/>);
 rerender(<DiceRoll3D rollId="skip-test" rolls={rolls} enabled onComplete={complete}/>);
 expect(mocks.create).toHaveBeenCalledOnce();expect(complete).toHaveBeenCalledOnce();
});
it('lets an explicit animation setting override the OS reduced-motion default',async()=>{
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 render(<DiceRoll3D rollId="reduced-override" rolls={rolls} enabled/>);
 await waitFor(()=>expect(mocks.create).toHaveBeenCalledOnce());
});
it('isolates repeat IDs by match scope',async()=>{
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const first=render(<DiceRollScopeContext.Provider value="game-a"><DiceRoll3D rollId="same-roll" rolls={rolls} enabled/></DiceRollScopeContext.Provider>);
 await waitFor(()=>expect(mocks.create).toHaveBeenCalledTimes(1));first.unmount();
 render(<DiceRollScopeContext.Provider value="game-b"><DiceRoll3D rollId="same-roll" rolls={rolls} enabled/></DiceRollScopeContext.Provider>);
 await waitFor(()=>expect(mocks.create).toHaveBeenCalledTimes(2));
});

it('disposes immediately when the preference switches off mid-roll',async()=>{
 const complete=vi.fn();const {rerender}=render(<DiceRoll3D rollId="disable-mid-roll" rolls={rolls} enabled onComplete={complete}/>);
 await waitFor(()=>expect(mocks.create).toHaveBeenCalledOnce());
 rerender(<DiceRoll3D rollId="disable-mid-roll" rolls={rolls} enabled={false} onComplete={complete}/>);
 expect(mocks.dispose).toHaveBeenCalledOnce();expect(document.querySelector('canvas')).toBeNull();expect(complete).toHaveBeenCalledOnce();
});

it('cancels a pending lazy renderer import when the result view unmounts',async()=>{
 const {unmount}=render(<DiceRoll3D rollId="cancel-lazy" rolls={rolls} enabled/>);unmount();
 await act(async()=>{await Promise.resolve();});expect(mocks.create).not.toHaveBeenCalled();
});

it('always represents every result even beyond the 3D display budget',()=>{
 const many=Array.from({length:40},(_,i)=>({id:`budget-${i}`,face:i%6+1,color:'red'}));
 render(<DiceRoll3D rollId="large-volley" rolls={many} enabled={false}/>);
 expect(screen.getAllByRole('img')).toHaveLength(40);
});
