import {fireEvent,render,screen} from '@testing-library/react';
import {describe,expect,it,vi} from 'vitest';
import ActionQueuePanel from './ActionQueuePanel';
import type {GameCommand,PlayerView} from '../../shared/eclipse/types';

describe('ActionQueuePanel',()=>{
 it('shows a pause reason and keeps an invalid step available to edit',()=>{
  const onSave=vi.fn();
  render(<ActionQueuePanel queue={{status:'paused',currentIndex:0,pauseReason:'Technology is no longer available.',steps:[{id:'a',command:{type:'research',tileId:'fusion-source',track:'grid'}}]}} candidates={[]} disabled={false} onClose={()=>{}} onSave={onSave} onStart={()=>{}} onPause={()=>{}} onResume={()=>{}}/>);
  expect(screen.getByRole('alert').textContent).toContain('Technology is no longer available.');
  fireEvent.click(screen.getByRole('button',{name:/remove research/i}));
  expect(onSave).toHaveBeenCalledWith([]);
 });
 it('can reorder planned commands before starting',()=>{
  const onSave=vi.fn();
  render(<ActionQueuePanel queue={{status:'draft',currentIndex:0,steps:[{id:'a',command:{type:'pass'}},{id:'b',command:{type:'finish-upkeep'}}]}} candidates={[]} disabled={false} onClose={()=>{}} onSave={onSave} onStart={()=>{}} onPause={()=>{}} onResume={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Move step 2 earlier'}));
  expect(onSave).toHaveBeenCalledWith([{id:'b',command:{type:'finish-upkeep'}},{id:'a',command:{type:'pass'}}]);
 });
 it('authors a move referencing a ship from an earlier queued build',()=>{
  const onSave=vi.fn();
  const view={viewerSeatId:'human',seats:[],ships:[],sectors:[{id:'home',tileId:'101'},{id:'neighbor',tileId:'102'}],technologyMarket:[]} as unknown as PlayerView;
  render(<ActionQueuePanel view={view} queue={{status:'draft',currentIndex:0,steps:[{id:'build1',command:{type:'build',builds:[{component:'interceptor',sectorId:'home'}]}}]}} candidates={[]} disabled={false} onClose={()=>{}} onSave={onSave} onStart={()=>{}} onPause={()=>{}} onResume={()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Future built ship'),{target:{value:'built:build1:0'}});
  fireEvent.change(screen.getByLabelText('Future move destination'),{target:{value:'neighbor'}});
  fireEvent.click(screen.getByRole('button',{name:'Add Move'}));
  expect(onSave.mock.calls[0][0][1].command).toEqual({type:'move',moves:[{shipId:{kind:'built-ship',stepId:'build1',buildIndex:0},path:['neighbor']}]});
 });
 it('can retarget a later build to a coordinate explored by an earlier step',()=>{
  const onSave=vi.fn();
  const view={viewerSeatId:'human',seats:[],ships:[],sectors:[],technologyMarket:[]} as unknown as PlayerView;
  render(<ActionQueuePanel view={view} queue={{status:'draft',currentIndex:0,steps:[{id:'explore1',command:{type:'explore',position:{q:1,r:0}}},{id:'build1',command:{type:'build',builds:[{component:'interceptor',sectorId:'home'}]}}]}} candidates={[]} disabled={false} onClose={()=>{}} onSave={onSave} onStart={()=>{}} onPause={()=>{}} onResume={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Edit step 2'}));
  fireEvent.change(screen.getByLabelText('Target 1 for step 2'),{target:{value:'coordinate:1,0'}});
  expect(onSave.mock.calls[0][0][1].command).toEqual({type:'build',builds:[{component:'interceptor',sectorId:{kind:'sector-coordinate',position:{q:1,r:0}}}]});
 });
 it('lets the player acknowledge a final-step decision pause with no steps remaining',()=>{
  const onResume=vi.fn();
  render(<ActionQueuePanel queue={{status:'paused',currentIndex:1,pauseReason:'Resolve your exploration choice.',steps:[{id:'explore1',command:{type:'explore',position:{q:1,r:0}}}]}} candidates={[]} disabled={false} onClose={()=>{}} onSave={()=>{}} onStart={()=>{}} onPause={()=>{}} onResume={onResume}/>);
  expect(screen.getByRole('alert').textContent).toContain('Resolve your exploration choice.');
  fireEvent.click(screen.getByRole('button',{name:'Resume queue'}));
  expect(onResume).toHaveBeenCalledOnce();
 });
 it.each<GameCommand>([
  {type:'colonize',placements:[{sectorId:'home',squareId:'a',resource:'money'}]},
  {type:'trade',from:'money',to:'science',amount:2},
  {type:'pass'},
  {type:'finish-upkeep'},
  {type:'convert-colony-ship',resource:'materials'},
  {type:'offer-diplomacy',to:'other',resource:'science'},
 ])('adds $type from the current command choices',command=>{
  const onSave=vi.fn();
  render(<ActionQueuePanel queue={null} candidates={[{command,label:command.type,description:'Available action'}]} disabled={false} onClose={()=>{}} onSave={onSave} onStart={()=>{}} onPause={()=>{}} onResume={()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Add a currently available action'),{target:{value:'0'}});
  fireEvent.click(screen.getByRole('button',{name:'Add'}));
  expect(onSave.mock.calls[0][0][0].command).toEqual(command);
 });
});
