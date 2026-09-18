// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import type {GameState,PlayerView} from '../../shared/eclipse/types';
import fixtures from '../second-dawn-game/reviewFixtures.json?raw';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';

afterEach(cleanup);

function actionView(action:'research'|'upgrade'){
 const state=createGame({seed:19,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});
 state.engine!.action={owner:'a',action,remaining:1};
 return getPlayerView(state,'a')!;
}
function controls(view:PlayerView){return {candidates:legalCommands(view),connected:true,busy:false,status:'',onSubmit:vi.fn(),onMenu:vi.fn()};}
function handedOff(view:PlayerView,revision=view.revision+1){return {...view,activeSeatId:'b',revision};}

it('waits for a newer accepted receipt before leaving desktop Research, then preserves later navigation',()=>{
 const initial=actionView('research'),props=controls(initial),rendered=render(<SecondDawnBoard view={initial} {...props}/>);
 fireEvent.click(screen.getAllByRole('button',{name:'Research',exact:true})[0]);
 fireEvent.click(screen.getByRole('button',{name:'Done researching'}));
 expect(props.onSubmit).toHaveBeenCalledWith({type:'end-action'});
 const stale=handedOff(initial,initial.revision);
 rendered.rerender(<SecondDawnBoard view={stale} {...props} lastAcceptedCommand={{revision:initial.revision,type:'end-action'}}/>);
 expect(screen.getByRole('heading',{name:'Research'})).toBeInTheDocument();
 const accepted=handedOff(initial);
 rendered.rerender(<SecondDawnBoard view={accepted} {...controls(accepted)} lastAcceptedCommand={{revision:accepted.revision,type:'end-action'}}/>);
 expect(screen.getByRole('group',{name:'Galaxy map'})).toBeInTheDocument();
 fireEvent.click(screen.getAllByRole('button',{name:'Research',exact:true})[0]);
 rendered.rerender(<SecondDawnBoard view={{...accepted,revision:accepted.revision+1}} {...controls(accepted)} lastAcceptedCommand={{revision:accepted.revision,type:'end-action'}}/>);
 expect(screen.getByRole('heading',{name:'Research'})).toBeInTheDocument();
});

it('returns a player who passes from Upgrade to Galaxy even with Follow AI off',()=>{
 const initial=actionView('upgrade'),props={...controls(initial),candidates:[...legalCommands(initial),{command:{type:'pass'} as const,label:'Pass for this round',description:''}]},rendered=render(<SecondDawnBoard view={initial} {...props}/>);
 fireEvent.click(screen.getAllByRole('button',{name:'Upgrade',exact:true})[0]);
 fireEvent.click(screen.getByRole('button',{name:'Follow AI'}));
 fireEvent.click(screen.getByRole('button',{name:'Pass for this round'}));
 expect(props.onSubmit).toHaveBeenCalledWith({type:'pass'});
 const accepted=handedOff(initial);
 rendered.rerender(<SecondDawnBoard view={accepted} {...controls(accepted)} lastAcceptedCommand={{revision:accepted.revision,type:'pass'}}/>);
 expect(screen.getByRole('group',{name:'Galaxy map'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Follow AI'})).toHaveAttribute('aria-pressed','false');
});

it('lets an authoritative pending decision keep priority over the handoff redirect',()=>{
 const initial=actionView('research'),props=controls(initial),rendered=render(<SecondDawnBoard view={initial} {...props}/>);
 fireEvent.click(screen.getAllByRole('button',{name:'Research',exact:true})[0]);
 fireEvent.click(screen.getByRole('button',{name:'Done researching'}));
 const decisionState=(JSON.parse(fixtures) as Record<string,GameState>).combat;
 const decision=decisionState.pendingDecision!;
 const accepted={...handedOff(initial),pendingDecision:decision};
 rendered.rerender(<SecondDawnBoard view={accepted} {...controls(accepted)} lastAcceptedCommand={{revision:accepted.revision,type:'end-action'}}/>);
 expect(screen.getAllByRole('heading',{name:/Combat allocation/i})).not.toHaveLength(0);
 expect(screen.queryByRole('group',{name:'Galaxy map'})).toBeNull();
});
