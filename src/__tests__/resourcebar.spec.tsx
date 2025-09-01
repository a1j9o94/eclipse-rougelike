import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResourceBar } from '../components/ui';

describe('resource bar', () => {
  it('shows condensed capacity and restart control', () => {
    render(<ResourceBar credits={10} materials={5} science={2} tonnage={{ used:3, cap:4 }} sector={7} onReset={() => {}} />);
    const capNode = screen.getAllByText('🟢', { exact: false }).find(n => n.textContent?.includes('/'))!;
    expect(capNode.textContent).toMatch(/3\s*\/\s*4/);
    const sectorNode = screen.getAllByText('🗺️', { exact: false }).find(n => n.textContent?.match(/7/))!;
    expect(sectorNode.textContent).toMatch(/7/);
    expect(screen.getByRole('button', { name: /Restart/i })).toBeInTheDocument();
  });
});
