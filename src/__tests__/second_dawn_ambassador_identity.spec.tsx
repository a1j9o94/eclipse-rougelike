// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import type {PendingDecision} from '../../shared/eclipse/types';
import DecisionPanel from '../second-dawn-game/DecisionPanel';
import {FACTION_COLORS} from '../second-dawn-game/factionColors';
afterEach(cleanup);
function fixture(){const state=createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});return getPlayerView(state,'a')!;}
const decision:Extract<PendingDecision,{kind:'diplomacy'}>={id:'offer',kind:'diplomacy',owner:'a',proposer:'b',proposerResource:'science',populationSources:['money','materials']};
it('identifies the offering faction with its name, emblem and public color before the response',()=>{
 const submit=vi.fn();render(<DecisionPanel view={fixture()} decision={decision} reputation={[]} disabled={false} onSubmit={submit}/>);
 const offer=screen.getByRole('group',{name:'Ambassador offer from Hydran Progress'});
 expect(within(offer).getByRole('heading',{name:'Hydran Progress'})).toBeInTheDocument();expect(within(offer).getByRole('img',{name:'Hydran Progress emblem'})).toBeInTheDocument();expect(offer).toHaveStyle({'--ambassador-faction':FACTION_COLORS.blue});
 expect(within(offer).getByText(/science population cube/)).toBeInTheDocument();expect(submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('radio',{name:'Materials'}));fireEvent.click(screen.getByRole('button',{name:'Accept ambassadors'}));expect(submit).toHaveBeenCalledWith({type:'resolve',decisionId:'offer',choice:{kind:'diplomacy',accept:true,resource:'materials'}});
});
it('keeps the proposer identity visible while drafting a decline and preserves disabled submission',()=>{
 const view=fixture(),submit=vi.fn();const rendered=render(<DecisionPanel view={view} decision={decision} reputation={[]} disabled={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Decline exchange'}));expect(screen.getByRole('group',{name:'Ambassador offer from Hydran Progress'})).toBeVisible();expect(submit).not.toHaveBeenCalled();
 rendered.rerender(<DecisionPanel view={view} decision={decision} reputation={[]} disabled onSubmit={submit}/>);expect(screen.getByRole('button',{name:'Decline offer'})).toBeDisabled();
});
