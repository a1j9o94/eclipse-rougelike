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
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      globals: true,
      coverage: {
        reporter: ['text', 'html', 'json-summary'],
      },
    },
  };
})
