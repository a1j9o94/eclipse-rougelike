import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import type {PublicHistoryEntry} from '../../shared/eclipse/history';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
function fixture(){return getPlayerView(createGame({seed:13,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;}
const controls={candidates:[],connected:true,busy:false,status:'',onSubmit:vi.fn(),onMenu:vi.fn(),aiFailure:null,onRetryAi:vi.fn()};
const feed=(entries:PublicHistoryEntry[])=>({entries,loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:vi.fn()});
afterEach(()=>{cleanup();localStorage.clear();});
it('keeps inspector navigation in the board toolbar with one details toggle',()=>{
 const initial=fixture(),rendered=render(<SecondDawnBoard {...controls} view={initial} history={feed([])}/>);
 const entry:PublicHistoryEntry={revision:1,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Researched Improved Hull',details:[],presentation:{kind:'research',technologyId:'improved-hull'}};
 rendered.rerender(<SecondDawnBoard {...controls} view={{...initial,activeSeatId:'b',revision:1}} history={feed([entry])}/>);
 const toolbar=screen.getByRole('button',{name:'Hide sector details'}).closest<HTMLElement>('.dg-ai-activity')!;
 const back=within(toolbar).getByRole('button',{name:'Return to inspector'});
 expect(screen.queryByRole('button',{name:'Close details'})).toBeNull();
 expect(within(toolbar).getByRole('button',{name:'Hide sector details'})).toBeVisible();
 fireEvent.click(back);expect(screen.queryByRole('region',{name:'AI action details'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Return to inspector'})).toBeNull();
 expect(screen.getByRole('complementary',{name:'Selection and action details'})).toHaveFocus();
});
it('automatically shows a public AI action, allows opting out, and restores the human inspector',()=>{
 const initial=fixture();const rendered=render(<SecondDawnBoard {...controls} view={initial} history={feed([])}/>);
 const ai=structuredClone(initial);ai.activeSeatId='b';ai.revision=1;const entry:PublicHistoryEntry={revision:1,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Researched Improved Hull',details:[],presentation:{kind:'research',technologyId:'improved-hull'}};
 rendered.rerender(<SecondDawnBoard {...controls} view={ai} history={feed([entry])}/>);
 expect(screen.getByRole('region',{name:'AI action details'})).toHaveTextContent('Improved Hull');
 fireEvent.click(screen.getByRole('button',{name:'Follow AI',exact:true}));expect(screen.queryByRole('region',{name:'AI action details'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Follow AI',exact:true}));expect(screen.getByRole('region',{name:'AI action details'})).toBeVisible();
 rendered.rerender(<SecondDawnBoard {...controls} view={{...ai,revision:2,activeSeatId:'a'}} history={feed([entry])}/>);expect(screen.queryByRole('region',{name:'AI action details'})).toBeNull();expect(screen.getByRole('button',{name:'Explore',exact:true})).toBeEnabled();
});

it('keeps a manually closed AI panel closed through further actions and unrelated revisions',()=>{
 const initial=fixture(),rendered=render(<SecondDawnBoard {...controls} view={initial} history={feed([])}/>);
 const entry:PublicHistoryEntry={revision:1,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Researched Improved Hull',details:[],presentation:{kind:'research',technologyId:'improved-hull'}};
 const ai={...initial,activeSeatId:'b',revision:1};
 rendered.rerender(<SecondDawnBoard {...controls} view={ai} history={feed([entry])}/>);
 expect(screen.getByRole('region',{name:'AI action details'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Hide sector details'}));
 expect(screen.getByRole('button',{name:'Show sector details'})).toHaveFocus();
 rendered.rerender(<SecondDawnBoard {...controls} view={{...ai,revision:2}} history={feed([{...entry,revision:2},entry])}/>);
 expect(screen.queryByRole('region',{name:'AI action details'})).toBeNull();
 expect(screen.getByRole('button',{name:'Show sector details'})).toHaveAttribute('aria-expanded','false');
});

it('does not interrupt manual public blueprint inspection when another AI action arrives',()=>{
 const initial=fixture(),rendered=render(<SecondDawnBoard {...controls} view={initial} history={feed([])}/>);
 fireEvent.click(screen.getByRole('button',{name:/Hydran Progress Normal AI/}));
 fireEvent.click(screen.getByRole('button',{name:'Inspect Interceptor blueprint'}));
 const entry:PublicHistoryEntry={revision:1,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Researched Improved Hull',details:[],presentation:{kind:'research',technologyId:'improved-hull'}};
 rendered.rerender(<SecondDawnBoard {...controls} view={{...initial,activeSeatId:'b',revision:1}} history={feed([entry])}/>);
 expect(screen.getByRole('heading',{name:'Ship blueprints'})).toBeVisible();
 expect(screen.queryByRole('region',{name:'AI action details'})).toBeNull();
});

it('keeps the close preference when control passes to a different AI seat',()=>{
 const initial=getPlayerView(createGame({seed:13,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'},{id:'c',faction:'planta',controller:'ai'}]}),'a')!;
 const rendered=render(<SecondDawnBoard {...controls} view={initial} history={feed([])}/>);
 const entry:PublicHistoryEntry={revision:1,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Researched Improved Hull',details:[],presentation:{kind:'research',technologyId:'improved-hull'}};
 rendered.rerender(<SecondDawnBoard {...controls} view={{...initial,activeSeatId:'b',revision:1}} history={feed([entry])}/>);
 fireEvent.click(screen.getByRole('button',{name:'Hide sector details'}));
 rendered.rerender(<SecondDawnBoard {...controls} view={{...initial,activeSeatId:'c',revision:2}} history={feed([{...entry,revision:2,actorSeatId:'c',actorName:'Planta'},entry])}/>);
 expect(screen.queryByRole('region',{name:'AI action details'})).toBeNull();
 expect(screen.getByRole('button',{name:'Show sector details'})).toHaveAttribute('aria-expanded','false');
});

it('changing Follow AI during your turn does not open an empty inspector',()=>{
 render(<SecondDawnBoard {...controls} view={fixture()} history={feed([])}/>);
 fireEvent.click(screen.getByRole('button',{name:'Follow AI',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Follow AI',exact:true}));
 expect(screen.getByRole('button',{name:'Show sector details'})).toHaveAttribute('aria-expanded','false');
});
