import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import App from '../App';
import { usePublicRooms } from '../hooks/usePublicRooms';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

vi.mock('../index.css', () => ({}));

vi.mock('react-dom/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom/client')>();
  return { ...actual, createRoot: vi.fn(actual.createRoot) };
});

beforeEach(() => { window.history.replaceState(null, '', '/#legacy'); });
afterEach(() => { vi.unstubAllEnvs(); window.history.replaceState(null, '', '/'); });

describe('local solo startup', () => {
  it.each(['', 'https://example.convex.cloud'])('starts without a provider with backend URL %s', (url) => {
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('VITE_CONVEX_URL', url);
    localStorage.clear();
    localStorage.setItem('ui-starfield-enabled', 'false');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Launch$/ }));
    if (!url) expect(screen.getByRole('button', { name: /^Versus$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Start Tutorial/ })).toBeEnabled();
  });

  it('does not query public rooms without a provider', () => {
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('VITE_CONVEX_URL', 'https://example.convex.cloud');
    const { result } = renderHook(() => usePublicRooms());
    expect(result.current).toEqual({ rooms: [], isLoading: false });
  });

  it('keeps multiplayer available with the configured Convex provider', async () => {
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('VITE_CONVEX_URL', 'https://example.convex.cloud');
    localStorage.setItem('ui-starfield-enabled', 'false');
    const client = new ConvexReactClient('https://example.convex.cloud', { disabled: true });
    const { unmount } = render(<ConvexProvider client={client}><App /></ConvexProvider>);
    try {
      fireEvent.click(screen.getByRole('button', { name: /^Launch$/ }));
      expect(screen.getByRole('button', { name: /^Versus$/ })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Start Tutorial/ })).toBeEnabled();
    } finally {
      unmount();
      await client.close();
    }
  });

  it('renders the real browser entry without a backend', async () => {
    vi.stubEnv('VITE_CONVEX_URL', '');
    localStorage.setItem('ui-starfield-enabled', 'false');
    const host = document.createElement('div');
    host.id = 'root';
    document.body.appendChild(host);
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(host);
    vi.mocked(createRoot).mockReturnValue(root);
    try {
      await act(async () => { await import('../main'); });
      expect(screen.getByRole('button', { name: /^Launch$/ })).toBeEnabled();
      expect(screen.queryByText('Configuration Error')).not.toBeInTheDocument();
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});
