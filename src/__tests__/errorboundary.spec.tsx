import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorFallback } from '../components/ErrorBoundary';

// We can't import ErrorBoundary directly because it's not exported, so this test
// verifies that the fallback component itself renders correctly as a lightweight guard.
describe('ErrorFallback', () => {
  it('renders a helpful message', () => {
    render(<ErrorFallback message="A runtime error occurred while rendering the app." />);
    expect(screen.getByText('Configuration Error')).toBeInTheDocument();
  });
});
