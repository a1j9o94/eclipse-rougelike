import {render,screen,fireEvent,within} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import HistoryPanel from '../second-dawn-game/HistoryPanel';
it('shows ordered public actions and lets a player retrieve earlier actions without submitting a game command',()=>{const load=vi.fn();render(<HistoryPanel feed={{entries:[{revision:42,actorSeatId:'ai',actorName:'Hydran Progress',round:2,summary:'Researched Gluon Computer',details:['Computer +3 unlocked.']},{revision:41,actorSeatId:'human',actorName:'Eridani Empire',round:2,summary:'Passed',details:[]}],hasOlder:true,loading:false,loadingOlder:false,error:null,loadOlder:load}}/>);expect(screen.getByRole('log',{name:'Match actions'})).toBeInTheDocument();expect(screen.getByText('Researched Gluon Computer')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Load earlier actions'}));expect(load).toHaveBeenCalledOnce();});

it('groups consecutively committed actions by authoritative turn and exposes exact slot changes',()=>{
 const actor={actorSeatId:'ai',actorName:'Hydran Progress',round:2,phase:'action' as const,details:[]};
 render(<HistoryPanel feed={{entries:[
  {...actor,revision:42,actionTurnSerial:9,summary:'Ended the action'},
  {...actor,revision:41,actionTurnSerial:9,summary:'Upgraded ship blueprints',presentation:{kind:'upgrade',shipTypes:['interceptor'],changes:[{shipType:'interceptor',slot:0,before:'ion-cannon',after:'hull'}]}},
  {...actor,revision:40,actionTurnSerial:8,summary:'Explored a frontier'},
 ],hasOlder:false,loading:false,loadingOlder:false,error:null,loadOlder:vi.fn()}}/>);
 const current=screen.getByRole('group',{name:'Turn 10 · Hydran Progress'});
 expect(within(current).getByText('Ended the action')).toBeInTheDocument();
 expect(within(current).getByText('Upgraded ship blueprints')).toBeInTheDocument();
 fireEvent.click(within(current).getByText('1 slot changed'));
 expect(within(current).getByText('Ion Cannon')).toBeVisible();
 expect(within(current).getByText('Hull')).toBeVisible();
 expect(screen.getByRole('group',{name:'Turn 9 · Hydran Progress'})).toHaveTextContent('Explored a frontier');
});
