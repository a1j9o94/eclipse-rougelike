import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import TurnClock from '../second-dawn-game/TurnClock';
afterEach(()=>{cleanup();vi.useRealTimers();});
it('shows the authoritative deadline and expired AI takeover without extending it on remount',()=>{
 vi.useFakeTimers();vi.setSystemTime(10000);
 const timer={deadlineAt:40000,targetSeatId:'a',decisionId:null,status:'active' as const,error:null};
 const {unmount}=render(<TurnClock timer={timer} actorName="You"/>);expect(screen.getByLabelText('Turn timer')).toHaveTextContent('0:30');unmount();vi.setSystemTime(42000);render(<TurnClock timer={timer} actorName="You"/>);expect(screen.getByLabelText('Turn timer')).toHaveTextContent('Time expired');
});
