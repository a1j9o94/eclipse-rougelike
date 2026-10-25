// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import BlueprintEditor from '../second-dawn-game/BlueprintEditor';
import {initialBlueprints} from '../../shared/eclipse/blueprints';
afterEach(cleanup);
function props(){return {faction:'terran-directorate' as const,blueprint:initialBlueprints('terran-directorate')[0],technologies:[],storedParts:[],capacity:1,disabled:false,onSubmit:vi.fn()};}
function installHull(){fireEvent.click(screen.getByRole('button',{name:'Slot 4: Empty slot'}));fireEvent.click(screen.getByRole('button',{name:'Install Hull in slot 4'}));}
it('keeps the completed order in place with one explicit commit and no readiness dialog',()=>{
 const p=props();render(<BlueprintEditor {...p}/>);installHull();
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(screen.getByText('Slot 4: Empty → Hull')).toBeVisible();
 expect(p.onSubmit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Apply 1 upgrade'}));
 expect(p.onSubmit).toHaveBeenCalledExactlyOnceWith({type:'upgrade',blueprints:[{...p.blueprint,parts:[null,null,null,'hull']}]});
});
it('keeps the completed draft across a render refresh',()=>{
 const p=props(),ui=render(<BlueprintEditor {...p}/>);installHull();

 ui.rerender(<BlueprintEditor {...p}/>);
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Apply 1 upgrade'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Slot 4: Hull'}));
 expect(screen.getByRole('region',{name:'Interceptor · slot 4'})).toBeVisible();
 expect(p.onSubmit).not.toHaveBeenCalled();
});
it('updates the existing commit when saving finishes without interrupting editing',()=>{
 const p=props(),ui=render(<BlueprintEditor {...p} capacity={2}/>);installHull();
 ui.rerender(<BlueprintEditor {...p} disabled/>);
 expect(screen.getByRole('button',{name:'Apply 1 upgrade'})).toBeDisabled();
 ui.rerender(<BlueprintEditor {...p}/>);
 expect(screen.getByRole('button',{name:'Apply 1 upgrade'})).toBeEnabled();
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('does not prompt for an invalid full draft',()=>{
 const p=props();render(<BlueprintEditor {...p} initialDraft={{...p.blueprint,parts:[null,null,null,'plasma-cannon']}}/>);
 // This full draft requires technology the player has not researched.
 expect(screen.getByRole('button',{name:/Apply .*upgrades?/})).toBeDisabled();
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
