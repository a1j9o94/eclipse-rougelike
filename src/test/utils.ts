// Lightweight helpers for UI tests
// Note: keep tiny to avoid pulling in app code paths

export async function settleUi(cycles = 3): Promise<void> {
  // Flush a few microtask + macrotask turns to let React effects settle
  for (let i = 0; i < cycles; i++) {
    await Promise.resolve();
    await new Promise<void>(r => setTimeout(r, 0));
  }
}
