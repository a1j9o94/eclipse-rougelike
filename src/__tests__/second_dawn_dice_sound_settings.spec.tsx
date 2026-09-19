// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import GameSettingsPanel from '../second-dawn-game/GameSettingsPanel';
import {useDiceSoundEnabled,useDiceSoundVolume} from '../second-dawn-game/presentationSettings';
const SOUND_KEY='eclipse.second-dawn.dice-sound.v1';
const VOLUME_KEY='eclipse.second-dawn.dice-volume.v1';
function panel(){return <GameSettingsPanel motionEnabled onMotionChange={vi.fn()} onClose={vi.fn()}/>;}
function Consumer(){const [sound,setSound]=useDiceSoundEnabled();const [volume,setVolume]=useDiceSoundVolume();return <><output>{sound?'sound on':'sound off'} {volume}</output><button onClick={()=>{setSound(false);setVolume(.35);}}>Quiet</button><button onClick={()=>setVolume(4)}>Loud</button><button onClick={()=>setVolume(-1)}>Silent</button><button onClick={()=>setVolume(Number.NaN)}>Invalid</button></>;}
afterEach(()=>{cleanup();vi.restoreAllMocks();localStorage.clear();});
it('defaults to audible dice at moderate volume with autosaved controls',()=>{
 render(panel());expect(screen.getByRole('checkbox',{name:/Dice sounds/})).toBeChecked();expect(screen.getByRole('slider',{name:'Dice volume'})).toHaveValue('60');expect(screen.getByText('60%')).toBeInTheDocument();
 fireEvent.change(screen.getByRole('slider',{name:'Dice volume'}),{target:{value:'25'}});expect(screen.getByText('25%')).toBeInTheDocument();expect(localStorage.getItem(VOLUME_KEY)).toBe('0.25');
});
it('remembers muted state and volume across remounts while disabling the slider',()=>{
 const mounted=render(panel());fireEvent.change(screen.getByRole('slider',{name:'Dice volume'}),{target:{value:'35'}});fireEvent.click(screen.getByRole('checkbox',{name:/Dice sounds/}));expect(screen.getByRole('slider',{name:'Dice volume'})).toBeDisabled();expect(localStorage.getItem(SOUND_KEY)).toBe('off');mounted.unmount();render(panel());expect(screen.getByRole('checkbox',{name:/Dice sounds/})).not.toBeChecked();expect(screen.getByRole('slider',{name:'Dice volume'})).toHaveValue('35');fireEvent.click(screen.getByRole('checkbox',{name:/Dice sounds/}));expect(screen.getByRole('slider',{name:'Dice volume'})).toBeEnabled();
});
it('synchronizes mounted consumers and settings from other tabs',()=>{
 render(<><Consumer/><Consumer/></>);fireEvent.click(screen.getAllByText('Quiet')[0]);expect(screen.getAllByText('sound off 0.35')).toHaveLength(2);localStorage.setItem(SOUND_KEY,'on');localStorage.setItem(VOLUME_KEY,'0.8');fireEvent(window,new Event('storage'));expect(screen.getAllByText('sound on 0.8')).toHaveLength(2);
});
it('bounds volume and safely defaults corrupt saved values',()=>{
 localStorage.setItem(VOLUME_KEY,'not a number');render(<Consumer/>);expect(screen.getByText('sound on 0.6')).toBeInTheDocument();fireEvent.click(screen.getByText('Loud'));expect(screen.getByText('sound on 1')).toBeInTheDocument();fireEvent.click(screen.getByText('Silent'));expect(screen.getByText('sound on 0')).toBeInTheDocument();fireEvent.click(screen.getByText('Invalid'));expect(screen.getByText('sound on 0.6')).toBeInTheDocument();
});
it('keeps sound preferences in session when browser storage is blocked',()=>{
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked');});vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('blocked');});const mounted=render(<Consumer/>);fireEvent.click(screen.getByText('Quiet'));expect(screen.getByText('sound off 0.35')).toBeInTheDocument();mounted.unmount();render(<Consumer/>);expect(screen.getByText('sound off 0.35')).toBeInTheDocument();
});
it('keeps muted volume out of the settings keyboard focus loop',()=>{
 render(panel());fireEvent.click(screen.getByRole('checkbox',{name:/Dice sounds/}));const dialog=screen.getByRole('dialog',{name:'Game settings'});const controls=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)'));const last=controls.at(-1)!;last.focus();fireEvent.keyDown(last,{key:'Tab'});expect(controls[0]).toHaveFocus();fireEvent.keyDown(controls[0],{key:'Tab',shiftKey:true});expect(last).toHaveFocus();
});
it('keeps sound available with animation disabled and includes follow and autopass preferences',()=>{
 const follow=vi.fn(),autoPass=vi.fn();render(<GameSettingsPanel motionEnabled={false} onMotionChange={vi.fn()} onClose={vi.fn()} followAi onFollowAiChange={follow} autoPass={{enabled:false,paused:false,disabled:false,onChange:autoPass}}/>);expect(screen.getByRole('checkbox',{name:/Dice sounds/})).toBeEnabled();expect(screen.getByRole('slider',{name:'Dice volume'})).toBeEnabled();fireEvent.click(screen.getByRole('checkbox',{name:/Follow AI/}));expect(follow).toHaveBeenCalledWith(false);fireEvent.click(screen.getByRole('checkbox',{name:/Auto-pass unless attacked/}));expect(autoPass).toHaveBeenCalledWith(true);
});
it('explains blocked auto-pass and allows resuming reactions after an attack',()=>{
 const autoPass=vi.fn();const mounted=render(<GameSettingsPanel motionEnabled onMotionChange={vi.fn()} onClose={vi.fn()} autoPass={{enabled:true,paused:true,disabled:true,disabledReason:'Reconnect to change auto-pass.',onChange:autoPass}}/>);expect(screen.getByRole('checkbox',{name:/Auto-pass unless attacked/})).toBeDisabled();expect(screen.getByText('Reconnect to change auto-pass.')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Resume auto-pass'})).toBeDisabled();mounted.rerender(<GameSettingsPanel motionEnabled onMotionChange={vi.fn()} onClose={vi.fn()} autoPass={{enabled:true,paused:true,disabled:false,onChange:autoPass}}/>);fireEvent.click(screen.getByRole('button',{name:'Resume auto-pass'}));expect(autoPass).toHaveBeenCalledWith(true);
});
