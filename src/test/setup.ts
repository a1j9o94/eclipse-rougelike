import '@testing-library/jest-dom/vitest'

class SilentAudio {
  currentTime = 0;
  loop = false;
  play() { return Promise.resolve(); }
  pause() {}
}
(globalThis as unknown as { Audio: typeof Audio }).Audio = SilentAudio as unknown as typeof Audio;


