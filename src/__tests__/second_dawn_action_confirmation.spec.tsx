// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import ActionConfirmationNotice from '../second-dawn-game/ActionConfirmationNotice';
import {ActionConfirmationContext} from '../second-dawn-game/actionConfirmationContext';
beforeEach(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));
afterEach(cleanup);
function props(){return {ready:true,noticeKey:'plan-a',title:'Ready to confirm',description:'Your plan is complete.',confirmLabel:'Apply plan',onConfirm:vi.fn()};}
it('preserves explicit confirmation, keyboard focus, and escape dismissal',()=>{
 const p=props();render(<ActionConfirmationNotice {...p}/>);
 const primary=screen.getByRole('button',{name:'Apply plan'});expect(primary).toHaveFocus();
 fireEvent.click(screen.getByRole('dialog').parentElement!);expect(screen.getByRole('dialog')).toBeInTheDocument();
 fireEvent.keyDown(primary,{key:'Escape'});expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(p.onConfirm).not.toHaveBeenCalled();
});
it('waits behind overlays and when hidden, and drops invalidated plans immediately',()=>{
 const p=props(),scope={acknowledged:new Set<string>(),suppressed:true};
 const ui=render(<ActionConfirmationContext.Provider value={scope}><ActionConfirmationNotice {...p}/></ActionConfirmationContext.Provider>);
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 Object.defineProperty(document,'hidden',{configurable:true,value:true});fireEvent(document,new Event('visibilitychange'));
 ui.rerender(<ActionConfirmationNotice {...p}/>);expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 Object.defineProperty(document,'hidden',{configurable:true,value:false});fireEvent(document,new Event('visibilitychange'));
 expect(screen.getByRole('dialog')).toBeInTheDocument();
 ui.rerender(<ActionConfirmationNotice {...p} ready={false}/>);expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(p.onConfirm).not.toHaveBeenCalled();
});
it('remembers dismissal across workspace remounts but prompts for a different complete plan',()=>{
 const p=props(),scope={acknowledged:new Set<string>(),suppressed:false};
 const content=(show:boolean,key='plan-a')=><ActionConfirmationContext.Provider value={scope}>{show&&<ActionConfirmationNotice {...p} noticeKey={key}/>}</ActionConfirmationContext.Provider>;
 const ui=render(content(true));fireEvent.click(screen.getByRole('button',{name:'Keep editing'}));ui.rerender(content(false));ui.rerender(content(true));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();ui.rerender(content(true,'plan-b'));expect(screen.getByRole('dialog')).toBeInTheDocument();
});
