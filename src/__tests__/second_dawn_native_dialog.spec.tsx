// @vitest-environment jsdom
import {StrictMode} from 'react';
import {act,fireEvent,render,screen} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import GameDialog from '../second-dawn-game/GameDialog';

it('opens natively, focuses the surface, and leaves Tab handling to the browser',()=>{
 render(<GameDialog title="Review" onClose={vi.fn()}><button>Continue</button></GameDialog>);
 const dialog=screen.getByRole('dialog',{name:'Review'});
 expect(dialog).toBeInstanceOf(HTMLDialogElement);expect(dialog).toHaveAttribute('open');expect(dialog).toHaveFocus();
 expect(fireEvent.keyDown(dialog,{key:'Tab'})).toBe(true);
 expect(fireEvent.keyDown(dialog,{key:'Tab',shiftKey:true})).toBe(true);
});
it('closes exactly once on native cancel, even if a close event follows',()=>{
 const close=vi.fn();render(<GameDialog title="Review" onClose={close}>Review</GameDialog>);
 const dialog=screen.getByRole('dialog');const cancel=new Event('cancel',{cancelable:true});fireEvent(dialog,cancel);
 expect(cancel.defaultPrevented).toBe(true);expect(dialog).not.toHaveAttribute('open');
 fireEvent(dialog,new Event('close'));expect(close).toHaveBeenCalledTimes(1);
});
it('survives StrictMode cleanup and stale close events and uses the latest callback',()=>{
 const before=vi.fn(),after=vi.fn();const ui=render(<StrictMode><GameDialog title="Review" onClose={before}>Review</GameDialog></StrictMode>);
 const dialog=screen.getByRole('dialog');expect(dialog).toHaveAttribute('open');expect(before).not.toHaveBeenCalled();
 fireEvent(dialog,new Event('close'));expect(before).not.toHaveBeenCalled();
 ui.rerender(<StrictMode><GameDialog title="Review" onClose={after}>Review</GameDialog></StrictMode>);
 fireEvent.click(screen.getByRole('button',{name:'Close review'}));fireEvent(dialog,new Event('close'));
 expect(before).not.toHaveBeenCalled();expect(after).toHaveBeenCalledTimes(1);
});
it('accepts native form/programmatic close and does not report unmount as dismissal',async()=>{
 const close=vi.fn();const ui=render(<GameDialog title="Review" onClose={close}>Review</GameDialog>);
 const dialog=screen.getByRole('dialog') as HTMLDialogElement;
 await act(async()=>dialog.close());expect(close).toHaveBeenCalledTimes(1);ui.unmount();expect(close).toHaveBeenCalledTimes(1);
 const next=render(<GameDialog title="Review" onClose={close}>Review</GameDialog>);next.unmount();expect(close).toHaveBeenCalledTimes(1);
});
it('requires a backdrop press and release and honors the dismissal policy',()=>{
 const close=vi.fn();const ui=render(<GameDialog title="Review" onClose={close}><button>Inside</button></GameDialog>);
 const backdrop=screen.getByRole('dialog'),inside=screen.getByRole('button',{name:'Inside'});
 fireEvent.pointerDown(inside);fireEvent.pointerUp(backdrop);fireEvent.click(backdrop);expect(close).not.toHaveBeenCalled();
 fireEvent.pointerDown(backdrop);fireEvent.pointerUp(inside);fireEvent.click(backdrop);expect(close).not.toHaveBeenCalled();
 fireEvent.pointerDown(backdrop);fireEvent.pointerUp(backdrop);fireEvent.click(backdrop);expect(close).toHaveBeenCalledTimes(1);
 ui.unmount();render(<GameDialog title="Required" onClose={close} dismissOnBackdrop={false}>Review</GameDialog>);
 const required=screen.getByRole('dialog');fireEvent.pointerDown(required);fireEvent.pointerUp(required);fireEvent.click(required);expect(close).toHaveBeenCalledTimes(1);
});
it('focuses only an enabled primary action when requested and restores its connected invoker',()=>{
 const trigger=document.createElement('button');document.body.append(trigger);trigger.focus();
 const ui=render(<GameDialog title="Review" onClose={vi.fn()} focusPrimary><button className="dg-primary" disabled>Unavailable</button><button className="dg-primary">Continue</button></GameDialog>);
 expect(screen.getByRole('button',{name:'Continue'})).toHaveFocus();ui.unmount();expect(trigger).toHaveFocus();trigger.remove();
});

it('keeps Escape from minimizing a containing workspace while leaving native cancel enabled',()=>{
 const ancestor=vi.fn(),close=vi.fn();render(<div onKeyDown={ancestor}><GameDialog title="Review" onClose={close}>Review</GameDialog></div>);
 const dialog=screen.getByRole('dialog');expect(fireEvent.keyDown(dialog,{key:'Escape'})).toBe(true);expect(ancestor).not.toHaveBeenCalled();expect(close).not.toHaveBeenCalled();
 fireEvent(dialog,new Event('cancel',{cancelable:true}));expect(close).toHaveBeenCalledOnce();
});
it('closes safely when the invoking control has been removed and can be reopened',()=>{
 const trigger=document.createElement('button');document.body.append(trigger);trigger.focus();
 const close=vi.fn(),ui=render(<GameDialog title="Review" onClose={close}>Review</GameDialog>);trigger.remove();
 fireEvent.click(screen.getByRole('button',{name:'Close review'}));expect(close).toHaveBeenCalledOnce();ui.unmount();
 render(<GameDialog title="Review" onClose={close}>Review</GameDialog>);expect(screen.getByRole('dialog')).toHaveAttribute('open');expect(screen.getByRole('dialog')).toHaveFocus();
});
