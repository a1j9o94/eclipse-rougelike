import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {RoomSettingsEditor} from '../second-dawn-game/RoomLobby';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
import TurnClock from '../second-dawn-game/TurnClock';

afterEach(cleanup);
it('explains each rules choice accessibly and preserves room rule saving',()=>{
 const save=vi.fn();
 render(<RoomSettingsEditor settings={{humanSeatCount:2,aiCount:2,timerMs:600000,warpPortals:true}} disabled={false} onSave={save}/>);
 const standard=screen.getByRole('radio',{name:'Standard Eclipse'});
 const lessRandom=screen.getByRole('radio',{name:'Régis’s Less Random'});
 expect(standard).toHaveAccessibleDescription(/8 rounds/);
 expect(lessRandom).toHaveAccessibleDescription(/10 rounds/);
 fireEvent.click(lessRandom);
 expect(lessRandom).toBeChecked();
 expect(standard).not.toBeChecked();
 fireEvent.click(screen.getByRole('button',{name:'Save room settings'}));
 expect(save).toHaveBeenCalledWith(expect.objectContaining({rulesMode:'less-random-v1',warpPortals:false}));
});
it.each(['standard','less-random-v1'] as const)('labels compact resource symbols in %s beside a long faction clock',rulesMode=>{
 const state=createGame({seed:9,rulesMode,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]});
 const view=getPlayerView(state,'a')!;
 render(<SecondDawnBoard view={view} candidates={[]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()} turnClock={<TurnClock actorName="Enlightened of Lyra" timer={{status:'active',deadlineAt:Date.now()+600000,targetSeatId:'b',decisionId:null,error:null}}/>}/>);
 for(const resource of ['money','science','materials'] as const){
  const name=resource[0].toUpperCase()+resource.slice(1);
  const counter=screen.getByRole('group',{name:new RegExp(`^${name}: ${view.seats[0].resources[resource]}, income `)});
  expect(counter.querySelector('svg')).toHaveAttribute('aria-hidden','true');
  expect(within(counter).queryByText(name,{exact:true})).toBeNull();
 }
 expect(screen.getByText('Enlightened of Lyra')).toHaveAttribute('title','Enlightened of Lyra');
});
