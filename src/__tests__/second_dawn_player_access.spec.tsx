import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import PlayerAccessPanel from '../second-dawn-game/PlayerAccessPanel';
afterEach(cleanup);
it('explains replacement before requesting a fresh private recovery code',async()=>{
 const rotate=vi.fn().mockResolvedValue({recoveryCode:'replacement-test-code'});render(<PlayerAccessPanel profile={{username:'Captain',pinEnabled:false}} disabled={false} onRegister={vi.fn()} onLogin={vi.fn()} onRotateRecoveryCode={rotate}/>);fireEvent.click(screen.getByRole('button',{name:'Recovery code'}));expect(rotate).not.toHaveBeenCalled();expect(screen.getByText(/previous recovery code will stop working/i)).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Generate replacement code'}));expect(await screen.findByLabelText('Private recovery code')).toHaveValue('replacement-test-code');
});
it('registers the current player with an optional PIN and shows a private recovery code',async()=>{
 const register=vi.fn().mockResolvedValue({profile:{username:'Captain',pinEnabled:false},recoveryCode:'private-test-recovery-code'});
 render(<PlayerAccessPanel profile={null} disabled={false} onRegister={register} onLogin={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Save player profile'}));fireEvent.change(screen.getByLabelText('Player username'),{target:{value:'Captain'}});fireEvent.click(screen.getByRole('button',{name:'Create player profile'}));
 await waitFor(()=>expect(register).toHaveBeenCalledExactlyOnceWith('Captain',undefined));expect(await screen.findByLabelText('Private recovery code')).toHaveValue('private-test-recovery-code');expect(screen.getByText(/current games and seats stay with this player/i)).toBeVisible();
});
it('requires a secret for sign-in and reports failed authentication without replacing the profile',async()=>{
 const login=vi.fn().mockRejectedValue(new Error('Sign-in failed. Check your username and secret.'));
 render(<PlayerAccessPanel profile={null} disabled={false} onRegister={vi.fn()} onLogin={login}/>);fireEvent.click(screen.getByRole('button',{name:'Sign in'}));fireEvent.change(screen.getByLabelText('Player username'),{target:{value:'Captain'}});expect(screen.getByRole('button',{name:'Continue as player'})).toBeDisabled();fireEvent.change(screen.getByLabelText('PIN or recovery code'),{target:{value:'123456'}});fireEvent.click(screen.getByRole('button',{name:'Continue as player'}));expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in failed');expect(login).toHaveBeenCalledWith('Captain','123456');
});
