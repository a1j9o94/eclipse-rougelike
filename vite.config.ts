import { defineConfig } from 'vitest/config'
import os from 'node:os'
import react from '@vitejs/plugin-react'
import { assertEnv } from './tools/envCheck'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isCI = !!process.env.CI || !!process.env.VERCEL;
  if (mode === 'production' && isCI) {
    // Ensure the Convex URL is present in production builds
    assertEnv(['VITE_CONVEX_URL']);
  }

  return {
    plugins: [react()],
    build: { sourcemap: true },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      globals: true,
      // OOM mitigation defaults — prefer process forks for isolation
      pool: 'forks',
      // Keep concurrency modest by default; override with --maxWorkers in CI if desired.
      maxWorkers: Math.max(1, Math.floor((Number(process.env.VITEST_WORKERS || 0) || os.cpus().length) * 0.5)),
      // Keep worker count small by default; override per-run with --maxWorkers or VITEST_WORKERS
      poolOptions: undefined,
      // Disable running multiple files in parallel within one worker to reduce peak heap
      fileParallelism: false,
      coverage: {
        reporter: ['text', 'html', 'json-summary'],
      },
    },
  };
})
