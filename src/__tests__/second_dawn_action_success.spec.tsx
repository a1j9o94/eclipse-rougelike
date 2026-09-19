// @vitest-environment jsdom
import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(cleanup);
it('accepts updated command receipts silently while retaining authoritative submission',()=>{
 const state=createGame({seed:19,warpPortals:false,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 const view=getPlayerView(state,'a')!;const onSubmit=vi.fn();
 const props={view,candidates:legalCommands(view),connected:true,busy:false,status:'Saved',onSubmit,onMenu:()=>{}};
 const ui=render(<SecondDawnBoard {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'View turn'}));
 fireEvent.click(screen.getByRole('button',{name:/^Pass/}));
 expect(onSubmit).toHaveBeenCalledWith({type:'pass'});
 ui.rerender(<SecondDawnBoard {...props} lastAcceptedCommand={{revision:1,type:'pass'}}/>);
 expect(screen.queryByText('Action saved')).toBeNull();
 expect(screen.queryByRole('button',{name:'Dismiss action confirmation'})).toBeNull();
});
