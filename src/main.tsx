import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Analytics } from '@vercel/analytics/react'
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ErrorBoundary, ErrorFallback } from './components/ErrorBoundary';

// Environment variable validation with detailed logging
console.log('=== Environment Debug ===');
console.log('CONVEX_URL:', import.meta.env.VITE_CONVEX_URL);
console.log('All VITE_ env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
console.log('All env vars:', import.meta.env);
console.log('========================');

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  console.error('VITE_CONVEX_URL environment variable is not set. Multiplayer features will be disabled.');
}

// Only create ConvexReactClient if URL is available
let convex: ConvexReactClient | null = null;
if (CONVEX_URL) {
  try {
    convex = new ConvexReactClient(CONVEX_URL);
    console.log('Convex client created successfully');
  } catch (error) {
    console.error('Failed to create Convex client:', error);
    convex = null;
  }
}

// Global error listeners to surface runtime issues in preview/prod
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error || e.message, e);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

export { ErrorFallback } from './components/ErrorBoundary';

// Render the app
try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        {convex ? (
          <ConvexProvider client={convex}>
            <App />
          </ConvexProvider>
        ) : (
          <ErrorFallback message="The application is missing required environment variables." />
        )}
      </ErrorBoundary>
      <Analytics />
    </StrictMode>,
  );
} catch (error) {
  console.error('Failed to render app:', error);
  // Fallback render without Convex
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorFallback message="Failed to initialize the application." />
      <Analytics />
    </StrictMode>,
  );
}
