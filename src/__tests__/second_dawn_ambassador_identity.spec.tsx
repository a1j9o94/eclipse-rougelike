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
 expect(screen.getByRole('radio',{name:'Accept exchange'})).toHaveAttribute('aria-checked','false');
 expect(screen.getByRole('radio',{name:'Decline exchange'})).toHaveAttribute('aria-checked','false');
 expect(screen.getByRole('button',{name:'Choose accept or decline'})).toBeDisabled();
 fireEvent.click(screen.getByRole('radio',{name:'Accept exchange'}));
 fireEvent.click(screen.getByRole('radio',{name:'Materials'}));fireEvent.click(screen.getByRole('button',{name:'Accept ambassadors'}));expect(submit).toHaveBeenCalledWith({type:'resolve',decisionId:'offer',choice:{kind:'diplomacy',accept:true,resource:'materials'}});
});
it('keeps the proposer identity visible while drafting a decline and preserves disabled submission',()=>{
 const view=fixture(),submit=vi.fn();const rendered=render(<DecisionPanel view={view} decision={decision} reputation={[]} disabled={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Decline exchange'}));expect(screen.getByRole('group',{name:'Ambassador offer from Hydran Progress'})).toBeVisible();expect(submit).not.toHaveBeenCalled();
 expect(screen.getByText(/No ambassadors are exchanged/)).toBeInTheDocument();
 rendered.rerender(<DecisionPanel view={view} decision={decision} reputation={[]} disabled onSubmit={submit}/>);expect(screen.getByRole('button',{name:'Decline and continue'})).toBeDisabled();
});
it('confirms a declined offer without choosing a population cube',()=>{
 const submit=vi.fn();render(<DecisionPanel view={fixture()} decision={decision} reputation={[]} disabled={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Decline exchange'}));
 expect(screen.queryByRole('radiogroup',{name:'Ambassador population'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Decline and continue'}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:'offer',choice:{kind:'diplomacy',accept:false,resource:'money'}});
});
it('explains that finishing the post-combat window ends further offers this round',()=>{
 const submit=vi.fn();render(<DecisionPanel view={fixture()} decision={{id:'window',kind:'diplomacy-window',owner:'a',eligibleSeatIds:['b'],populationSources:['money']}} reputation={[]} disabled={false} onSubmit={submit}/>);
 expect(screen.getByRole('radio',{name:'Finish diplomacy'})).toHaveAttribute('aria-checked','true');
 expect(screen.getByText(/No more offers this round/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Finish diplomacy and continue'}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:'window',choice:{kind:'diplomacy-window',offerTo:null,resource:'money'}});
});
