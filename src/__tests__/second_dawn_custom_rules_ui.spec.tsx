import {useState} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import GameRuleSettings,{type GameRuleSettingsValue} from '../second-dawn-game/GameRuleSettings';
import {RoomSettingsEditor} from '../second-dawn-game/RoomLobby';
import {gameRules} from '../../shared/eclipse/gameRules';
afterEach(cleanup);
function Harness(){const [value,setValue]=useState<GameRuleSettingsValue>({rulesMode:'standard',warpPortals:true,riftCannons:true});return <><GameRuleSettings value={value} disabled={false} onChange={setValue}/><output data-testid="rules">{JSON.stringify({...gameRules(value),warpPortals:value.warpPortals,riftCannons:value.riftCannons})}</output></>;}
it('chooses ten standard rounds and independent open supplies without enabling other variant rules',()=>{
 render(<Harness/>);fireEvent.change(screen.getByRole('combobox',{name:'Rounds'}),{target:{value:'10'}});fireEvent.click(screen.getByRole('checkbox',{name:'All technologies available'}));fireEvent.click(screen.getByRole('checkbox',{name:'Choose from all discovery tiles'}));
 expect(JSON.parse(screen.getByTestId('rules').textContent!)).toMatchObject({roundLimit:10,openTechnology:true,publicDiscoveries:true,publicReputation:false,explorationRules:false,combatJokers:false,factionVariant:false,technologyVariant:false,discoveryVariant:false});
 expect(screen.getByText('Custom rules')).toBeVisible();
});
it('applies the full Less Random preset, allows individual overrides, and restores Standard',()=>{
 render(<Harness/>);fireEvent.click(screen.getByRole('radio',{name:'Régis’s Less Random'}));expect(JSON.parse(screen.getByTestId('rules').textContent!)).toMatchObject({roundLimit:10,openTechnology:true,publicDiscoveries:true,publicReputation:true,explorationRules:true,combatJokers:true,factionVariant:true,technologyVariant:true,discoveryVariant:true,warpPortals:false,riftCannons:false});
 fireEvent.click(screen.getByRole('checkbox',{name:'Public reputation choices'}));expect(JSON.parse(screen.getByTestId('rules').textContent!)).toMatchObject({publicReputation:false,publicDiscoveries:true});
 fireEvent.click(screen.getByRole('radio',{name:'Régis’s Less Random'}));expect(JSON.parse(screen.getByTestId('rules').textContent!)).toMatchObject({publicReputation:true,publicDiscoveries:true});
 fireEvent.click(screen.getByRole('radio',{name:'Standard Eclipse'}));expect(JSON.parse(screen.getByTestId('rules').textContent!)).toMatchObject({roundLimit:8,openTechnology:false,publicDiscoveries:false,warpPortals:true,riftCannons:true});
});
it('saves custom room rules and honors disabled setup',()=>{
 const save=vi.fn();const {rerender}=render(<RoomSettingsEditor settings={{humanSeatCount:2,aiCount:0,timerMs:600000,warpPortals:true}} disabled={false} onSave={save}/>);
 fireEvent.change(screen.getByRole('combobox',{name:'Rounds'}),{target:{value:'12'}});fireEvent.click(screen.getByRole('checkbox',{name:'Choose from all discovery tiles'}));fireEvent.click(screen.getByRole('button',{name:'Save room settings'}));expect(save).toHaveBeenCalledWith(expect.objectContaining({ruleOptions:expect.objectContaining({roundLimit:12,publicDiscoveries:true})}));
 rerender(<GameRuleSettings value={{rulesMode:'standard',warpPortals:true}} disabled onChange={vi.fn()}/>);expect(screen.getByRole('combobox',{name:'Rounds'})).toBeDisabled();expect(screen.getByRole('checkbox',{name:'All technologies available'})).toBeDisabled();
});
it('offers pass-order turns with the other creation rules and saves the room choice',()=>{
 render(<Harness/>);
 const toggle=screen.getByRole('checkbox',{name:'Next round follows pass order'});
 expect(toggle).not.toBeChecked();
 fireEvent.click(toggle);
 expect(JSON.parse(screen.getByTestId('rules').textContent!)).toMatchObject({passOrderTurnOrder:true});
 cleanup();
 const save=vi.fn();
 render(<RoomSettingsEditor settings={{humanSeatCount:2,aiCount:0,timerMs:600000,warpPortals:true}} disabled={false} onSave={save}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'Next round follows pass order'}));
 fireEvent.click(screen.getByRole('button',{name:'Save room settings'}));
 expect(save).toHaveBeenCalledWith(expect.objectContaining({ruleOptions:expect.objectContaining({passOrderTurnOrder:true})}));
});
