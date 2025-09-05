import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Analytics } from '@vercel/analytics/react'
import { ConvexProvider, ConvexReactClient } from "convex/react";

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

// Error fallback component
function ErrorFallback({ message }: { message: string }) {
  return (
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
      <p>{message}</p>
      <p>Multiplayer features are currently unavailable.</p>
      <p style={{ fontSize: '14px', opacity: 0.7 }}>
        Please check the console for more details.
      </p>
    </div>
  );
}

export { ErrorFallback };

// Render the app
try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {convex ? (
        <ConvexProvider client={convex}>
          <App />
        </ConvexProvider>
      ) : (
        <ErrorFallback message="The application is missing required environment variables." />
      )}
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
