import { defineConfig } from 'vitest/config'
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
      // OOM mitigation defaults — can be overridden by CLI flags in CI
      // Use vmThreads so each worker has an isolated JS context and can be recycled on memory pressure.
      pool: 'vmThreads',
      // Keep concurrency modest by default; override with --maxWorkers in CI if desired.
      maxWorkers: Math.max(1, Math.floor((Number(process.env.VITEST_WORKERS || 0) || require('os').cpus().length) * 0.5)),
      // Recycle a worker before it balloons too far; requires vmThreads/vmForks
      poolOptions: {
        vmThreads: {
          memoryLimit: '512MB',
          maxThreads: Math.max(1, Math.min(4, (Number(process.env.VITEST_WORKERS || 0) || require('os').cpus().length))),
          minThreads: 1,
        },
      },
      // Disable running multiple files in parallel within one worker to reduce peak heap
      fileParallelism: false,
      coverage: {
        reporter: ['text', 'html', 'json-summary'],
      },
    },
  };
})
