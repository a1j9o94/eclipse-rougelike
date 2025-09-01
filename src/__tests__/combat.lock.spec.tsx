import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

vi.mock('../game/sound', () => ({
  playEffect: vi.fn(() => new Promise<void>(resolve => setTimeout(resolve, 100))),
  playMusic: vi.fn(),
  stopMusic: vi.fn(),
}));

describe('combat step locking', () => {
  it('disables step button while sound plays', async () => {
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }));
    const step = await screen.findByRole('button', { name: /Step/i });
    fireEvent.click(step); // init round
    fireEvent.click(step);
    await waitFor(() => expect(step).toBeDisabled());
    rnd.mockRestore();
  });
});
