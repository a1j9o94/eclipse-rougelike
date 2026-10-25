import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import DiscoveryDecision from '../second-dawn-game/DiscoveryDecision';
import type {PendingDecision} from '../../shared/eclipse/types';
afterEach(cleanup);
const reward:Extract<PendingDecision,{kind:'discovery'}>={id:'reward',owner:'a',kind:'discovery',tileId:'money',options:['keep','use']};
it('updates one shared commit area when changing reward sides',()=>{
 const submit=vi.fn();render(<DiscoveryDecision decision={reward} disabled={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Use Money Cache'}));
 const commit=screen.getByRole('region',{name:'Discovery commitment'});
 expect(within(commit).getByRole('button',{name:'Gain 8 money'})).toBeEnabled();
 fireEvent.click(screen.getByRole('radio',{name:'Keep for 2 VP'}));
 expect(within(commit).queryByRole('button',{name:'Gain 8 money'})).toBeNull();
 fireEvent.click(within(commit).getByRole('button',{name:'Keep for 2 VP'}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:'reward',choice:{kind:'discovery',option:'keep'}});
});
it('selects successive public tiles without retaining a hidden earlier reward',()=>{
 const submit=vi.fn();render(<DiscoveryDecision decision={{...reward,tileId:'',availableTileIds:['money','science','materials'],options:['use']}} disabled={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Science Cache'}));fireEvent.click(screen.getByRole('radio',{name:'Materials Cache'}));
 const commit=screen.getByRole('region',{name:'Discovery commitment'});
 expect(within(commit).queryByRole('button',{name:'Gain 8 money'})).toBeNull();
 fireEvent.click(within(commit).getByRole('button',{name:'Gain 6 materials'}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'resolve',decisionId:'reward',choice:{kind:'discovery',option:'use',discoveryId:'materials'}});
});
it('previews the only legal side without requiring a redundant picker or submitting it',()=>{
 const submit=vi.fn();render(<DiscoveryDecision decision={{...reward,options:['keep']}} disabled={false} onSubmit={submit}/>);
 expect(screen.getByRole('radio',{name:'Keep for 2 VP'})).toBeChecked();
 expect(submit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Keep for 2 VP'}));
 expect(submit).toHaveBeenCalledOnce();
});

it('blocks a selected public reward that disappears without buying another tile',()=>{
 const submit=vi.fn(),decision={...reward,tileId:'',availableTileIds:['money','science'],options:['use'] as ('use'|'keep')[]};
 const result=render(<DiscoveryDecision decision={decision} disabled={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Science Cache'}));
 result.rerender(<DiscoveryDecision decision={{...decision,availableTileIds:['money']}} disabled={false} onSubmit={submit}/>);
 expect(screen.getByRole('status')).toHaveTextContent('no longer in the public supply');
 expect(screen.getByRole('button',{name:'Gain 5 science'})).toBeDisabled();
 expect(screen.queryByRole('button',{name:'Gain 8 money'})).toBeNull();
 expect(submit).not.toHaveBeenCalled();
});
