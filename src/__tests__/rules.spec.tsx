import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RulesModal } from '../components/modals';
import App from '../App';

vi.mock('../game/sound', () => ({
  playEffect: vi.fn(() => Promise.resolve()),
  playMusic: vi.fn(),
  stopMusic: vi.fn(),
}));

// React import not required

describe('rules modal', () => {
  it('shows slot pips in ship & power section', () => {
    render(<RulesModal onDismiss={() => {}} />);
    expect(screen.getByText(/🟢🟢🟢🟢🟢🟢/)).toBeInTheDocument();
  });

  it('pauses combat until dismissed at battle start', async () => {
    localStorage.clear();
    // Disable starfield (jsdom has no canvas)
    localStorage.setItem('ui-starfield-enabled', 'false');
    render(<App />);
    // Launch flow (sheet)
    fireEvent.click(screen.getByRole('button', { name: /^Launch$/ }));
    // Solo tab is default; confirm and launch
    const launchBtn = await screen.findByRole('button', { name: /^Launch$/ });
    fireEvent.click(launchBtn);
    // Wait for Outpost and start combat
    await screen.findByText(/Outpost Inventory/i)
    const startBtn = await screen.findByRole('button', { name: /Start Combat/i })
    fireEvent.click(startBtn)
    // Open Rules via help (mobile) to pause combat
    const allBtns1 = screen.getAllByRole('button')
    const maybeFab = allBtns1.find(b => (b.textContent||'').trim() === '❓')
    if (maybeFab) fireEvent.click(maybeFab)
    const allBtns2 = screen.getAllByRole('button')
    const rulesBtn = allBtns2.find(b => /Rules/i.test(b.textContent||'')) as HTMLButtonElement
    fireEvent.click(rulesBtn)
    // Rules modal appears and pauses auto-combat
    const goBtn = await screen.findByRole('button', { name: /Let’s go/i })
    expect(screen.queryByText(/Victory/i)).not.toBeInTheDocument()
    fireEvent.click(goBtn)
    await screen.findAllByText(/Victory/i, undefined, { timeout: 10000 });
  }, 15000);

});
