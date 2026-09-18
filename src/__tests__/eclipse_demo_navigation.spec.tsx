import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EclipseDemoPage from '../pages/EclipseDemoPage';
import EclipseVariableDemoPage from '../pages/EclipseVariableDemoPage';

describe('Eclipse local board demo', () => {
  beforeEach(() => {
    // JSDOM has no layout observer; keep the actual board and zoom wrapper mounted.
    vi.stubGlobal('ResizeObserver', class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('identifies the board preview and links to the other local versions', () => {
    render(<EclipseDemoPage />);
    expect(screen.getByText(/Board preview.*complete matches are not available/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Original roguelike' })).toHaveAttribute('href', '/#legacy');
    expect(screen.getByRole('link', { name: 'Variable galaxy demo' })).toHaveAttribute('href', '/eclipse-variable-demo.html');
  });

  it('renders the real board and allows its display setting to change', () => {
    const { container } = render(<EclipseDemoPage />);
    expect(container.querySelectorAll('.eclipse-hex').length).toBeGreaterThan(0);
    const coordinates = screen.getByRole('checkbox', { name: 'Show coordinates & IDs' });
    expect(coordinates).toBeChecked();
    fireEvent.click(coordinates);
    expect(coordinates).not.toBeChecked();
    const sector = container.querySelector('.eclipse-hex');
    expect(sector).not.toBeNull();
    fireEvent.click(sector!);
    expect(screen.getByText(/^ID: /)).toBeInTheDocument();
  });

  it('links the variable preview back and changes its galaxy size', () => {
    const { container } = render(<EclipseVariableDemoPage />);
    expect(container.querySelectorAll('.eclipse-hex')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Original roguelike' })).toHaveAttribute('href', '/#legacy');
    expect(screen.getByRole('link', { name: 'Two-player board demo' })).toHaveAttribute('href', '/eclipse-demo.html');
    fireEvent.click(screen.getByRole('button', { name: '6', exact: true }));
    expect(screen.getByText('Player Count: 6')).toBeInTheDocument();
    expect(container.querySelectorAll('.eclipse-hex')).toHaveLength(7);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include Guardian Sectors' }));
    expect(container.querySelectorAll('.eclipse-hex-guardian')).toHaveLength(4);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable Zoom/Pan' }));
    expect(screen.getByRole('checkbox', { name: 'Enable Zoom/Pan' })).not.toBeChecked();
  });
});
