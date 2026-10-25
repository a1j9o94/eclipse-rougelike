import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { initialBlueprints, type BlueprintShipType } from '../../shared/eclipse/blueprints';
import BlueprintEditor from '../second-dawn-game/BlueprintEditor';
import { ActionDraftProvider } from '../second-dawn-game/ActionDraftProvider';

afterEach(cleanup);
function Shipyard({capacity=2, storedParts=[]}:{capacity?:number; storedParts?:('ion-disruptor')[]}) {
  const [ship,setShip]=useState<BlueprintShipType>('interceptor');
  const blueprints=initialBlueprints('terran-directorate');
  return <><button onClick={()=>setShip('interceptor')}>Edit interceptor class</button><button onClick={()=>setShip('cruiser')}>Edit cruiser class</button><BlueprintEditor key={ship} faction="terran-directorate" blueprint={blueprints.find(bp=>bp.shipType===ship)!} blueprints={blueprints} technologies={['improved-hull']} storedParts={storedParts} capacity={capacity} disabled={false} onSubmit={submit}/></>;
}
const submit=vi.fn();
afterEach(()=>submit.mockClear());
function fit(slot:string,part:string){fireEvent.click(screen.getByRole('button',{name:slot}));fireEvent.click(screen.getByRole('button',{name:part}));}
it('keeps the component tray beside the ship and supports replacement without reopening',()=>{
 render(<ActionDraftProvider viewerSeatId="a" revision={1}><Shipyard capacity={1}/></ActionDraftProvider>);
 fit('Slot 4: Empty slot','Install Hull in slot 4');
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(screen.getByRole('region',{name:'Interceptor · slot 4'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Install Improved Hull in slot 4'}));
 fireEvent.click(screen.getByRole('button',{name:'Apply 1 upgrade'}));
 expect(submit).toHaveBeenCalledExactlyOnceWith({type:'upgrade',blueprints:[{shipType:'interceptor',parts:[null,null,null,'improved-hull'],outsideParts:[]}]});
});
it('preserves changed classes and commits one order within the total allowance',()=>{
 render(<ActionDraftProvider viewerSeatId="a" revision={1}><Shipyard/></ActionDraftProvider>);
 fit('Slot 4: Empty slot','Install Hull in slot 4');
 fireEvent.click(screen.getByRole('button',{name:'Edit cruiser class'}));
 fit('Slot 6: Empty slot','Install Hull in slot 6');
 expect(screen.getByRole('button',{name:'Apply 2 upgrades'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Edit interceptor class'}));
 expect(screen.getByRole('button',{name:'Slot 4: Hull'})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(screen.getByRole('button',{name:'Apply 2 upgrades'}));
 expect(submit).toHaveBeenCalledOnce();
 expect(submit.mock.calls[0][0].blueprints).toEqual([
 {shipType:'interceptor',parts:[null,null,null,'hull'],outsideParts:[]},
 {shipType:'cruiser',parts:[null,null,null,null,null,'hull'],outsideParts:[]}
 ]);
});
it('limits the whole order and resetting one class preserves the other class',()=>{
 render(<ActionDraftProvider viewerSeatId="a" revision={1}><Shipyard capacity={1}/></ActionDraftProvider>);
 fit('Slot 4: Empty slot','Install Hull in slot 4');
 fireEvent.click(screen.getByRole('button',{name:'Edit cruiser class'}));
 fit('Slot 6: Empty slot','Install Hull in slot 6');
 expect(screen.getByRole('button',{name:'Apply 2 upgrades'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Reset draft'}));
 fireEvent.click(screen.getByRole('button',{name:'Apply 1 upgrade'}));
 expect(submit.mock.calls[0][0].blueprints).toHaveLength(1);
 expect(submit.mock.calls[0][0].blueprints[0].shipType).toBe('interceptor');
});
it('reserves Ancient stock across classes and releases it when that class is reset',()=>{
 render(<ActionDraftProvider viewerSeatId="a" revision={1}><Shipyard storedParts={['ion-disruptor']}/></ActionDraftProvider>);
 fit('Slot 1: Ion Cannon','Install Ion Disruptor in slot 1');
 fireEvent.click(screen.getByRole('button',{name:'Edit cruiser class'}));
 fireEvent.click(screen.getByRole('button',{name:'Slot 2: Ion Cannon'}));
 expect(screen.queryByRole('button',{name:'Install Ion Disruptor in slot 2'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByText(/Unavailable components/));
 expect(screen.getByRole('button',{name:/Ion Disruptor blocked:.*reserved/})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Edit interceptor class'}));
 fireEvent.click(screen.getByRole('button',{name:'Reset draft'}));
 fireEvent.click(screen.getByRole('button',{name:'Edit cruiser class'}));
 fireEvent.click(screen.getByRole('button',{name:'Slot 2: Ion Cannon'}));
 expect(screen.getByRole('button',{name:'Install Ion Disruptor in slot 2'})).toBeEnabled();
});
it('undoes the last component edit without discarding other slots',()=>{
 render(<ActionDraftProvider viewerSeatId="a" revision={1}><Shipyard/></ActionDraftProvider>);
 fit('Slot 4: Empty slot','Install Hull in slot 4');
 fit('Slot 1: Ion Cannon','Install Hull in slot 1');
 fireEvent.click(screen.getByRole('button',{name:'Undo last edit'}));
 expect(screen.getByRole('button',{name:'Slot 1: Ion Cannon'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Slot 4: Hull'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Apply 1 upgrade'}));
 expect(submit.mock.calls[0][0].blueprints[0].parts).toEqual([null,null,null,'hull']);
});
