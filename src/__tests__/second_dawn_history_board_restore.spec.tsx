// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(()=>{cleanup();localStorage.clear();});
it('keeps reopened history visible after a rollback remount',()=>{
 const state=createGame({seed:19,warpPortals:false,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 const props={matchId:'history-remount',view:getPlayerView(state,'a')!,candidates:[],connected:true,busy:false,status:'Saved',onSubmit:vi.fn(),onMenu:()=>{},history:{entries:[],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:()=>{}}};
 const ui=render(<SecondDawnBoard {...props} key="before"/>);
 fireEvent.click(screen.getByRole('button',{name:'View turn'}));
 fireEvent.click(screen.getByRole('button',{name:'History',exact:true}));
 expect(screen.getByRole('heading',{name:'Action history'})).toBeVisible();
 ui.rerender(<SecondDawnBoard {...props} key="after" view={{...props.view,revision:3}}/>);
 expect(screen.getByRole('heading',{name:'Action history'})).toBeVisible();
});
