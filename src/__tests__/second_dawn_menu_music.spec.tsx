// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import MenuMusicControls from '../second-dawn-game/sound/MenuMusicControls';
const audio=vi.hoisted(()=>({prepare:vi.fn()}));
vi.mock('../second-dawn-game/dice3d/audio',()=>({prepareCosmeticAudio:audio.prepare}));
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();audio.prepare.mockResolvedValue(true);});
afterEach(cleanup);
it('lets menu players mute the default music, saves volume, and keeps the mute on remount',()=>{
 const ui=render(<MenuMusicControls/>);expect(screen.getByRole('button',{name:'Mute music'})).toHaveAttribute('aria-pressed','true');
 fireEvent.change(screen.getByRole('slider',{name:'Music volume'}),{target:{value:'30'}});
 expect(localStorage.getItem('eclipse.second-dawn.ambient-volume.v1')).toBe('0.3');
 fireEvent.click(screen.getByRole('button',{name:'Mute music'}));expect(screen.getByRole('slider',{name:'Music volume'})).toBeDisabled();
 ui.unmount();render(<MenuMusicControls/>);expect(screen.getByRole('button',{name:'Play music'})).toHaveAttribute('aria-pressed','false');
 fireEvent.click(screen.getByRole('button',{name:'Play music'}));expect(audio.prepare).toHaveBeenCalledOnce();expect(screen.getByRole('slider',{name:'Music volume'})).toHaveValue('30');
});
