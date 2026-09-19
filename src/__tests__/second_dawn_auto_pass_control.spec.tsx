import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import AutoPassControl from '../second-dawn-game/AutoPassControl';
afterEach(cleanup);
it('submits a preference once, waits for saved state, and prevents offline changes',()=>{
 const change=vi.fn(),ui=render(<AutoPassControl enabled={false} paused={false} disabled={false} onChange={change}/>);
 const toggle=screen.getByRole('checkbox',{name:'Auto-pass unless attacked'});
 fireEvent.click(toggle);expect(change).toHaveBeenCalledExactlyOnceWith(true);expect(toggle).not.toBeChecked();
 ui.rerender(<AutoPassControl enabled paused={false} disabled onChange={change}/>);
 expect(toggle).toBeChecked();expect(toggle).toBeDisabled();fireEvent.click(toggle);expect(change).toHaveBeenCalledTimes(1);
});
it('explains attack interruption and provides direct resume without requiring an off/on cycle',()=>{
 const change=vi.fn();render(<AutoPassControl enabled paused disabled={false} onChange={change}/>);
 expect(screen.getByRole('status')).toHaveTextContent('Attacked · reactions restored');
 fireEvent.click(screen.getByRole('button',{name:'Resume auto-pass'}));expect(change).toHaveBeenCalledExactlyOnceWith(true);
});
it('lets the player save their own preference while another player acts, without starting an action',async()=>{
 const {createGame}=await import('../../shared/eclipse/setup');
 const {getPlayerView}=await import('../../shared/eclipse/protocol');
 const {default:Board}=await import('../second-dawn-game/SecondDawnBoard');
 const state=createGame({seed:6,warpPortals:true,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});state.activeSeatId='b';
 const submit=vi.fn(),props={candidates:[],connected:true,busy:false,status:'Saved',onSubmit:submit,onMenu:vi.fn()};
 const ui=render(<Board view={getPlayerView(state,'a')!} {...props}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'Auto-pass unless attacked'}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'set-auto-pass',enabled:true});
 state.seats[0].autoPassUnlessAttacked=true;state.revision++;
 ui.rerender(<Board view={getPlayerView(state,'a')!} {...props}/>);
 expect(screen.getByRole('checkbox',{name:'Auto-pass unless attacked'})).toBeChecked();
 ui.rerender(<Board view={getPlayerView(state,'a')!} {...props} connected={false}/>);
 expect(screen.getByRole('checkbox',{name:'Auto-pass unless attacked'})).toBeDisabled();
});
