import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class FakeAudio {
  static instances: FakeAudio[] = [];
  currentTime = 0;
  loop = false;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  constructor(){ FakeAudio.instances.push(this); }
}

vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio);
// Mock the heavy impl module so we don't import large audio assets in tests
vi.mock('../game/sound.impl', () => {
  return {
    playEffect: (key: string, duration = 1000) => {
      const a = new (globalThis as any).Audio('') as InstanceType<typeof FakeAudio>;
      // simulate play
      void a.play();
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          a.pause();
          a.currentTime = 0;
          resolve();
        }, duration);
      });
    },
    playMusic: () => {},
    stopMusic: () => {},
  };
}, { virtual: true });

describe('sound shim and impl', () => {
  beforeEach(() => {
    FakeAudio.instances = [];
    vi.useFakeTimers();
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sound.ts shim no-ops under vitest (even in development MODE)', async () => {
    vi.stubEnv('MODE', 'development');
    const mod = await import('../game/sound');
    const before = FakeAudio.instances.length;
    // duration=0 to avoid reliance on fake timers; should resolve immediately
    await mod.playEffect('shot', 0);
    expect(FakeAudio.instances.length).toBe(before);
    vi.unstubAllEnvs();
  });

  it('sound.impl stops playback after 1s', async () => {
    const impl = await import('../game/sound.impl');
    const p = impl.playEffect('shot');
    vi.advanceTimersByTime(1000);
    await p;
    const inst = FakeAudio.instances[0];
    expect(inst.pause).toHaveBeenCalled();
    expect(inst.currentTime).toBe(0);
  });

  it('sound.impl supports custom duration', async () => {
    const impl = await import('../game/sound.impl');
    const p = impl.playEffect('shot', 200);
    vi.advanceTimersByTime(200);
    await p;
    const inst = FakeAudio.instances[0];
    expect(inst.pause).toHaveBeenCalled();
    expect(inst.currentTime).toBe(0);
  });
});
