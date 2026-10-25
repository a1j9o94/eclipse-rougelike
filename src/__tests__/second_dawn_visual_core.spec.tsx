import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import {previewCommand} from '../../shared/eclipse/commandPreview';
import ActionEconomy from '../second-dawn-game/ActionEconomy';
import Board from '../second-dawn-game/SecondDawnBoard';
import type {GameCommand} from '../../shared/eclipse/types';
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
function fixture(){const state=createGame({seed:42,minorSpecies:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});state.activeSeatId='a';return state;}
it('does not turn an empty action into an economy or validation panel',()=>{
 const view=getPlayerView(fixture(),'a')!;render(<ActionEconomy view={view} action="build" preview={null}/>);
 expect(screen.queryByRole('region',{name:'Action cost preview'})).toBeNull();expect(screen.queryByText(/New action|Round-end forecast/)).toBeNull();
});
it('separates the selected action disc from deferred upkeep without a rules paragraph',()=>{
 const state=fixture();state.seats[0].influenceOnTrack=9;const view=getPlayerView(state,'a')!,command=legalCommands(view).find(candidate=>candidate.command.type==='explore')!.command;
 render(<ActionEconomy view={view} action="explore" preview={previewCommand(view,command)}/>);
 const strip=screen.getByRole('region',{name:'Action cost preview'});
 expect(within(strip).getByText('Pay now')).toBeVisible();expect(within(strip).getByLabelText('1 influence disc')).toBeVisible();
 expect(within(strip).getByText('Round end')).toBeVisible();expect(strip.querySelector('p')).toBeNull();expect(screen.queryByText('Round-end forecast')).toBeNull();
});
it('does not invent another disc cost for a continuing Explore activation',()=>{
 const state=fixture();state.engine!.action={owner:'a',action:'explore',remaining:1};const view=getPlayerView(state,'a')!,command={type:'explore',position:{q:2,r:0}} as const;
 render(<ActionEconomy view={view} action="explore" preview={previewCommand(view,command)}/>);
 expect(screen.queryByLabelText('1 influence disc')).toBeNull();
});
it.each([false,true])('keeps Recruit allies with the other actions without a header row, mobile=%s',mobile=>{
 vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:mobile&&query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const view=getPlayerView(fixture(),'a')!;render(<Board view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 if(mobile)fireEvent.click(screen.getByRole('button',{name:'Choose action'}));
 const actions=screen.getByRole('group',{name:'Other actions'});expect(within(actions).getByRole('button',{name:/Recruit allies/})).toBeVisible();
 expect(screen.getAllByRole('button',{name:/Recruit allies/})).toHaveLength(1);
 fireEvent.click(within(actions).getByRole('button',{name:/Recruit allies/}));expect(screen.getByRole('heading',{name:/Recruit an ally/})).toBeVisible();
});
it('presents a selected frontier without leaking the engine description',()=>{
 const view=getPlayerView(fixture(),'a')!,candidate=legalCommands(view).find(c=>c.command.type==='explore')!;
 localStorage.setItem('eclipse.second-dawn.drafts.v1:visual-core:a',JSON.stringify({version:1,matchId:'visual-core',viewerSeatId:'a',values:{action:{revision:view.revision,value:'explore'},exploreDraft:{revision:view.revision,value:candidate}}}));
 const submit=vi.fn<(command:GameCommand)=>void>();render(<Board matchId="visual-core" view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
 expect(screen.queryByText(/hidden draw is committed/)).toBeNull();expect(screen.queryByText(/New action ·/)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Draw sector'}));expect(submit).toHaveBeenCalledWith(candidate.command);
});
it('keeps an auxiliary Colonize choice from sharing its commit area with the open main action',()=>{
 vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 const state=fixture();state.engine!.action={owner:'a',action:'explore',remaining:1};state.sectors.find(sector=>sector.owner==='a')!.population.pop();
 const view=getPlayerView(state,'a')!;render(<Board view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Choose action'}));fireEvent.click(within(screen.getByRole('group',{name:'Other actions'})).getByRole('button',{name:/Colonize/}));
 expect(screen.getByRole('region',{name:'Colonization planner'})).toBeVisible();expect(screen.queryByRole('button',{name:'Done exploring'})).toBeNull();
});
