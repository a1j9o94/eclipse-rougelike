import AiActivityBar from '../second-dawn-game/AiActivityBar';
import {render,screen,fireEvent} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import AiDifficultyPicker from '../second-dawn-game/AiDifficultyPicker';
describe('visual AI difficulty selection',()=>{
 it('shows the server thinking limits and selects Expert directly',()=>{
  const change=vi.fn();render(<AiDifficultyPicker value="normal" onChange={change}/>);
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(screen.getByRole('button',{name:/Normal/})).toHaveAttribute('aria-pressed','true');
  fireEvent.click(screen.getByRole('button',{name:/Expert/}));expect(change).toHaveBeenCalledWith('expert');
  expect(screen.getByText('Up to 30 seconds per action')).toBeInTheDocument();
 });
 it('warns about accumulated wait and prevents edits when disabled',()=>{
  render(<AiDifficultyPicker value="expert" onChange={vi.fn()} disabled/>);
  expect(screen.getByText(/Several Expert opponents/)).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/Hard/})).toBeDisabled();
 });
});

it('labels a timed-out human as AI takeover while thinking instead of inviting a human move',()=>{
 render(<AiActivityBar takeover thinking actor={null} recent={null} humanTurn finished={false} motionEnabled={false} onMotionChange={vi.fn()} onWatch={vi.fn()}/>);
 expect(screen.getByRole('status')).toHaveTextContent('AI takeover · thinking');
 expect(screen.getByRole('status')).not.toHaveTextContent('Your turn');
});
