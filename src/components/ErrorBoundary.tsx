import { Component, type ReactNode, type ErrorInfo } from 'react';

export function ErrorFallback({ message }: { message: string }) {
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

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }>{
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return <ErrorFallback message="A runtime error occurred while rendering the app." />;
    }
    return this.props.children;
  }
}
