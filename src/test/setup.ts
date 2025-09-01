import '@testing-library/jest-dom/vitest'

class SilentAudio {
  currentTime = 0;
  loop = false;
  play() { return Promise.resolve(); }
  pause() {}
}
(globalThis as any).Audio = SilentAudio;


