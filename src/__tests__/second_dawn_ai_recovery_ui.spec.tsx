import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
it('keeps the AI recovery button available while human game commands are locked by takeover',()=>{
 const state=createGame({seed:42,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'human'}]});const view=getPlayerView(state,'a')!;const retry=vi.fn();
 render(<SecondDawnBoard view={view} candidates={[]} connected busy aiTakeover aiFailure="Search interrupted" onRetryAi={retry} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 const button=screen.getByRole('button',{name:'AI paused · retry'});expect(button).toBeEnabled();fireEvent.click(button);expect(retry).toHaveBeenCalledOnce();
});
