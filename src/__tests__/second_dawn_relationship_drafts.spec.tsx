import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getMinorSpecies} from '../../shared/eclipse/minorSpecies';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {ActionDraftProvider} from '../second-dawn-game/ActionDraftProvider';
import {draftStorageKey,keysForCommand,readActionDrafts} from '../second-dawn-game/actionDraftStorage';
import DiplomacyPanel from '../second-dawn-game/DiplomacyPanel';
import MinorSpeciesMarket from '../second-dawn-game/MinorSpeciesMarket';

afterEach(()=>{cleanup();localStorage.clear();});
function fixture(){return getPlayerView(createGame({seed:5,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'human'},{id:'c',faction:'planta',controller:'human'},{id:'d',faction:'orion',controller:'human'}]}),'a')!;}
it('restores the chosen relationship and resource after closing without storing private reputation',()=>{
 const view=fixture();view.private.reputation=[9];
 const candidates=(['money','science'] as const).map(resource=>({command:{type:'offer-diplomacy' as const,to:'b',resource},label:'Offer',description:''}));
 const props={view,candidates,disabled:false,onSubmit:vi.fn()};
 const ui=render(<ActionDraftProvider matchId="relations" viewerSeatId="a" revision={1}><DiplomacyPanel {...props}/></ActionDraftProvider>);
 fireEvent.click(screen.getByRole('button',{name:'Select relationship with Hydran Progress'}));
 fireEvent.click(screen.getByRole('button',{name:'Choose science population for Hydran Progress'}));
 ui.unmount();
 render(<ActionDraftProvider matchId="relations" viewerSeatId="a" revision={2}><DiplomacyPanel {...props}/></ActionDraftProvider>);
 expect(screen.getByRole('button',{name:'Choose science population for Hydran Progress'})).toHaveAttribute('aria-pressed','true');
 const saved=JSON.parse(localStorage.getItem(draftStorageKey({matchId:'relations',viewerSeatId:'a'}))!);
 expect(Object.keys(saved.values).sort()).toEqual(['diplomacyPartner','diplomacyResources']);
});
it('restores a recruitment preview and keeps population preference when another tile is inspected',()=>{
 const view=fixture();view.minorSpecies={market:['population','researchers']};view.activeSeatId='a';view.seats[0].resources.money=30;view.private.reputation=[];
 const props={view,disabled:false,onSubmit:vi.fn()};
 const ui=render(<ActionDraftProvider matchId="recruit" viewerSeatId="a" revision={1}><MinorSpeciesMarket {...props}/></ActionDraftProvider>);
 fireEvent.click(screen.getByRole('button',{name:`Select ${getMinorSpecies('population').name}`}));
 fireEvent.click(screen.getByRole('button',{name:'Science population'}));
 fireEvent.click(screen.getByRole('button',{name:`Select ${getMinorSpecies('researchers').name}`}));
 fireEvent.click(screen.getByRole('button',{name:`Select ${getMinorSpecies('population').name}`}));
 expect(screen.getByRole('button',{name:'Science population'})).toHaveAttribute('aria-pressed','true');
 ui.unmount();render(<ActionDraftProvider matchId="recruit" viewerSeatId="a" revision={2}><MinorSpeciesMarket {...props}/></ActionDraftProvider>);
 expect(screen.getByRole('button',{name:'Science population'})).toHaveAttribute('aria-pressed','true');
});
it('rejects hidden or malformed persisted values and does not clear unrelated activity preferences',()=>{
 const partition={matchId:'privacy',viewerSeatId:'a'};
 localStorage.setItem(draftStorageKey(partition),JSON.stringify({version:1,...partition,values:{diplomacyResources:{revision:1,value:{b:4}},minorSpeciesResources:{revision:1,value:{secret:'science'}},minorSpeciesSelection:{revision:1,value:'secret'}}}));
 expect(readActionDrafts(localStorage,partition).values).toEqual({});
 expect(keysForCommand({type:'guild-offer',give:'money',receive:'science',amount:2})).toEqual(['guildGive','guildReceive','guildAmount']);
 expect(keysForCommand({type:'offer-diplomacy',to:'b',resource:'science'})).not.toContain('diplomacyResources');
});
