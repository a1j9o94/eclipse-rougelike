// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import HistoryPanel from '../second-dawn-game/HistoryPanel';
import type {HistoryFeed} from '../second-dawn-session/useMatchHistory';
afterEach(cleanup);
const feed:HistoryFeed={entries:[{revision:5,actorSeatId:'seat-1',actorName:'Planta',round:1,summary:'Moved one ship',details:[],rollbackAvailable:true},{revision:4,actorSeatId:'seat-2',actorName:'Orion',round:1,summary:'Built one ship',details:[],rollbackAvailable:false,rollbackUnavailableReason:'This older action has no saved checkpoint.'}],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:()=>{}};
it('host can select the exact action to restore before, without submitting immediately',()=>{
 const select=vi.fn();render(<HistoryPanel feed={feed} rollback={{isHost:true,disabled:false,onSelect:select}}/>);
 fireEvent.click(screen.getAllByRole('button',{name:'Undo to before this action'})[0]);expect(select).toHaveBeenCalledWith(feed.entries[0]);
 expect(screen.getAllByRole('button',{name:'Undo to before this action'})[1]).toBeDisabled();expect(screen.getByText('This older action has no saved checkpoint.')).toBeVisible();
});
it('ordinary players cannot request host rollback',()=>{
 render(<HistoryPanel feed={feed} rollback={{isHost:false,disabled:false,onSelect:vi.fn()}}/>);expect(screen.queryByRole('button',{name:'Undo to before this action'})).toBeNull();
});
