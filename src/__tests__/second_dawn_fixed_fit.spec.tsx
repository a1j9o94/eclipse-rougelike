import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {processGameCommand} from '../../shared/eclipse/engine';
import {legalCommands} from '../../shared/eclipse/legal';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {createGame} from '../../shared/eclipse/setup';
import type {GameCommand,PlayerView} from '../../shared/eclipse/types';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';

afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});

function expectFitted(container:HTMLElement){
 const map=container.querySelector<SVGSVGElement>('svg[aria-label="Galaxy map"]')!;
 const [x,y,width,height]=map.getAttribute('viewBox')!.split(' ').map(Number);
 const center={x:x+width/2,y:y+height/2};
 expect(map.querySelector('[data-galaxy-camera]')).toHaveAttribute('transform',`translate(${center.x} ${center.y}) scale(1) translate(${-center.x} ${-center.y})`);
 return map;
}

it('keeps the galaxy fitted through a real exploration and an opponent turn, and restores the preference on remount',()=>{
 vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query.includes('max-width'),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 let state=createGame({seed:1703,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
 let view=getPlayerView(state,'a')!;
 const onSubmit=vi.fn((command:GameCommand)=>{
  const result=processGameCommand(state,'a',command);
  if(!result.ok)throw Error(result.error.message);
  state={...result.state,revision:state.revision+1};
  view=getPlayerView(state,'a')!;
 });
 const board=(current:PlayerView)=><SecondDawnBoard view={current} candidates={legalCommands(current)} connected busy={false} status="" onSubmit={onSubmit} onMenu={vi.fn()}/>;
 const ui=render(board(view));
 fireEvent.click(screen.getByRole('button',{name:'Zoom in'}));
 expect(screen.getByLabelText('Galaxy zoom')).not.toHaveTextContent('100%');
 fireEvent.click(screen.getByRole('button',{name:'Fixed fit'}));
 expect(screen.getByRole('button',{name:'Fixed fit'})).toHaveAttribute('aria-pressed','true');
 expect(screen.getByRole('button',{name:'Zoom in'})).toBeDisabled();
 const map=expectFitted(ui.container);
 const startingCount=view.sectors.length;
 fireEvent.click(within(map).getAllByRole('button',{name:/^Explore /})[0]);
 expectFitted(ui.container);
 fireEvent.click(screen.getByRole('button',{name:'Draw sector'}));
 ui.rerender(board(view));
 expectFitted(ui.container);
 fireEvent.click(screen.getByRole('button',{name:'Place sector'}));
 expect(view.sectors).toHaveLength(startingCount+1);
 ui.rerender(board({...view,activeSeatId:'b',round:view.round+1}));
 expectFitted(ui.container);
 ui.unmount();
 const reopened=render(board(view));
 expect(screen.getByRole('button',{name:'Fixed fit'})).toHaveAttribute('aria-pressed','true');
 expectFitted(reopened.container);
 fireEvent.click(screen.getByRole('button',{name:'Fixed fit'}));
 expectFitted(reopened.container);
 fireEvent.click(screen.getByRole('button',{name:'Zoom in'}));
 expect(screen.getByLabelText('Galaxy zoom')).toHaveTextContent('120%');
},15000);
