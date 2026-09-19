// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import type {GameState,PlayerView} from '../../shared/eclipse/types';
import type {ReactNode} from 'react';
import reviewFixtures from '../second-dawn-game/reviewFixtures.json?raw';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';

vi.mock('../second-dawn-game/DiceRoll3D',()=>({default:({enabled,children}:{enabled:boolean;children?:ReactNode})=><div data-testid="choice-dice" data-enabled={String(enabled)}>{children}</div>}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function fixture(discovery=true){
 const state=createGame({seed:19,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});
 if(discovery)state.pendingDecision={id:'discovery-1',owner:'a',kind:'discovery',tileId:'money',options:['keep','use'],sectorId:state.sectors.find(s=>s.owner==='a')!.id};
 return getPlayerView(state,'a')!;
}
function props(view:PlayerView){return {view,candidates:legalCommands(view),connected:true,busy:false,status:'',onSubmit:vi.fn(),onMenu:vi.fn()};}
it('preserves a discovery choice while inspecting opponent blueprints and provides a named return',()=>{
 const p=props(fixture());render(<SecondDawnBoard {...p}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Keep for 2 VP'}));
 fireEvent.click(screen.getByRole('button',{name:/Hydran Progress Human/}));
 fireEvent.click(screen.getByRole('button',{name:'Inspect Interceptor blueprint'}));
 expect(screen.getByRole('heading',{name:'Ship blueprints'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Return to discovery'}));
 expect(screen.getByRole('radio',{name:'Keep for 2 VP'})).toBeChecked();
 expect(p.onSubmit).not.toHaveBeenCalled();
});
it('minimizes a choice to the galaxy without losing its draft or submitting',()=>{
 const p=props(fixture());render(<SecondDawnBoard {...p}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Keep for 2 VP'}));
 fireEvent.click(screen.getByRole('button',{name:'Minimize discovery'}));
 expect(screen.getByRole('group',{name:'Galaxy map'})).toBeVisible();
 expect(screen.queryByRole('radio',{name:'Keep for 2 VP'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Return to discovery'}));
 expect(screen.getByRole('radio',{name:'Keep for 2 VP'})).toBeChecked();
 expect(p.onSubmit).not.toHaveBeenCalled();
});
it('opens a new authoritative choice, but leaves same-choice revisions minimized',()=>{
 const view=fixture(),p=props(view),rendered=render(<SecondDawnBoard {...p}/>);
 fireEvent.click(screen.getByRole('button',{name:'Minimize discovery'}));
 rendered.rerender(<SecondDawnBoard {...p} view={{...view,revision:view.revision+1}}/>);
 expect(screen.getByRole('button',{name:'Return to discovery'})).toBeVisible();
 const next={...view,revision:view.revision+2,pendingDecision:{...view.pendingDecision!,id:'discovery-2'}};
 rendered.rerender(<SecondDawnBoard {...p} view={next}/>);
 expect(screen.getByRole('dialog',{name:'Discovery choice'})).toBeVisible();
 expect(screen.getByRole('radio',{name:'Keep for 2 VP'})).not.toBeChecked();
});
it('starts with the desktop inspector collapsed and lets players expand and close it',()=>{
 const {container}=render(<SecondDawnBoard {...props(fixture(false))}/>);
 const toggle=screen.getByRole('button',{name:'Show sector details'});
 expect(toggle).toHaveAttribute('aria-expanded','false');
 expect(container.querySelector('.dg-inspector-collapsed')).not.toBeNull();
 fireEvent.click(toggle);
 expect(screen.getByRole('complementary',{name:'Selection and action details'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Hide sector details'}));
 expect(screen.queryByRole('complementary',{name:'Selection and action details'})).toBeNull();
});
it('opens the inspector for a spatial action so collapsing never hides required inputs',()=>{
 render(<SecondDawnBoard {...props(fixture(false))}/>);
 fireEvent.click(screen.getByRole('button',{name:'Move',exact:true}));
 expect(screen.getByRole('complementary',{name:'Selection and action details'})).toBeVisible();
});
it('Escape minimizes the choice and restores focus to its named return',()=>{
 render(<SecondDawnBoard {...props(fixture())}/>);
 fireEvent.keyDown(screen.getByRole('dialog',{name:'Discovery choice'}),{key:'Escape'});
 expect(screen.getByRole('button',{name:'Return to discovery'})).toHaveFocus();
});
it('closing a fleet inspection does not minimize or clear the underlying discovery',()=>{
 render(<SecondDawnBoard {...props(fixture())}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Keep for 2 VP'}));
 fireEvent.click(screen.getByRole('button',{name:'Inspect location'}));
 fireEvent.keyDown(screen.getByRole('dialog',{name:/Fleet inspection/}),{key:'Escape'});
 expect(screen.getByRole('dialog',{name:'Discovery choice'})).toBeVisible();
 expect(screen.getByRole('radio',{name:'Keep for 2 VP'})).toBeChecked();
});
it('opens History from a choice while retaining an obvious return and its selected reward',()=>{
 render(<SecondDawnBoard {...props(fixture())}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Keep for 2 VP'}));
 fireEvent.click(screen.getByRole('button',{name:'History',exact:true}));
 expect(screen.getByRole('complementary',{name:'Selection and action details'})).toBeVisible();
 expect(screen.getByRole('button',{name:'Return to discovery'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Return to discovery'}));
 expect(screen.getByRole('radio',{name:'Keep for 2 VP'})).toBeChecked();
});
it('stops the hidden combat choice from throwing dice across an inspection screen',()=>{
 const state=(JSON.parse(reviewFixtures) as Record<string,GameState>).combat;
 render(<SecondDawnBoard {...props(getPlayerView(state,state.pendingDecision!.owner)!)}/>);
 expect(screen.getAllByTestId('choice-dice').some(die=>die.dataset.enabled==='true')).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Minimize combat allocation'}));
 expect(screen.getAllByTestId('choice-dice').every(die=>die.dataset.enabled==='false')).toBe(true);
 expect(screen.getByRole('button',{name:'Return to combat allocation'})).toBeVisible();
});
it('shows a fresh destruction result inside the active choice and clears it when play advances',()=>{
 const initial=fixture();
 const ui=render(<SecondDawnBoard {...props(initial)}/>);
 const view={...initial,revision:initial.revision+1};
 const history={entries:[{revision:view.revision,actorSeatId:'b',actorName:'Hydran Progress',round:view.round,summary:'Resolved volley',details:[],combatVolley:{battleId:'finished',attacker:'b',dice:[],impacts:[],targets:[{id:'lost',shipType:'cruiser' as const,owner:'a',hpBefore:2,hpAfter:0,excess:0,destroyed:true}]}}],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:vi.fn()};
 ui.rerender(<SecondDawnBoard {...props(view)} history={history}/>);
 expect(within(screen.getByRole('dialog',{name:'Discovery choice'})).getByRole('group',{name:'Cruiser destroyed'})).toBeVisible();
 ui.rerender(<SecondDawnBoard {...props({...view,revision:view.revision+1})} history={history}/>);
 expect(screen.queryByRole('button',{name:'Dismiss battle results'})).toBeNull();
});

it.each(['Research','Upgrade','Convert'])('keeps mobile %s controls in their workspace without a redundant Details button',action=>{
 vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 render(<SecondDawnBoard {...props(fixture(false))}/>);
 fireEvent.click(screen.getByRole('button',{name:'Choose action',exact:true}));
 fireEvent.click(within(screen.getByRole('group',{name:'Choose your action'})).getByRole('button',{name:new RegExp(`^${action}`)}));
 expect(screen.queryByRole('button',{name:'Details',exact:true})).toBeNull();
 expect(within(screen.getByRole('navigation',{name:'Current action'})).getByRole('button',{name:'Back'})).toBeVisible();
});
it('keeps details in the toolbar and consolidates fleet inspection inside sector details',()=>{
 const view=fixture(false),p=props(view);
 const sector=view.sectors.find(s=>s.owner===view.viewerSeatId)!;
 const {container}=render(<SecondDawnBoard {...p} initialSectorId={sector.id}/>);
 const follow=screen.getByRole('button',{name:'Follow AI',exact:true});
 const bar=follow.closest('.dg-ai-activity');expect(bar).not.toBeNull();
 const hide=screen.getByRole('button',{name:'Hide sector details'});
 expect(hide.closest('.dg-ai-activity')).toBe(bar);
 expect(screen.queryByRole('button',{name:'Inspect fleet in selected sector'})).toBeNull();
 const inspector=screen.getByRole('complementary',{name:'Selection and action details'});
 const inspect=within(inspector).getByRole('button',{name:'Inspect fleet',exact:true});
 expect(within(inspector).queryByRole('button',{name:'Inspect capabilities'})).toBeNull();
 expect(inspect.closest('.dg-ai-activity')).toBeNull();
 expect(container.querySelector('.sd-map-heading button')).toBeNull();
 fireEvent.click(inspect);expect(screen.getByRole('button',{name:'Return to plan'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Return to plan'}));
 fireEvent.click(hide);expect(screen.queryByRole('button',{name:'Inspect fleet',exact:true})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Research',exact:true}));
 expect(screen.queryByRole('button',{name:'Show sector details'})).toBeNull();
});

it('offers Convert without a standalone reputation discard action',()=>{
 const view=fixture(false);view.private.reputation=[3,4];
 render(<SecondDawnBoard {...props(view)}/>);
 const actions=screen.getByLabelText('Available actions');
 expect(within(actions).queryByRole('button',{name:'Discard reputation'})).toBeNull();
 fireEvent.click(within(actions).getByRole('button',{name:'Convert',exact:true}));
 expect(screen.getByRole('heading',{name:'Convert resources'})).toBeVisible();
 expect(screen.getByRole('button',{name:'Confirm conversion'})).toBeVisible();
});
