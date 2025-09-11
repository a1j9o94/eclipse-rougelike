import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import StartPage from '../pages/StartPage';
import { type SavedRun, recordWin, evaluateUnlocks } from '../game/storage';
import { makeShip, getFrame } from '../game';

describe('StartPage', () => {
  beforeEach(() => {
    localStorage.clear();
    // Disable starfield for jsdom (no canvas context)
    localStorage.setItem('ui-starfield-enabled', 'false');
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

  it('shows default unlocks and opens battle log modal', () => {
    render(<StartPage onNewRun={() => {}} />);
    const factions = screen.getAllByTestId('faction-option');
    expect(factions).toHaveLength(1);
    expect(factions[0].textContent).toMatch(/Helios Cartel/);
    // Battle log is hidden until opened
    expect(screen.queryByText('Battle Log')).toBeNull();
    // Open via top-right button
    fireEvent.click(screen.getByRole('button', { name: /Open Battle Log/i }));
    expect(screen.getByText('Battle Log')).toBeInTheDocument();
    expect(screen.getByText('No battles yet.')).toBeInTheDocument();
  });

  it('shows multiplayer options when Convex URL is configured', () => {
    // Provide the env var used by StartPage
    vi.stubEnv('VITE_CONVEX_URL', 'https://example.convex.cloud');
    render(<StartPage onNewRun={() => {}} onMultiplayer={() => {}} />);
    // Open launch sheet, navigate to Versus
    fireEvent.click(screen.getByRole('button', { name: /^Launch$/ }));
    const versusTab = screen.getByRole('button', { name: /^Versus$/ });
    expect(versusTab).toBeEnabled();
    fireEvent.click(versusTab);
    // Expect three options in Versus modal
    expect(screen.getByRole('button', { name: /Create Game/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Join Match/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View Public Matches/i })).toBeInTheDocument();
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

  it('gates higher difficulties per faction inside the Launch sheet', () => {
    const research = { Military: 1, Grid: 1, Nano: 1 };
    recordWin('industrialists', 'easy', research, []);
    const { rerender } = render(<StartPage onNewRun={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^Launch$/ }));
    expect(screen.getByRole('button', { name: /Medium/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Hard/ })).toBeDisabled();
    recordWin('industrialists', 'medium', research, []);
    rerender(<StartPage onNewRun={() => {}} />);
    expect(screen.getByRole('button', { name: /Hard/ })).toBeEnabled();
  });

  it('shows a Continue tab inside the Launch sheet when a save exists', () => {
    const { rerender } = render(<StartPage onNewRun={() => {}} onContinue={() => {}} />);
    // open Launch with no save – only Solo and Versus tabs
    fireEvent.click(screen.getByRole('button', { name: /^Launch$/ }));
    expect(screen.queryByRole('button', { name: /^Continue$/ })).toBeNull();
    fireEvent.click(screen.getByLabelText(/^Close$/));

    // add save and rerender
    const run: Partial<SavedRun> = { research: { Military: 1, Grid: 1, Nano: 1 }, fleet: [] };
    localStorage.setItem('eclipse-run', JSON.stringify(run));
    rerender(<StartPage onNewRun={() => {}} onContinue={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /^Launch$/ }));
    // Continue tab appears and is selected by default
    expect(screen.getByRole('button', { name: /^Continue$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Continue Run$/ })).toBeInTheDocument();
  });
});
