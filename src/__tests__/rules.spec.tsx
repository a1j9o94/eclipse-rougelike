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
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }));
    // Rules modal appears and pauses auto-combat
    const goBtn = await screen.findByRole('button', { name: /Let’s go/i });
    expect(screen.queryByText(/Victory/i)).not.toBeInTheDocument();
    fireEvent.click(goBtn);
    await screen.findAllByText(/Victory/i, undefined, { timeout: 10000 });
  }, 15000);

});
