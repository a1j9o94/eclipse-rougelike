import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import type {PublicHistoryEntry} from '../../shared/eclipse/history';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
function fixture(){return getPlayerView(createGame({seed:13,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;}
const controls={candidates:[],connected:true,busy:false,status:'',onSubmit:vi.fn(),onMenu:vi.fn(),aiFailure:null,onRetryAi:vi.fn()};
const feed=(entries:PublicHistoryEntry[])=>({entries,loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:vi.fn()});
afterEach(()=>{cleanup();localStorage.clear();});
it('automatically shows a public AI action, allows opting out, and restores the human inspector',()=>{
 const initial=fixture();const rendered=render(<SecondDawnBoard {...controls} view={initial} history={feed([])}/>);
 const ai=structuredClone(initial);ai.activeSeatId='b';ai.revision=1;const entry:PublicHistoryEntry={revision:1,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Researched Improved Hull',details:[],presentation:{kind:'research',technologyId:'improved-hull'}};
 rendered.rerender(<SecondDawnBoard {...controls} view={ai} history={feed([entry])}/>);
 expect(screen.getByRole('region',{name:'AI action details'})).toHaveTextContent('Improved Hull');
 fireEvent.click(screen.getByRole('button',{name:'Follow AI',exact:true}));expect(screen.queryByRole('region',{name:'AI action details'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Follow AI',exact:true}));expect(screen.getByRole('region',{name:'AI action details'})).toBeVisible();
 rendered.rerender(<SecondDawnBoard {...controls} view={{...ai,revision:2,activeSeatId:'a'}} history={feed([entry])}/>);expect(screen.queryByRole('region',{name:'AI action details'})).toBeNull();expect(screen.getByRole('button',{name:'Explore',exact:true})).toBeEnabled();
});
