import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import MobileActionPicker from '../second-dawn-game/MobileActionPicker';
import MobileNavigation from '../second-dawn-game/MobileNavigation';
import AutoPassControl from '../second-dawn-game/AutoPassControl';

afterEach(cleanup);

it('groups ordinary and other options in the mobile action sheet', () => {
  const select = vi.fn();
  render(<MobileActionPicker options={[
    { type: 'explore', label: 'Explore', description: 'Choose a frontier', disabled: false },
    { type: 'research', label: 'Research', description: 'Choose technology', disabled: false },
    { type: 'colonize', label: 'Colonize', description: 'Populate planets', disabled: false },
    { type: 'trade', label: 'Convert', description: 'Convert resources', disabled: false },
  ]} onSelect={select} />);
  expect(within(screen.getByRole('group', { name: 'Ordinary actions' })).getAllByRole('button')).toHaveLength(2);
  expect(within(screen.getByRole('group', { name: 'Other options' })).getAllByRole('button')).toHaveLength(2);
  expect(screen.getByRole('button', { name: /Trade/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Research/ }));
  expect(select).toHaveBeenCalledExactlyOnceWith('research');
});

it('keeps the mobile turn control next to Choose action', () => {
  const pass = vi.fn();
  render(<MobileNavigation selected="Galaxy" onSelect={vi.fn()} onActions={vi.fn()} pending={false} onDecision={vi.fn()} onBack={vi.fn()} onTurn={{ label: 'Pass +2 money', disabled: false, submit: pass }} />);
  expect(screen.getByRole('button', { name: 'Choose action' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Pass +2 money' }));
  expect(pass).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('navigation', { name: 'Mobile game navigation' })).toBeInTheDocument();
});
it('uses the turn area for auto-pass after a player has passed', () => {
  const change = vi.fn();
  render(<MobileNavigation selected="Galaxy" onSelect={vi.fn()} pending={false} onDecision={vi.fn()} onBack={vi.fn()} afterPass={<AutoPassControl enabled={false} paused={false} disabled={false} onChange={change}/>} />);
  const footer = screen.getByRole('contentinfo');
  fireEvent.click(within(footer).getByRole('checkbox', { name: 'Auto-pass unless attacked' }));
  expect(change).toHaveBeenCalledExactlyOnceWith(true);
});
