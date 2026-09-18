import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import DecisionPanel from '../second-dawn-game/DecisionPanel';
import type {PendingDecision} from '../../shared/eclipse/types';
afterEach(cleanup);
const turn:Extract<PendingDecision,{kind:'combat-turn'}>={id:'fire-now',owner:'a',kind:'combat-turn',battleId:'battle',shipType:'interceptor',destinationIds:['home']};
it('rolls immediately with one command instead of selecting fight and confirming',()=>{
 const submit=vi.fn();render(<DecisionPanel decision={turn} reputation={[]} disabled={false} onSubmit={submit}/>);
 expect(screen.queryByRole('button',{name:'Confirm choice'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Roll dice'}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:turn.id,choice:{kind:'combat-turn',retreatTo:null}});
});
it('opens retreat routes without committing and declares the selected route directly',()=>{
 const submit=vi.fn();render(<DecisionPanel decision={turn} reputation={[]} disabled={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Retreat'}));expect(submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Retreat to Sector home'}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:turn.id,choice:{kind:'combat-turn',retreatTo:'home'}});
});
it('blocks firing and retreat commands while disconnected or submitting',()=>{
 const submit=vi.fn();render(<DecisionPanel decision={turn} reputation={[]} disabled onSubmit={submit}/>);
 expect(screen.getByRole('button',{name:'Roll dice'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Retreat'}));
 expect(screen.getByRole('button',{name:'Retreat to Sector home'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Retreat to Sector home'}));expect(submit).not.toHaveBeenCalled();
});
it('opens forced retreat destinations directly and never offers a roll',()=>{
 const submit=vi.fn();render(<DecisionPanel decision={{...turn,forcedRetreat:true}} reputation={[]} disabled={false} onSubmit={submit}/>);
 expect(screen.queryByRole('button',{name:'Roll dice'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Retreat to Sector home'}));expect(submit).toHaveBeenCalledOnce();
});
it('explains the lack of a legal retreat route and keeps firing available',()=>{
 render(<DecisionPanel decision={{...turn,destinationIds:[]}} reputation={[]} disabled={false} onSubmit={vi.fn()}/>);
 expect(screen.getByRole('button',{name:'Retreat'})).toBeDisabled();
 expect(screen.getByText(/No legal retreat route/)).toBeTruthy();
 expect(screen.getByRole('button',{name:'Roll dice'})).toBeEnabled();
});
