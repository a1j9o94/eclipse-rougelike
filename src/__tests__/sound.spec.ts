import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class FakeAudio {
  static instances: FakeAudio[] = [];
  currentTime = 0;
  loop = false;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  constructor(_src?:string){ FakeAudio.instances.push(this); }
}

vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio);

describe('playEffect', () => {
  beforeEach(() => {
    FakeAudio.instances = [];
    vi.useFakeTimers();
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it('stops playback after 1s', async () => {
    vi.stubEnv('MODE', 'development');
    const mod = await import('../game/sound');
    vi.unstubAllEnvs();
    const p = mod.playEffect('shot');
    vi.advanceTimersByTime(1000);
    await p;
    const inst = FakeAudio.instances[0];
    expect(inst.pause).toHaveBeenCalled();
    expect(inst.currentTime).toBe(0);
  });
  it('supports custom duration', async () => {
    vi.stubEnv('MODE', 'development');
    const mod = await import('../game/sound');
    vi.unstubAllEnvs();
    const p = mod.playEffect('shot', 200);
    vi.advanceTimersByTime(200);
    await p;
    const inst = FakeAudio.instances[0];
    expect(inst.pause).toHaveBeenCalled();
    expect(inst.currentTime).toBe(0);
  });
});
