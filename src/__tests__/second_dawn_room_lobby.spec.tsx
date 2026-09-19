import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import type {MultiplayerRoomLobby} from '../../shared/eclipse/multiplayer';
import RoomLobby,{RoomSettingsEditor} from '../second-dawn-game/RoomLobby';
afterEach(cleanup);
const lobby:MultiplayerRoomLobby={roomToken:'sample-room',status:'waiting',settings:{humanSeatCount:2,aiCount:0,timerMs:600000,warpPortals:true},seats:[{slot:1,faction:'hydran',ready:false,isHost:true,occupied:true},{slot:2,faction:'eridani',ready:true,isHost:false,occupied:true}],viewerSlot:1,viewerIsHost:true,matchId:null,timer:null};
const callbacks=()=>({onJoin:vi.fn(),onLeave:vi.fn(),onFaction:vi.fn(),onReady:vi.fn(),onSettings:vi.fn(),onStart:vi.fn(),onEnter:vi.fn()});
it('offers solo room settings with an AI opponent and no turn timer',()=>{
 const save=vi.fn();render(<RoomSettingsEditor settings={lobby.settings} disabled={false} onSave={save}/>);fireEvent.click(screen.getByRole('button',{name:'Fewer human players'}));expect(screen.getByText(/Wait for me/)).toBeVisible();expect(screen.queryByRole('group',{name:'Turn timer presets'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Save room settings'}));expect(save).toHaveBeenCalledExactlyOnceWith({...lobby.settings,humanSeatCount:1,aiCount:1});
});
it('recovers an invalid hidden timer when switching to a solo room',()=>{
 const save=vi.fn();render(<RoomSettingsEditor settings={lobby.settings} disabled={false} onSave={save}/>);
 fireEvent.change(screen.getByRole('spinbutton',{name:'Custom turn duration'}),{target:{value:''}});
 expect(screen.getByRole('button',{name:'Save room settings'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Fewer human players'}));
 expect(screen.getByRole('button',{name:'Save room settings'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Save room settings'}));
 expect(save).toHaveBeenCalledWith({...lobby.settings,humanSeatCount:1,aiCount:1,timerMs:30000});
});
it('shows shared seats, blocks occupied colors, and readies only the viewer',()=>{
 const handlers=callbacks();render(<RoomLobby lobby={lobby} disabled={false} {...handlers}/>);
 expect(screen.getByRole('button',{name:'Start room game'})).toBeDisabled();
 expect(screen.getByRole('button',{name:/Eridani Empire, Red board/})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Ready to play'}));expect(handlers.onReady).toHaveBeenCalledExactlyOnceWith(true);expect(handlers.onStart).not.toHaveBeenCalled();
 expect(screen.getByLabelText('Room invitation link')).toHaveValue(`${window.location.origin}/room/sample-room`);
});
it('offers join with a free visual faction choice and hides host controls from visitors',()=>{
 const handlers=callbacks();render(<RoomLobby lobby={{...lobby,viewerSlot:null,viewerIsHost:false,seats:[lobby.seats[0],{slot:2,faction:null,ready:false,isHost:false,occupied:false}]}} disabled={false} {...handlers}/>);
 expect(screen.queryByRole('button',{name:'Start room game'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/Planta, Green board/}));fireEvent.click(screen.getByRole('button',{name:'Join room'}));expect(handlers.onJoin).toHaveBeenCalledExactlyOnceWith('planta');
});
it('edits timer with visual presets and validates custom bounds before saving',()=>{
 const change=vi.fn();render(<RoomSettingsEditor settings={lobby.settings} disabled={false} onSave={change}/>);
 fireEvent.click(screen.getByRole('button',{name:'48 hours',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Save room settings'}));expect(change).toHaveBeenLastCalledWith({...lobby.settings,timerMs:172800000});
 const custom=screen.getByRole('spinbutton',{name:'Custom turn duration'});fireEvent.change(custom,{target:{value:'49'}});fireEvent.click(within(screen.getByRole('group',{name:'Timer units'})).getByRole('button',{name:'Hours',exact:true}));expect(screen.getByRole('button',{name:'Save room settings'})).toBeDisabled();
});
it('keeps an occupied seat after its incompatible faction is cleared and requires a new choice',()=>{
 const handlers=callbacks();render(<RoomLobby lobby={{...lobby,seats:[{...lobby.seats[0],faction:null},lobby.seats[1]]}} disabled={false} {...handlers}/>);
 expect(screen.getByText('Choose faction',{exact:true})).toBeVisible();expect(screen.getByRole('button',{name:'Ready to play'})).toBeDisabled();
});
it('lets an expanded room change piece color without changing species',()=>{
 const handlers=callbacks();render(<RoomLobby lobby={{...lobby,settings:{...lobby.settings,factionProfile:'expanded-v1'},seats:[{...lobby.seats[0],faction:'magellan',pieceColor:'green'},{...lobby.seats[1],pieceColor:'red'}]}} disabled={false} {...handlers}/>);
 expect(screen.getByRole('button',{name:/Red pieces.*Chosen by/})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Yellow pieces'}));expect(handlers.onFaction).toHaveBeenCalledWith('magellan','yellow');
 expect(screen.getByRole('button',{name:'Hydran Progress',exact:true})).toBeEnabled();
});
it('lets the host agree to optional combat odds before the game starts',()=>{
 const save=vi.fn();render(<RoomSettingsEditor settings={lobby.settings} disabled={false} onSave={save}/>);const toggle=screen.getByRole('checkbox',{name:/Show estimated combat odds/});expect(toggle).not.toBeChecked();fireEvent.click(toggle);fireEvent.click(screen.getByRole('button',{name:'Save room settings'}));expect(save).toHaveBeenCalledWith({...lobby.settings,showCombatOdds:true});
});
