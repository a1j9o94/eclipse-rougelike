// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {useDice3dEnabled} from '../second-dawn-game/presentationSettings';
function Settings(){const [enabled,setEnabled]=useDice3dEnabled();return <button onClick={()=>setEnabled(!enabled)}>{enabled?'3D on':'3D off'}</button>;}
afterEach(()=>{cleanup();localStorage.clear();window.dispatchEvent(new Event('storage'));});
it('defaults to 3D dice and remembers an explicit off setting across remounts',()=>{
 const ui=render(<Settings/>);fireEvent.click(screen.getByText('3D on'));expect(screen.getByText('3D off')).toBeInTheDocument();ui.unmount();render(<Settings/>);expect(screen.getByText('3D off')).toBeInTheDocument();
});
it('updates every consumer when a preference changes locally or in another tab',()=>{
 render(<><Settings/><Settings/></>);fireEvent.click(screen.getAllByText('3D on')[0]);expect(screen.getAllByText('3D off')).toHaveLength(2);
 localStorage.setItem('eclipse.second-dawn.dice3d.v1','on');fireEvent(window,new Event('storage'));expect(screen.getAllByText('3D on')).toHaveLength(2);
});

