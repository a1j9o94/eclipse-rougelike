import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import GuildTradePanel from '../second-dawn-game/GuildTradePanel';
import {ActionDraftProvider} from '../second-dawn-game/ActionDraftProvider';
import {draftStorageKey,readActionDrafts,isMeaningfulDraft,keysForCommand} from '../second-dawn-game/actionDraftStorage';
afterEach(()=>{cleanup();localStorage.clear();});
function fixture(){const state=createGame({seed:3,factionProfile:'scifi-v1',seats:[{id:'a',faction:'spacing-guild',controller:'human'},{id:'b',faction:'terran-directorate',controller:'human'}]});state.activeSeatId='b';state.seats[1].resources.science=10;state.guildOffers=[{id:'first',owner:'a',give:'materials',receive:'science',remaining:3},{id:'second',owner:'a',give:'money',receive:'science',remaining:2}];return getPlayerView(state,'b')!;}
it('opens one selected offer and restores its quantity after leaving',()=>{
 const view=fixture(),submit=vi.fn();const ui=()=> <ActionDraftProvider matchId="offers" viewerSeatId="b" revision={view.revision}><GuildTradePanel view={view} candidates={legalCommands(view)} disabled={false} onSubmit={submit}/></ActionDraftProvider>;
 const first=render(ui());expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Select offer: receive materials for science'}));
 fireEvent.change(screen.getByRole('spinbutton'),{target:{value:'2'}});
 fireEvent.click(screen.getByRole('button',{name:'Select offer: receive money for science'}));
 expect(screen.getAllByRole('spinbutton')).toHaveLength(1);first.unmount();render(ui());
 expect(screen.getByRole('button',{name:'Select offer: receive money for science'})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(screen.getByRole('button',{name:'Select offer: receive materials for science'}));expect(screen.getByRole('spinbutton')).toHaveValue(2);expect(submit).not.toHaveBeenCalled();
});
it('validates public offer references and quantities without storing arbitrary payloads',()=>{
 const partition={matchId:'guild-storage',viewerSeatId:'b'};
 localStorage.setItem(draftStorageKey(partition),JSON.stringify({version:1,...partition,values:{guildOfferSelection:{revision:1,value:'first'},guildOfferAmounts:{revision:1,value:{first:2,second:3}}}}));
 const result=readActionDrafts(localStorage,partition);expect(result.values.guildOfferSelection?.value).toBe('first');expect(result.values.guildOfferAmounts?.value).toEqual({first:2,second:3});expect(isMeaningfulDraft('guildOfferAmounts',result.values)).toBe(false);
 localStorage.setItem(draftStorageKey(partition),JSON.stringify({version:1,...partition,values:{guildOfferSelection:{revision:1,value:'ecl1_'+'a'.repeat(64)},guildOfferAmounts:{revision:1,value:{first:-1,privateReputation:[5]}}}}));expect(readActionDrafts(localStorage,partition).values).toEqual({});
 expect(keysForCommand({type:'accept-guild-offer',offerId:'first',amount:2})).toEqual(['guildOfferSelection']);
});
it('uses one commitment when a Guild player selects another offer',()=>{
 const view=fixture();view.viewerSeatId='a';view.activeSeatId='a';view.guildOffers=[{id:'foreign',owner:'b',give:'money',receive:'materials',remaining:2}];
 render(<GuildTradePanel view={view} candidates={[{command:{type:'guild-offer',give:'materials',receive:'science',amount:1},label:'Post',description:''},{command:{type:'accept-guild-offer',offerId:'foreign',amount:1},label:'Accept',description:''}]} disabled={false} onSubmit={vi.fn()}/>);
 expect(screen.getByRole('button',{name:'Post offer'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Select offer: receive money for materials'}));
 expect(screen.queryByRole('button',{name:'Post offer'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Pay 1 materials · receive 1 money'})).toBeInTheDocument();
});
it('keeps a withdrawn selected offer visible as a local blocker',()=>{
 const view=fixture(),submit=vi.fn();const ui=render(<GuildTradePanel view={view} candidates={legalCommands(view)} disabled={false} onSubmit={submit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Select offer: receive materials for science'}));
 ui.rerender(<GuildTradePanel view={{...view,guildOffers:[]}} candidates={[]} disabled={false} onSubmit={submit}/>);
 expect(screen.getByRole('status')).toHaveTextContent('The selected offer is no longer available.');expect(screen.queryByRole('button',{name:/^Pay /})).not.toBeInTheDocument();expect(submit).not.toHaveBeenCalled();
});
