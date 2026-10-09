// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import MenuSettingsButton from '../second-dawn-game/MenuSettingsButton';
import {useMotionEnabled,useFollowAiEnabled} from '../second-dawn-game/presentationSettings';
function GamePreferences(){const [motion]=useMotionEnabled(),[follow]=useFollowAiEnabled();return <output>{`motion:${motion}/follow:${follow}`}</output>;}
beforeEach(()=>{localStorage.clear();});afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('shows only a gear until opened and offers shared presentation preferences without match actions',()=>{
 render(<MenuSettingsButton/>);expect(screen.getByRole('button',{name:'Settings'})).toHaveAttribute('aria-expanded','false');expect(screen.queryByRole('slider')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Settings'}));expect(screen.getByRole('dialog',{name:'Settings'})).toBeVisible();
 for(const name of [/Ambient music/,/Animations/,/3D combat dice/,/Dice sounds/,/Game effects/,/Follow AI/])expect(screen.getByRole('checkbox',{name})).toBeInTheDocument();
 expect(screen.queryByText('Leave or resign game')).toBeNull();expect(screen.queryByRole('checkbox',{name:/Auto-pass/})).toBeNull();
});
it('autosaves music and display choices, syncs game consumers and restores focus on close',()=>{
 const ui=render(<><MenuSettingsButton/><GamePreferences/></>);const gear=screen.getByRole('button',{name:'Settings'});gear.focus();fireEvent.click(gear);
 fireEvent.change(screen.getByRole('slider',{name:'Ambient music volume'}),{target:{value:'30'}});fireEvent.click(screen.getByRole('checkbox',{name:/Ambient music/}));
 fireEvent.click(screen.getByRole('checkbox',{name:/Animations/}));fireEvent.click(screen.getByRole('checkbox',{name:/Follow AI/}));expect(screen.getByText('motion:false/follow:false')).toBeInTheDocument();
 expect(localStorage.getItem('eclipse.second-dawn.ambient-volume.v1')).toBe('0.3');expect(localStorage.getItem('eclipse.second-dawn.ambient.v1')).toBe('off');
 fireEvent.keyDown(screen.getByRole('dialog',{name:'Settings'}),{key:'Escape'});expect(gear).toHaveFocus();expect(screen.queryByRole('dialog')).toBeNull();
 ui.unmount();render(<MenuSettingsButton/>);fireEvent.click(screen.getByRole('button',{name:'Settings'}));expect(screen.getByRole('checkbox',{name:/Ambient music/})).not.toBeChecked();expect(screen.getByRole('slider',{name:'Ambient music volume'})).toHaveValue('30');expect(screen.getByRole('checkbox',{name:/Animations/})).not.toBeChecked();
});
it('defaults motion off for reduced-motion users and syncs choices from other tabs',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));render(<><MenuSettingsButton/><GamePreferences/></>);expect(screen.getByText('motion:false/follow:true')).toBeInTheDocument();
 localStorage.setItem('eclipse.second-dawn.motion.v1','on');localStorage.setItem('eclipse.second-dawn.follow-ai.v1','off');fireEvent(window,new Event('storage'));expect(screen.getByText('motion:true/follow:false')).toBeInTheDocument();
});
