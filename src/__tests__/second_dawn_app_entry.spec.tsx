import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import App from '../App';
vi.mock('../second-dawn-game/SecondDawnGame',()=>({default:()=> <h1>Your saved games</h1>}));
afterEach(()=>{cleanup();window.history.replaceState(null,'','/');});
it.each(['','#second-dawn-preview','#second-dawn-review'])('opens the real game for current and retired entry links: %s',async hash=>{
 window.history.replaceState(null,'',`/${hash}`);render(<App/>);
 expect(await screen.findByRole('heading',{name:'Your saved games'})).toBeVisible();
 expect(screen.queryByText('PLAYABLE PREVIEW')).toBeNull();
});
