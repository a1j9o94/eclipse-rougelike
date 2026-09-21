import {fireEvent,render,screen,within} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import MovementPlanner from '../second-dawn-game/MovementPlanner';
import GameSettingsPanel from '../second-dawn-game/GameSettingsPanel';
function fixture(){return getPlayerView(createGame({seed:32,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),'a')!;}
it('groups departure editing with the movement title and keeps closing a distinct operation',()=>{
 const view=fixture(),change=vi.fn(),close=vi.fn();render(<MovementPlanner view={view} sourceSectorId={view.sectors.find(s=>s.owner==='a')!.id} selectedTargetId={null} disabled={false} onTargetsChange={vi.fn()} onClose={close} onSubmit={vi.fn()} onChangeSource={change}/>);
 const planner=screen.getByRole('region',{name:'Move fleet'}),header=planner.querySelector('header')!;
 const changeButton=within(header).getByRole('button',{name:'Change departure sector'});fireEvent.click(changeButton);expect(change).toHaveBeenCalledTimes(1);expect(close).not.toHaveBeenCalled();
 fireEvent.click(within(header).getByRole('button',{name:'Close movement planner'}));expect(close).toHaveBeenCalledTimes(1);
});
it('keeps standalone movement usable without a departure callback',()=>{
 render(<MovementPlanner view={fixture()} sourceSectorId={null} selectedTargetId={null} disabled={false} onTargetsChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()}/>);
 expect(screen.queryByRole('button',{name:'Change departure sector'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Close movement planner'})).toBeInTheDocument();
});
it('has one settings exit in its header while toggles continue saving immediately',()=>{
 const close=vi.fn(),motion=vi.fn();render(<GameSettingsPanel motionEnabled onMotionChange={motion} onClose={close}/>);
 const dialog=screen.getByRole('dialog',{name:'Game settings'}),buttons=within(dialog.querySelector('header')!).getAllByRole('button');expect(buttons).toHaveLength(1);
 expect(within(dialog.querySelector('header')!).getByRole('button',{name:'Close settings'})).toBe(buttons[0]);expect(screen.queryByRole('button',{name:'Back to game'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('checkbox',{name:/Animations/}));expect(motion).toHaveBeenCalledWith(false);expect(close).not.toHaveBeenCalled();fireEvent.click(buttons[0]);expect(close).toHaveBeenCalledTimes(1);
});
it('retains Escape and focus restoration when settings close',()=>{
 const close=vi.fn();const trigger=document.createElement('button');document.body.appendChild(trigger);trigger.focus();const rendered=render(<GameSettingsPanel motionEnabled onMotionChange={vi.fn()} onClose={close}/>);
 const dialog=screen.getByRole('dialog',{name:'Game settings'});expect(dialog).toHaveFocus();fireEvent.keyDown(dialog,{key:'Escape'});expect(close).toHaveBeenCalledTimes(1);rendered.unmount();expect(trigger).toHaveFocus();trigger.remove();
});
