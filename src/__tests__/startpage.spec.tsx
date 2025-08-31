import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StartPage from '../pages/StartPage';

describe('StartPage', () => {
  it('faction list is scrollable', () => {
    render(<StartPage onNewRun={() => {}} />);
    const list = screen.getByTestId('faction-list');
    expect(list.className).toMatch(/overflow-y-auto/);
  });
});
