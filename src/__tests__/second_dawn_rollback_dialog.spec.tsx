// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import RollbackDialog from '../second-dawn-game/RollbackDialog';
import type {RollbackStatus} from '../../shared/eclipse/rollback';
afterEach(cleanup);
const state:RollbackStatus={isHost:true,revision:10,pending:null,lastResolution:null};
const target={revision:5,actorSeatId:'seat-1',actorName:'Planta',round:1,summary:'Explored a frontier',details:[],rollbackAvailable:true};
const props={status:state,target,viewerSeatId:'seat-1',seatNames:{'seat-1':'Planta','seat-2':'Orion'},humanCount:2,disabled:false,onClose:vi.fn(),onRequest:vi.fn(),onRespond:vi.fn(),onCancel:vi.fn()};
it('reviews undo BEFORE the selected action and explains hidden information and consensus',()=>{
 render(<RollbackDialog {...props}/>);expect(screen.getByText(/before action #5/)).toBeVisible();expect(screen.getByText(/cannot make players forget/)).toBeVisible();expect(props.onRequest).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Request undo'}));expect(props.onRequest).toHaveBeenCalledOnce();
});
it('other humans can approve or reject the saved request',()=>{
 const respond=vi.fn();render(<RollbackDialog {...props} target={null} viewerSeatId="seat-2" onRespond={respond} status={{...state,isHost:false,pending:{id:'vote',targetRevision:5,targetSummary:target.summary,requestedBySeatId:'seat-1',requiredSeatIds:['seat-2'],approvedSeatIds:[],createdAt:0}}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Approve undo'}));expect(respond).toHaveBeenCalledWith(true);fireEvent.click(screen.getByRole('button',{name:'Keep current game'}));expect(respond).toHaveBeenCalledWith(false);
});
it('solo offers immediate undo and disconnected requests are disabled',()=>{
 render(<RollbackDialog {...props} humanCount={1} disabled/>);expect(screen.getByRole('button',{name:'Undo now'})).toBeDisabled();
});
