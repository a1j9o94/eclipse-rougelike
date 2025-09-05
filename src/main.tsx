import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Analytics } from '@vercel/analytics/react'
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Environment variable validation
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  console.error('VITE_CONVEX_URL environment variable is not set. Multiplayer features will be disabled.');
  console.log('Available env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
}

const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null;

// Error fallback component - moved inline to fix fast-refresh warning

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {convex ? (
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    ) : (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        backgroundColor: '#1a1a1a', 
        color: '#fff', 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h1>Configuration Error</h1>
        <p>The application is missing required environment variables.</p>
        <p>Multiplayer features are currently unavailable.</p>
        <p style={{ fontSize: '14px', opacity: 0.7 }}>
          Please contact the administrator or try refreshing the page.
        </p>
      </div>
    )}
    <Analytics />
  </StrictMode>,
)
