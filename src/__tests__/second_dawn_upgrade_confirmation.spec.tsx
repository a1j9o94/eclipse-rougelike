// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import BlueprintEditor from '../second-dawn-game/BlueprintEditor';
import {initialBlueprints} from '../../shared/eclipse/blueprints';
afterEach(cleanup);
function props(){return {faction:'terran-directorate' as const,blueprint:initialBlueprints('terran-directorate')[0],technologies:[],storedParts:[],capacity:1,disabled:false,onSubmit:vi.fn()};}
function installHull(){fireEvent.click(screen.getByRole('button',{name:'Slot 4: Empty slot'}));fireEvent.click(screen.getByRole('button',{name:'Install Hull in slot 4'}));}
it('proactively offers confirmation when the final upgrade is fitted and submits only on explicit confirmation',()=>{
 const p=props();render(<BlueprintEditor {...p}/>);installHull();
 const dialog=screen.getByRole('dialog',{name:'Upgrades ready to apply'});
 expect(dialog).toHaveTextContent('Slot 4: Empty → Hull');
 expect(within(dialog).getByRole('button',{name:'Apply 1 upgrade'})).toHaveFocus();
 expect(p.onSubmit).not.toHaveBeenCalled();
 fireEvent.click(within(dialog).getByRole('button',{name:'Apply 1 upgrade'}));
 expect(p.onSubmit).toHaveBeenCalledExactlyOnceWith({type:'upgrade',blueprints:[{...p.blueprint,parts:[null,null,null,'hull']}]});
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('keeps the completed draft after dismissal without repeating the prompt on rerenders or reopening the picker',()=>{
 const p=props(),ui=render(<BlueprintEditor {...p}/>);installHull();
 fireEvent.click(screen.getByRole('button',{name:'Keep editing'}));
 ui.rerender(<BlueprintEditor {...p}/>);
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Apply 1 upgrade'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Slot 4: Hull'}));
 fireEvent.click(screen.getByRole('button',{name:'Close component picker'}));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(p.onSubmit).not.toHaveBeenCalled();
});
it('waits for a full valid draft and for saving to finish',()=>{
 const p=props(),ui=render(<BlueprintEditor {...p} capacity={2}/>);installHull();
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 ui.rerender(<BlueprintEditor {...p} disabled/>);expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 ui.rerender(<BlueprintEditor {...p}/>);expect(screen.getByRole('dialog',{name:'Upgrades ready to apply'})).toBeInTheDocument();
});
it('does not prompt for an invalid full draft',()=>{
 const p=props();render(<BlueprintEditor {...p} initialDraft={{...p.blueprint,parts:[null,null,null,'plasma-cannon']}}/>);
 // This full draft requires technology the player has not researched.
 expect(screen.getByRole('button',{name:/Apply .*upgrades?/})).toBeDisabled();
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
