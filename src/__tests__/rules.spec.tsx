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
    await new Promise(r => setTimeout(r, 200));
    expect(screen.queryByText(/Victory/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }));
    await screen.findAllByText(/Victory/i, undefined, { timeout: 10000 });
    await new Promise(r => setTimeout(r, 200));
  }, 15000);

});
