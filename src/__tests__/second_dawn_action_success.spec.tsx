// @vitest-environment jsdom
import {cleanup,render,screen,act,fireEvent} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import ActionSuccessNotice from '../second-dawn-game/ActionSuccessNotice';
afterEach(()=>{cleanup();vi.useRealTimers();});
it('announces only newly accepted commands, using their public result',()=>{
 const ui=render(<ActionSuccessNotice receipt={{revision:3,type:'move'}} entries={[]}/>);expect(screen.queryByRole('status')).toBeNull();
 ui.rerender(<ActionSuccessNotice receipt={{revision:4,type:'build'}} entries={[{revision:4,actorSeatId:'seat-1',actorName:'Planta',round:1,summary:'Built 2 components',details:[]}]}/>);expect(screen.getByRole('status')).toHaveTextContent('Built 2 components');fireEvent.click(screen.getByRole('button',{name:'Dismiss action confirmation'}));expect(screen.queryByRole('status')).toBeNull();
});
it('dismisses automatically and does not replace manual combat with notification spam',()=>{
 vi.useFakeTimers();const ui=render(<ActionSuccessNotice entries={[]}/>);ui.rerender(<ActionSuccessNotice receipt={{revision:1,type:'research'}} entries={[]}/>);expect(screen.getByRole('status')).toHaveTextContent('Research completed');act(()=>vi.advanceTimersByTime(6000));expect(screen.queryByRole('status')).toBeNull();ui.rerender(<ActionSuccessNotice receipt={{revision:2,type:'resolve'}} entries={[]}/>);expect(screen.queryByRole('status')).toBeNull();
});
