import { act, render, renderHook, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useActivityRecap } from '../second-dawn-session/useActivityRecap';
import ActivityRecap from '../second-dawn-game/ActivityRecap';
import type { HistoryFeed } from '../second-dawn-session/useMatchHistory';
it('freezes a resume boundary while AI advances, acknowledges explicitly, and isolates seats',()=>{
 const {result,rerender}=renderHook(({key,revision,seen})=>useActivityRecap(key,{revision,lastSeenRevision:seen}),{initialProps:{key:'match:seat',revision:10,seen:4 as number|null}});
 expect(result.current.snapshot).toMatchObject({baseline:4,throughRevision:10,open:true});
 rerender({key:'match:seat',revision:12,seen:4});
 expect(result.current.snapshot?.throughRevision).toBe(10);
 act(()=>result.current.dismiss());
 rerender({key:'match:seat',revision:14,seen:10});
 expect(result.current.snapshot?.open).toBe(false);
 act(()=>result.current.resume({revision:14,lastSeenRevision:10}));
 expect(result.current.snapshot).toMatchObject({baseline:10,throughRevision:14,open:true});
 rerender({key:'match:other-seat',revision:14,seen:null});
 expect(result.current.snapshot).toMatchObject({baseline:null,throughRevision:14,open:true});
});
it('does not interrupt a newly created game when its first opponent action arrives',()=>{
 const {result,rerender}=renderHook(({revision})=>useActivityRecap('new',{revision,lastSeenRevision:null}),{initialProps:{revision:0}});
 expect(result.current.snapshot?.open).toBe(false);
 rerender({revision:2});expect(result.current.snapshot?.open).toBe(false);
});
it('shows only the acknowledged interval of public history with honest first-visit wording and explicit continue',()=>{
 const dismiss=vi.fn();const load=vi.fn();
 const feed:HistoryFeed={entries:[12,10,8,4].map(revision=>({revision,round:1,actorSeatId:'ai',actorName:'Hydran',summary:`Action ${revision}`,details:['Public result']})),loading:false,hasOlder:true,loadingOlder:false,error:null,loadOlder:load};
 const {rerender}=render(<ActivityRecap baseline={4} throughRevision={10} feed={feed} disabled={false} saving={false} error={null} onDismiss={dismiss}/>);
 expect(screen.getByRole('heading',{name:'Since you last played'})).toBeInTheDocument();
 expect(screen.getByText('Action 10')).toBeInTheDocument();expect(screen.queryByText('Action 12')).not.toBeInTheDocument();expect(screen.queryByText('Action 4')).not.toBeInTheDocument();expect(dismiss).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Continue game'}));expect(dismiss).toHaveBeenCalledOnce();
 rerender(<ActivityRecap baseline={null} throughRevision={10} feed={feed} disabled={true} saving={false} error={null} onDismiss={dismiss}/>);
 expect(screen.getByRole('heading',{name:'Recent activity'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Continue game'})).toBeDisabled();
});
