import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

vi.mock('../game/sound', () => ({
  playEffect: vi.fn(() => Promise.resolve()),
  playMusic: vi.fn(),
  stopMusic: vi.fn(),
}));

describe('combat auto resolution', () => {
  it('keeps return button disabled until combat ends', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }));
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }));
    const ret = screen.getByRole('button', { name: /Resolving/i });
    expect(ret).toBeDisabled();
    await screen.findByText(/^Victory$/i, undefined, { timeout: 10000 });
    await waitFor(() => expect(ret).toHaveTextContent(/Return to Outpost/i));
    await waitFor(() => expect(ret).not.toBeDisabled());
  }, 15000);
});
