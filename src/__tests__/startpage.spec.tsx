import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import StartPage from '../pages/StartPage';
import { type SavedRun, recordWin, evaluateUnlocks } from '../game/storage';
import { makeShip, getFrame } from '../game';

describe('StartPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('eclipse-progress', JSON.stringify({
      factions: {
        scientists: { unlocked: false, difficulties: [] },
        warmongers: { unlocked: false, difficulties: [] },
        industrialists: { unlocked: true, difficulties: [] },
        raiders: { unlocked: false, difficulties: [] },
        timekeepers: { unlocked: false, difficulties: [] },
        collective: { unlocked: false, difficulties: [] },
      },
      log: [],
    }));
  });

  it('shows battle log and default unlocks', () => {
    render(<StartPage onNewRun={() => {}} />);
    const factions = screen.getAllByTestId('faction-option');
    expect(factions).toHaveLength(1);
    expect(factions[0].textContent).toMatch(/Helios Cartel/);
    expect(screen.getByRole('button', { name: /Easy/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Medium/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Hard/ })).toBeDisabled();
    expect(screen.getByText('Battle Log')).toBeInTheDocument();
    expect(screen.getByText('No battles yet.')).toBeInTheDocument();
  });

  it('disables multiplayer mode until it is implemented', () => {
    render(<StartPage onNewRun={() => {}} />);
    const btn = screen.getByRole('button', { name: /Multiplayer \(Coming Soon\)/ });
    expect(btn).toBeDisabled();
  });

  it('unlocks scientists when research tiers reach three', () => {
    const run: Partial<SavedRun> = {
      research: { Military: 3, Grid: 3, Nano: 3 },
      fleet: [],
    };
    localStorage.setItem('eclipse-run', JSON.stringify(run));
    render(<StartPage onNewRun={() => {}} />);
    const factions = screen.getAllByTestId('faction-option');
    const names = factions.map(f => f.textContent);
    expect(names.some(n => n?.includes('Consortium of Scholars'))).toBe(true);
  });

  it('unlocks warmongers after winning with a cruiser', () => {
    const research = { Military: 1, Grid: 1, Nano: 1 };
    const fleet = [makeShip(getFrame('cruiser'), [])];
    recordWin('industrialists', 'easy', research, fleet);
    render(<StartPage onNewRun={() => {}} />);
    const names = screen.getAllByTestId('faction-option').map(f => f.textContent);
    expect(names.some(n => n?.includes('Crimson Vanguard'))).toBe(true);
  });

  it('unlocks raiders after winning with an interceptor-only fleet', () => {
    const research = { Military: 1, Grid: 1, Nano: 1 };
    const fleet = [
      makeShip(getFrame('interceptor'), []),
      makeShip(getFrame('interceptor'), []),
    ];
    recordWin('industrialists', 'easy', research, fleet);
    render(<StartPage onNewRun={() => {}} />);
    const names = screen.getAllByTestId('faction-option').map(f => f.textContent);
    expect(names.some(n => n?.includes('Void Corsairs'))).toBe(true);
  });

  it('unlocks timekeepers when grid research hits three', () => {
    evaluateUnlocks({ research: { Military: 1, Grid: 3, Nano: 1 }, fleet: [] });
    render(<StartPage onNewRun={() => {}} />);
    const names = screen.getAllByTestId('faction-option').map(f => f.textContent);
    expect(names.some(n => n?.includes('Temporal Vanguard'))).toBe(true);
  });

  it('unlocks collective when nano research hits three', () => {
    evaluateUnlocks({ research: { Military: 1, Grid: 1, Nano: 3 }, fleet: [] });
    render(<StartPage onNewRun={() => {}} />);
    const names = screen.getAllByTestId('faction-option').map(f => f.textContent);
    expect(names.some(n => n?.includes('Regenerative Swarm'))).toBe(true);
  });

  it('gates higher difficulties per faction', () => {
    const research = { Military: 1, Grid: 1, Nano: 1 };
    recordWin('industrialists', 'easy', research, []);
    const { rerender } = render(<StartPage onNewRun={() => {}} />);
    expect(screen.getByRole('button', { name: /Medium/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Hard/ })).toBeDisabled();
    recordWin('industrialists', 'medium', research, []);
    rerender(<StartPage onNewRun={() => {}} />);
    expect(screen.getByRole('button', { name: /Hard/ })).toBeEnabled();
  });
});
