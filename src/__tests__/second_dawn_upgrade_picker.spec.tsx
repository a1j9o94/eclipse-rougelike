import {render,screen,fireEvent,within,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import BlueprintEditor from '../second-dawn-game/BlueprintEditor';
import {initialBlueprints} from '../../shared/eclipse/blueprints';
afterEach(cleanup);
function mount(){const submit=vi.fn();render(<BlueprintEditor faction="terran-directorate" blueprint={initialBlueprints('terran-directorate')[0]} technologies={['improved-hull','plasma-cannon']} storedParts={[]} capacity={2} disabled={false} onSubmit={submit}/>);return submit;}
it('opens a slot picker only on demand and returns a replacement to the ship without committing',()=>{
 const submit=mount();expect(screen.queryByRole('dialog')).toBeNull();expect(screen.queryByRole('button',{name:'Install Hull in slot 4'})).toBeNull();
 const slot=screen.getByRole('button',{name:'Slot 4: Empty slot'});fireEvent.click(slot);
 const dialog=screen.getByRole('dialog',{name:'Interceptor · slot 4'});expect(within(dialog).getByText('Empty slot')).toBeVisible();
 fireEvent.click(within(dialog).getByRole('button',{name:'Install Improved Hull in slot 4'}));
 expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('button',{name:'Slot 4: Improved Hull'})).toHaveFocus();expect(submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Apply 1 upgrade'}));expect(submit).toHaveBeenCalledOnce();
});
it('filters parts by function and closes with Escape without losing the selected hardpoint',()=>{
 mount();const slot=screen.getByRole('button',{name:'Slot 1: Ion Cannon'});fireEvent.click(slot);
 const dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:'Defense',exact:true}));
 expect(within(dialog).getByRole('button',{name:'Install Improved Hull in slot 1'})).toBeVisible();expect(within(dialog).queryByRole('button',{name:'Install Plasma Cannon in slot 1'})).toBeNull();
 fireEvent.keyDown(dialog,{key:'Escape'});expect(screen.queryByRole('dialog')).toBeNull();expect(slot).toHaveFocus();
});
it.each(['interceptor','cruiser','dreadnought','starbase'] as const)('opens the correct %s slot without changing ship class',shipType=>{
 const blueprint=initialBlueprints('terran-directorate').find(bp=>bp.shipType===shipType)!;
 render(<BlueprintEditor faction="terran-directorate" blueprint={blueprint} technologies={[]} storedParts={[]} capacity={2} disabled={false} onSubmit={vi.fn()}/>);
 fireEvent.click(screen.getAllByRole('button',{name:/^Slot 1:/})[0]);expect(screen.getByRole('dialog',{name:`${shipType[0].toUpperCase()+shipType.slice(1)} · slot 1`})).toBeVisible();
});
it('warns about permanently removing an installed Ancient part before drafting its replacement',()=>{
 const blueprint=initialBlueprints('terran-directorate')[0];blueprint.parts[3]='shard-hull';render(<BlueprintEditor faction="terran-directorate" blueprint={blueprint} technologies={[]} storedParts={[]} capacity={2} disabled={false} onSubmit={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Slot 4: Shard Hull'}));expect(within(screen.getByRole('dialog')).getByText(/Replacing Shard Hull discards it when you apply/)).toBeVisible();
});

it('keeps Apply disabled for a draft that exceeds reactor power or installation capacity',()=>{
 render(<BlueprintEditor faction="terran-directorate" blueprint={initialBlueprints('terran-directorate')[0]} technologies={['plasma-cannon']} storedParts={[]} capacity={1} disabled={false} onSubmit={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Slot 4: Empty slot'}));fireEvent.click(screen.getByRole('button',{name:'Install Plasma Cannon in slot 4'}));expect(screen.getByRole('button',{name:/^Apply/})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Reset draft'}));fireEvent.click(screen.getByRole('button',{name:'Slot 4: Empty slot'}));fireEvent.click(screen.getByRole('button',{name:'Install Hull in slot 4'}));
 fireEvent.click(screen.getByRole('button',{name:'Slot 1: Ion Cannon'}));fireEvent.click(screen.getByRole('button',{name:'Install Hull in slot 1'}));expect(screen.getByRole('button',{name:'Apply 2 upgrades'})).toBeDisabled();expect(screen.getByText('This action allows 1 installed parts.')).toBeVisible();
});
it('reserves one Ancient copy in the draft and makes it available again after reset',()=>{
 render(<BlueprintEditor faction="terran-directorate" blueprint={initialBlueprints('terran-directorate')[0]} technologies={[]} storedParts={['ion-disruptor']} capacity={2} disabled={false} onSubmit={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Slot 4: Empty slot'}));fireEvent.click(screen.getByRole('button',{name:'Install Ion Disruptor in slot 4'}));
 fireEvent.click(screen.getByRole('button',{name:'Slot 1: Ion Cannon'}));expect(screen.queryByRole('button',{name:'Install Ion Disruptor in slot 1'})).toBeNull();fireEvent.click(screen.getByText(/Unavailable components \(/));expect(screen.getByRole('button',{name:/Ion Disruptor blocked:.*reserved/})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Close component picker'}));fireEvent.click(screen.getByRole('button',{name:'Reset draft'}));fireEvent.click(screen.getByRole('button',{name:'Slot 1: Ion Cannon'}));expect(screen.getByRole('button',{name:'Install Ion Disruptor in slot 1'})).toBeEnabled();
});

it('keeps the draft unchanged when selecting the part already active in a printed slot',()=>{
 const submit=mount();fireEvent.click(screen.getByRole('button',{name:'Slot 1: Ion Cannon'}));fireEvent.click(screen.getByRole('button',{name:'Install Ion Cannon in slot 1'}));expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('button',{name:'Apply 0 upgrades'})).toBeDisabled();expect(submit).not.toHaveBeenCalled();
});
