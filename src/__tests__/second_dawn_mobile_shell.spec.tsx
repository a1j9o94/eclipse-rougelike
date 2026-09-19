import{afterEach,beforeEach,expect,it,vi}from'vitest';
import{fireEvent,render,screen,within}from'@testing-library/react';
import{createGame}from'../../shared/eclipse/setup';
import{getPlayerView}from'../../shared/eclipse/protocol';
import{legalCommands}from'../../shared/eclipse/legal';
import type{GameState}from'../../shared/eclipse/types';
import fixtures from'../second-dawn-game/reviewFixtures.json?raw';
import Board from'../second-dawn-game/SecondDawnBoard';
beforeEach(()=>{vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));});
afterEach(()=>vi.unstubAllGlobals());
function setup(state=createGame({seed:81,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]})){
 const view=getPlayerView(state,state.pendingDecision?.owner??state.seats[0].id)!;
 return render(<Board view={view} candidates={legalCommands(view)} connected busy={false} status="Saved" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
}
it('uses a compact Galaxy-first shell with Empire, Players and Activity navigation',()=>{
 setup();const nav=screen.getByRole('navigation',{name:'Mobile game navigation'});
 expect(within(nav).getByRole('button',{name:'Galaxy'})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(within(nav).getByRole('button',{name:'Empire'}));
 expect(screen.getByRole('heading',{name:'Eridani Empire'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Research technology'}));
 expect(screen.getByRole('heading',{name:'Research',exact:true})).toBeInTheDocument();
 fireEvent.click(screen.getAllByRole('button',{name:/×/})[0]);
 expect(document.querySelector('.dg-mobile-sheet')).toHaveAttribute('data-sheet-state','closed');
 expect(screen.getByRole('region',{name:/Research /})).toBeVisible();
});
it('opens actions as one visual chooser and returns to map selection for movement',()=>{
 setup();fireEvent.click(screen.getByRole('button',{name:'Choose action'}));
 const picker=screen.getByRole('group',{name:'Choose your action'});
 fireEvent.click(within(picker).getByRole('button',{name:/Move/}));
 expect(screen.getByRole('group',{name:'Galaxy map'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Expand Move details'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Expand Move details'}));
 expect(screen.getByRole('region',{name:'Move fleet'})).toBeInTheDocument();
});
it('keeps the build tray visible below the galaxy on mobile and starts global Build unplaced',()=>{
 const rendered=setup();fireEvent.click(screen.getByRole('button',{name:'Choose action'}));const picker=screen.getByRole('group',{name:'Choose your action'});fireEvent.click(within(picker).getByRole('button',{name:/Build/}));
 expect(screen.getByRole('group',{name:'Galaxy map'})).toBeVisible();expect(screen.getByRole('region',{name:'Assemble your build order'})).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Add interceptor'}));expect(screen.getByRole('button',{name:/1. Interceptor Unplaced/})).toBeVisible();expect(rendered.container.querySelector('.dg-mobile-sheet')).toHaveAttribute('data-sheet-state','closed');
});
it('prioritizes the saved pending decision and keeps a direct return after inspection',()=>{
 const state=(JSON.parse(fixtures)as Record<string,GameState>).combat;setup(state);
 expect(screen.getByRole('heading',{name:/Combat allocation/i})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Empire',exact:true}));
 expect(screen.getByRole('button',{name:'Return to combat allocation'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Return to combat allocation'}));
 expect(screen.getByRole('heading',{name:/Combat allocation/i})).toBeInTheDocument();
});
it('opens one compact sector sheet that can expand and dismiss',()=>{
 setup();fireEvent.click(screen.getAllByRole('button',{name:/^Inspect sector/})[0]);
 const sheet=screen.getByRole('complementary',{name:'Selection and action details'});
 expect(sheet).toHaveAttribute('data-sheet-state','peek');
 fireEvent.click(screen.getByRole('button',{name:/Expand Sector/}));expect(sheet).toHaveAttribute('data-sheet-state','expanded');
 fireEvent.click(screen.getByRole('button',{name:'Dismiss details'}));expect(sheet).toHaveAttribute('data-sheet-state','closed');
});

it('preserves manual mobile inspection when another AI seat starts acting',()=>{
 const initial=getPlayerView(createGame({seed:81,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;
 const controls={candidates:[],connected:true,busy:false,status:'Saved',onSubmit:vi.fn(),onMenu:vi.fn()};
 const rendered=render(<Board {...controls} view={initial}/>);
 fireEvent.click(screen.getByRole('button',{name:'Empire',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Research technology'}));
 const history={entries:[{revision:1,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Researched Improved Hull',details:[],presentation:{kind:'research' as const,technologyId:'improved-hull' as const}}],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:vi.fn()};
 rendered.rerender(<Board {...controls} view={{...initial,activeSeatId:'b',revision:1}} history={history}/>);
 expect(rendered.container.querySelector('.dg-mobile-sheet')).toHaveAttribute('data-sheet-state','closed');
 expect(screen.queryByRole('region',{name:'AI action details'})).toBeNull();
});
it('keeps a server rejection visible in the mobile shell',()=>{
 const view=getPlayerView(createGame({seed:81,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;
 render(<Board view={view} candidates={[]} connected busy={false} status="Command rejected: refresh the game." onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 expect(screen.getByText('Command rejected: refresh the game.')).toBeVisible();
});
it('provides a reachable AI recovery button on mobile and disables it while offline',()=>{
 const view=getPlayerView(createGame({seed:81,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;
 const retry=vi.fn();const props={view,candidates:[],busy:false,status:'',onSubmit:vi.fn(),onMenu:vi.fn(),aiFailure:'AI job interrupted.',onRetryAi:retry};
 const rendered=render(<Board {...props} connected/>);
 expect(screen.getByText('AI job interrupted.')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'AI paused · retry'}));expect(retry).toHaveBeenCalledOnce();
 rendered.rerender(<Board {...props} connected={false}/>);expect(screen.getByRole('button',{name:'AI paused · retry'})).toBeDisabled();
});
it('resumes automatic AI following after an acknowledged human end-action without overriding unacknowledged inspection',()=>{
 const initial=getPlayerView(createGame({seed:81,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;
 const controls={candidates:[],connected:true,busy:false,status:'Saved',onSubmit:vi.fn(),onMenu:vi.fn()};
 const rendered=render(<Board {...controls} view={initial}/>);
 fireEvent.click(screen.getByRole('button',{name:'Empire',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Research technology'}));
 const history={entries:[{revision:2,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Researched Improved Hull',details:[],presentation:{kind:'research' as const,technologyId:'improved-hull' as const}}],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:vi.fn()};
 const oldSheet=rendered.container.querySelector<HTMLElement>('.dg-mobile-sheet-body')!;oldSheet.scrollTop=160;
 rendered.rerender(<Board {...controls} view={{...initial,activeSeatId:'b',revision:2}} history={history} lastAcceptedCommand={{revision:1,type:'end-action'}}/>);
 expect(rendered.container.querySelector('.dg-mobile-board')).toHaveAttribute('data-mobile-screen','Galaxy');
 expect(rendered.container.querySelector('.dg-mobile-sheet')).toHaveAttribute('data-sheet-state','peek');
 fireEvent.click(screen.getByRole('button',{name:'Expand AI action details'}));
 expect(oldSheet.scrollTop).toBe(0);
 expect(screen.getByRole('region',{name:'AI action details'})).toBeInTheDocument();
});

it('opens Upgrade directly on the player blueprint and keeps the details sheet closed',()=>{
 const rendered=setup();fireEvent.click(screen.getByRole('button',{name:'Choose action'}));
 fireEvent.click(within(screen.getByRole('group',{name:'Choose your action'})).getByRole('button',{name:/^Upgrade/}));
 expect(screen.getByRole('heading',{name:/^Edit interceptor$/i})).toBeInTheDocument();
 expect(screen.getByRole('group',{name:'Blueprint hardpoints'})).toBeVisible();
 expect(rendered.container.querySelector('.dg-mobile-sheet')).toHaveAttribute('data-sheet-state','closed');
 expect(screen.queryByRole('dialog')).toBeNull();
});

it('shows the available first-pass money directly in the mobile action choice',()=>{
 setup();fireEvent.click(screen.getByRole('button',{name:'Choose action'}));
 const picker=screen.getByRole('group',{name:'Choose your action'});
 expect(within(picker).getByRole('button',{name:/^Pass \+2 money/})).toBeEnabled();
});
