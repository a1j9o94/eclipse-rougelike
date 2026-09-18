import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import GlobalStarfield from './components/GlobalStarfield'
import { Analytics } from '@vercel/analytics/react'
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ErrorBoundary, ErrorFallback } from './components/ErrorBoundary';

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

// Local solo play does not need a backend.
let convex: ConvexReactClient | null = null;
if (CONVEX_URL) {
  try {
    convex = new ConvexReactClient(CONVEX_URL);
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

const app = (
  <div className="relative min-h-screen">
    <GlobalStarfield />
    <div className="relative z-10">
      <App />
    </div>
  </div>
);

// Render the app
try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        {convex ? (
          <ConvexProvider client={convex}>
            {app}
          </ConvexProvider>
        ) : (
          app
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
