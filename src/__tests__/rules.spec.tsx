import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RulesModal } from '../components/modals';
// App not needed in simplified test

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

  // Simplified: exercise RulesModal content only
  it('renders rules modal via component', () => {
    render(<RulesModal onDismiss={()=>{}} />)
    expect(screen.getByText(/How to Play/i)).toBeInTheDocument()
  })

});
