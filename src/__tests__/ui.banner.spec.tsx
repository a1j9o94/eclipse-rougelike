import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LivesBanner } from '../components/LivesBanner';

describe('LivesBanner', () => {
  it('renders single-player lives', () => {
    render(<LivesBanner variant="single" lives={1} />);
    expect(screen.getByLabelText('lives-remaining')).toHaveTextContent('1');
  });

  it('renders multiplayer names and lives', () => {
    render(<LivesBanner variant="multi" me={{ name: 'Me', lives: 2 }} opponent={{ name: 'Them', lives: 1 }} phase="setup" />);
    expect(screen.getByLabelText('multiplayer-status')).toHaveTextContent('Me');
    expect(screen.getByLabelText('multiplayer-status')).toHaveTextContent('Them');
  });
});

