import {act,cleanup,fireEvent,render,renderHook,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import type {PublicHistoryEntry} from '../../shared/eclipse/history';
import {galaxyChanges,useAiPresentation} from '../second-dawn-game/useAiPresentation';
import AiActivityBar from '../second-dawn-game/AiActivityBar';
function fixture(){return getPlayerView(createGame({seed:13,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;}
afterEach(()=>{cleanup();vi.useRealTimers();localStorage.clear();});
it('tracks public ship movement and changed sectors without inventing a movement for new ships',()=>{
 const before=fixture(),after=structuredClone(before),ship=after.ships[0];const from=ship.sectorId,to=after.sectors.find(s=>s.id!==from)!.id;ship.sectorId=to;after.ships.push({...ship,id:'built-ship'});const change=galaxyChanges(before,after);expect(change.moves).toEqual([{from,to}]);expect(change.affectedSectorIds).toEqual(expect.arrayContaining([from,to]));
});
it('does not animate historical state on mount; highlights a new AI revision and clears motion',()=>{
 vi.useFakeTimers();const before=fixture();before.activeSeatId='b';const after=structuredClone(before);after.revision++;after.sectors[0].owner='b';
 const {result,rerender}=renderHook(({view,enabled})=>useAiPresentation(view,[],enabled),{initialProps:{view:before,enabled:true}});
 expect(result.current.activity).toBeUndefined();rerender({view:after,enabled:true});expect(result.current.activity?.affectedSectorIds).toContain(after.sectors[0].id);act(()=>vi.advanceTimersByTime(1100));expect(result.current.activity).toBeUndefined();
});
it('shows a new public AI result after the turn returns to the human; motion off keeps the explanation',()=>{
 vi.useFakeTimers();const before=fixture();before.activeSeatId='b';const after=structuredClone(before);after.revision++;after.activeSeatId='a';
 const entry:PublicHistoryEntry={revision:after.revision,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Researched Improved Hull',details:[]};
 const {result,rerender}=renderHook(({view,entries,enabled})=>useAiPresentation(view,entries,enabled),{initialProps:{view:before,entries:[] as PublicHistoryEntry[],enabled:false}});
 rerender({view:after,entries:[entry],enabled:false});expect(result.current.recent?.summary).toBe('Researched Improved Hull');expect(result.current.activity).toBeUndefined();expect(result.current.actor).toBeNull();
 const change=vi.fn();render(<AiActivityBar actor={result.current.actor} recent={result.current.recent} humanTurn finished={false} motionEnabled={false} onMotionChange={change} onWatch={vi.fn()}/>);
 expect(screen.getByRole('status')).toHaveTextContent('Your turn');expect(screen.getByRole('status')).toHaveTextContent('Hydran Progress');expect(screen.getByRole('status')).toHaveTextContent('Researched Improved Hull');fireEvent.click(screen.getByRole('button',{name:'Animations'}));expect(change).toHaveBeenCalledWith(true);
});

it('clears a previous effect on the next human revision and does not animate human changes',()=>{
 const before=fixture();before.activeSeatId='b';const ai=structuredClone(before);ai.revision++;ai.activeSeatId='a';ai.sectors[0].owner='b';const human=structuredClone(ai);human.revision++;human.sectors[1].owner='a';
 const {result,rerender}=renderHook(({view})=>useAiPresentation(view,[],true),{initialProps:{view:before}});rerender({view:ai});expect(result.current.activity).toBeDefined();rerender({view:human});expect(result.current.activity).toBeUndefined();
});
it('does not replay an old public AI summary after it expires or is refetched',()=>{
 vi.useFakeTimers();const before=fixture();const entry:PublicHistoryEntry={revision:1,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Passed',details:[]};const after={...before,revision:1};
 const {result,rerender}=renderHook(({view,entries})=>useAiPresentation(view,entries,true),{initialProps:{view:before,entries:[] as PublicHistoryEntry[]}});rerender({view:after,entries:[entry]});expect(result.current.recent).toBeDefined();act(()=>vi.advanceTimersByTime(6000));expect(result.current.recent).toBeNull();rerender({view:after,entries:[{...entry}]});expect(result.current.recent).toBeNull();
});
it('shows a paused AI rather than claiming it is choosing an action after a job failure',()=>{
 const actor=fixture().seats.find(s=>s.id==='b')!;render(<AiActivityBar actor={actor} recent={null} humanTurn={false} finished={false} paused motionEnabled onMotionChange={vi.fn()} onWatch={vi.fn()}/>);expect(screen.getByRole('status')).toHaveTextContent('AI paused');expect(screen.queryByText('Choosing an action…')).toBeNull();
});
it('keeps the motion lifetime across same-revision status refreshes',()=>{
 vi.useFakeTimers();const before=fixture();before.activeSeatId='b';const after=structuredClone(before);after.revision++;after.sectors[0].owner='b';const {result,rerender}=renderHook(({view})=>useAiPresentation(view,[],true),{initialProps:{view:before}});rerender({view:after});act(()=>vi.advanceTimersByTime(300));rerender({view:structuredClone(after)});expect(result.current.activity).toBeDefined();act(()=>vi.advanceTimersByTime(750));expect(result.current.activity).toBeUndefined();
});
it('lets the player bring AI activity onto the galaxy without forcing a camera jump',()=>{
 const watch=vi.fn();render(<AiActivityBar actor={fixture().seats.find(s=>s.id==='b')!} recent={null} humanTurn={false} finished={false} motionEnabled onMotionChange={vi.fn()} onWatch={watch}/>);expect(watch).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Watch AI'}));expect(watch).toHaveBeenCalledOnce();
});
it('announces a pending human choice as a decision',()=>{
 render(<AiActivityBar actor={null} recent={null} humanTurn humanDecision finished={false} motionEnabled onMotionChange={vi.fn()} onWatch={vi.fn()}/>);expect(screen.getByRole('status')).toHaveTextContent('Your decision');expect(screen.getByRole('status')).not.toHaveTextContent('Choose your next action');
});
it('keeps the last meaningful public action visible through bookkeeping until the next action',()=>{
 const before=fixture();before.activeSeatId='b';const research:PublicHistoryEntry={revision:1,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Researched Improved Hull',details:[],presentation:{kind:'research',technologyId:'improved-hull'}};const ended:PublicHistoryEntry={revision:2,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Ended the action',details:[]};
 const {result,rerender}=renderHook(({view,entries})=>useAiPresentation(view,entries,true),{initialProps:{view:before,entries:[] as PublicHistoryEntry[]}});expect(result.current.action).toBeNull();rerender({view:{...before,revision:1},entries:[research]});expect(result.current.action?.presentation?.kind).toBe('research');rerender({view:{...before,revision:2},entries:[ended,research]});expect(result.current.recent?.summary).toBe('Ended the action');expect(result.current.action?.presentation?.kind).toBe('research');
});
