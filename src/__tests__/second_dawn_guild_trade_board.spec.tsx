// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';

afterEach(()=>{cleanup();localStorage.clear();});

function board(viewer:'guild'|'buyer'){
 const state=createGame({seed:11,factionProfile:'scifi-v1',seats:[{id:'guild',faction:'spacing-guild',controller:'human'},{id:'buyer',faction:'hydran',controller:'human'}]});
 state.seats[0].resources.materials=5;
 state.seats[1].resources.science=5;
 state.activeSeatId=viewer;
 if(viewer==='buyer')state.guildOffers=[{id:'offer',owner:'guild',give:'materials',receive:'science',remaining:2}];
 const view=getPlayerView(state,viewer);
 const onSubmit=vi.fn();
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={onSubmit} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Trade',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Guild exchange',exact:true}));
 return onSubmit;
}

it('lets the Spacing Guild post a resource offer from the game Trade screen',()=>{
 const onSubmit=board('guild');
 fireEvent.click(screen.getByRole('button',{name:'Post offer'}));
 expect(onSubmit).toHaveBeenCalledWith({type:'guild-offer',give:'materials',receive:'science',amount:1});
});

it('lets another player accept a Guild offer from the game Trade screen',()=>{
 const onSubmit=board('buyer');
 fireEvent.click(screen.getByRole('button',{name:'Select offer: receive materials for science'}));
 fireEvent.click(screen.getByRole('button',{name:'Max',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Pay 2 science · receive 2 materials'}));
 expect(onSubmit).toHaveBeenCalledWith({type:'accept-guild-offer',offerId:'offer',amount:2});
});
