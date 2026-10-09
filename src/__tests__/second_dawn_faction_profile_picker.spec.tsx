import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import FactionProfilePicker from '../second-dawn-game/FactionProfilePicker';
import FactionPicker from '../second-dawn-game/FactionPicker';
import {getFaction,type FactionId} from '../../shared/eclipse/catalog';
import {RoomSettingsEditor} from '../second-dawn-game/RoomLobby';

afterEach(cleanup);

it('offers only Base and Expanded, with all 25 civilizations in Standard Expanded',()=>{
 const change=vi.fn();
 render(<FactionProfilePicker value="scifi-v1" onChange={change}/>);
 const group=screen.getByRole('group',{name:'Faction collection'});
 expect(within(group).getAllByRole('button')).toHaveLength(2);
 expect(within(group).getByRole('button',{name:/Expanded.*25 civilizations/i})).toHaveAttribute('aria-pressed','true');
 expect(screen.queryByRole('button',{name:/Science fiction/i})).toBeNull();
 fireEvent.click(within(group).getByRole('button',{name:/Base/i}));
 expect(change).toHaveBeenCalledWith('base');
 fireEvent.click(within(group).getByRole('button',{name:/Expanded/i}));
 expect(change).toHaveBeenLastCalledWith('scifi-v1');
 cleanup();
 render(<FactionPicker selected="hydran" onSelect={change} profile="scifi-v1"/>);
 expect(within(screen.getByRole('group',{name:'Expanded civilizations'})).getAllByRole('button')).toHaveLength(25);
 for(const id of ['exfor','bobiverse','trisolarans','portiids','spacing-guild','formics','belters','exiles','lyra'] as FactionId[])expect(screen.getByRole('button',{name:getFaction(id).name,exact:true})).toBeVisible();
});

it.each(['expanded-v1','expanded-v2'] as const)('preserves the pinned %s room until Expanded is explicitly selected',value=>{
 const change=vi.fn();
 render(<FactionProfilePicker value={value} onChange={change}/>);
 expect(screen.getByRole('button',{name:/Expanded/i})).toHaveAttribute('aria-pressed','true');
 expect(screen.getByText(/existing room uses the earlier expanded roster/i)).toBeVisible();
 expect(change).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:/Expanded/i}));
 expect(change).toHaveBeenCalledWith('scifi-v1');
});

it('keeps Less Random Expanded available with its compatible 18 civilizations',()=>{
 const change=vi.fn();
 render(<RoomSettingsEditor settings={{humanSeatCount:2,aiCount:0,timerMs:600000,warpPortals:true,factionProfile:'scifi-v1'}} disabled={false} onSave={change}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Régis’s Less Random'}));
 expect(screen.getByRole('button',{name:/Expanded.*18 civilizations/i})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(screen.getByRole('button',{name:'Save room settings'}));
 expect(change).toHaveBeenLastCalledWith(expect.objectContaining({factionProfile:'expanded-v2',rulesMode:'less-random-v1'}));
 fireEvent.click(screen.getByRole('button',{name:/Base.*Original/i}));
 fireEvent.click(screen.getByRole('button',{name:/Expanded/i}));
 expect(screen.getByRole('radio',{name:'Régis’s Less Random'})).toBeChecked();
 fireEvent.click(screen.getByRole('radio',{name:'Standard Eclipse'}));
 fireEvent.click(screen.getByRole('button',{name:'Save room settings'}));
 expect(change).toHaveBeenLastCalledWith(expect.objectContaining({factionProfile:'scifi-v1',rulesMode:'standard'}));
});

it('notifies the multiplayer faction picker when custom rules change roster compatibility',()=>{
 const save=vi.fn(),profile=vi.fn(),rules=vi.fn();
 render(<RoomSettingsEditor settings={{humanSeatCount:2,aiCount:0,timerMs:600000,warpPortals:true,factionProfile:'scifi-v1'}} disabled={false} onSave={save} onProfileChange={profile} onRulesChange={rules}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'All technologies available'}));
 expect(profile).toHaveBeenLastCalledWith('expanded-v2');
 expect(rules).toHaveBeenLastCalledWith(expect.objectContaining({ruleOptions:expect.objectContaining({openTechnology:true})}));
 fireEvent.click(screen.getByRole('button',{name:'Save room settings'}));
 expect(save).toHaveBeenLastCalledWith(expect.objectContaining({factionProfile:'expanded-v2'}));
 fireEvent.click(screen.getByRole('checkbox',{name:'All technologies available'}));
 expect(profile).toHaveBeenLastCalledWith('scifi-v1');
 fireEvent.change(screen.getByRole('combobox',{name:'Rounds'}),{target:{value:'12'}});
 fireEvent.click(screen.getByRole('checkbox',{name:'Next round follows pass order'}));
 fireEvent.click(screen.getByRole('button',{name:'Save room settings'}));
 expect(save).toHaveBeenLastCalledWith(expect.objectContaining({factionProfile:'scifi-v1',ruleOptions:expect.objectContaining({roundLimit:12,passOrderTurnOrder:true})}));
});

it('offers a compatible upgrade for legacy Less Random rooms',()=>{
 const change=vi.fn();
 render(<FactionProfilePicker value="expanded-v1" rules={{rulesMode:'less-random-v1'}} onChange={change}/>);
 const expanded=screen.getByRole('button',{name:/Expanded.*Select to include all 18/i});
 fireEvent.click(expanded);
 expect(change).toHaveBeenCalledWith('expanded-v2');
});

it('leaves an existing room roster pinned when saving unchanged settings',()=>{
 const save=vi.fn();
 const settings={humanSeatCount:2,aiCount:0,timerMs:600000,warpPortals:true,factionProfile:'expanded-v2' as const};
 render(<RoomSettingsEditor settings={settings} disabled={false} onSave={save}/>);
 fireEvent.click(screen.getByRole('button',{name:'Save room settings'}));
 expect(save).toHaveBeenCalledExactlyOnceWith(settings);
});
