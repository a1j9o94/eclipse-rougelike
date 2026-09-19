import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import type {PlayerView} from '../../shared/eclipse/types';
import {ActionDraftProvider} from '../second-dawn-game/ActionDraftProvider';
import {useActionDraftGuard,useActionDraftState} from '../second-dawn-game/actionDraftContext';
import ActionDraftNotice from '../second-dawn-game/ActionDraftNotice';
import TradePanel from '../second-dawn-game/TradePanel';
import {legalCommands} from '../../shared/eclipse/legal';
function initial(){const state=createGame({seed:31,seats:[{id:'a',controller:'human',faction:'terran-directorate'},{id:'b',controller:'ai',faction:'hydran'}]});return getPlayerView(state,'a')!;}
function Harness(){
 const [,action]=useActionDraftState('action','trade');const [,screenName]=useActionDraftState('screen','Trade');const [amount,setAmount]=useActionDraftState('tradeAmount',1);const [,draft]=useActionDraftState('commandDraft',null);const guard=useActionDraftGuard();
 return <><output aria-label="Saved amount">{amount}</output><span>{guard.stale?'Blocked':'Ready'}</span><button onClick={()=>{action('trade');screenName('Trade');setAmount(2);}}>Draft trade</button><button onClick={()=>{action('research');screenName('Research');draft({label:'Fusion Drive',description:'Research',command:{type:'research',tileId:'fusion-drive',track:'nano'}});}}>Draft research</button><button onClick={()=>{action('explore');screenName('Galaxy');}}>Explore instead</button><button onClick={()=>setAmount(value=>value+1)}>Increase</button><button onClick={()=>guard.markSubmitted({type:'trade',from:'money',to:'science',amount})}>Submit trade</button><ActionDraftNotice/></>;
}
function ui(view:PlayerView,receipt?:{revision:number;type:'trade'}){return <ActionDraftProvider matchId="review-match" viewerSeatId="a" revision={view.revision} lastAcceptedCommand={receipt}><Harness/></ActionDraftProvider>;}
afterEach(()=>{cleanup();localStorage.clear();});
it('ignores unrelated authoritative revisions and retains the draft across refresh',()=>{
 const view=initial(),rendered=render(ui(view));fireEvent.click(screen.getByText('Draft trade'));
 const next=structuredClone(view);next.revision++;next.seats[1].resources.money+=5;
 rendered.rerender(ui(next));expect(screen.getByText('Ready')).toBeVisible();rendered.unmount();render(ui(next));expect(screen.getByText('Ready')).toBeVisible();
});
it('does not block exploration with an inactive saved trade after resources change',()=>{
 const view=initial(),rendered=render(ui(view));fireEvent.click(screen.getByText('Draft trade'));fireEvent.click(screen.getByText('Explore instead'));
 const next=structuredClone(view);next.revision++;next.seats[0].resources.money+=3;rendered.rerender(ui(next));expect(screen.getByText('Ready')).toBeVisible();
});
it('keeps choices saved across resource changes without an acknowledgement',()=>{
 const view=initial(),rendered=render(ui(view));fireEvent.click(screen.getByText('Draft trade'));
 const next=structuredClone(view);next.revision++;next.seats[0].resources.money+=3;rendered.rerender(ui(next));expect(screen.getByText('Ready')).toBeVisible();expect(screen.getByLabelText('Saved amount')).toHaveTextContent('2');expect(screen.queryByRole('button',{name:/reviewed|updated choices/i})).toBeNull();const later={...next,revision:next.revision+1};rendered.rerender(ui(later));expect(screen.getByText('Ready')).toBeVisible();
});
it('does not demand review after its own accepted trade',()=>{
 const view=initial(),rendered=render(ui(view));fireEvent.click(screen.getByText('Draft trade'));fireEvent.click(screen.getByText('Submit trade'));
 const next=structuredClone(view);next.revision++;next.seats[0].resources.money-=2;rendered.rerender(ui(next,{revision:next.revision,type:'trade'}));expect(screen.getByText('Ready')).toBeVisible();
});
it('does not add a review step when research conditions change',()=>{
 const view=initial(),rendered=render(ui(view));fireEvent.click(screen.getByText('Draft research'));
 const next=structuredClone(view);next.revision++;next.seats[0].technologies.nano.push('advanced-robotics');rendered.rerender(ui(next));expect(screen.getByText('Ready')).toBeVisible();expect(screen.queryByRole('button',{name:/reviewed|updated choices/i})).toBeNull();
});

it('keeps a newer edited draft when an earlier submission is accepted',()=>{
 const view=initial(),rendered=render(ui(view));fireEvent.click(screen.getByText('Draft trade'));fireEvent.click(screen.getByText('Submit trade'));fireEvent.click(screen.getByText('Increase'));
 const next={...view,revision:view.revision+1};rendered.rerender(ui(next,{revision:next.revision,type:'trade'}));expect(screen.getByLabelText('Saved amount')).toHaveTextContent('3');expect(screen.getByText('Ready')).toBeVisible();
});
it('still blocks an unaffordable saved trade using current legality without a review dialog',()=>{
 const view=initial();view.seats[0].resources.money=10;const submit=vi.fn();
 const trader=(current:PlayerView)=><ActionDraftProvider matchId="trade-legality" viewerSeatId="a" revision={current.revision}><TradePanel view={current} candidates={legalCommands(current)} disabled={false} onSubmit={submit}/><ActionDraftNotice/></ActionDraftProvider>;
 const rendered=render(trader(view));fireEvent.click(screen.getByRole('button',{name:'Increase received amount'}));expect(screen.getByRole('button',{name:'Confirm conversion'})).toBeEnabled();
 const next=structuredClone(view);next.revision++;next.seats[0].resources.money=0;rendered.rerender(trader(next));expect(screen.getByRole('button',{name:'Confirm conversion'})).toBeDisabled();expect(screen.queryByRole('button',{name:/reviewed/i})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Confirm conversion'}));expect(submit).not.toHaveBeenCalled();
});
