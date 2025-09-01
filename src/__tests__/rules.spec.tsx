import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RulesModal } from '../components/modals';

// React import not required

describe('rules modal', () => {
  it('shows slot pips in ship & power section', () => {
    render(<RulesModal onDismiss={() => {}} />);
    expect(screen.getByText(/⬛⬛⬛⬛⬛⬛/)).toBeInTheDocument();
  });
});
