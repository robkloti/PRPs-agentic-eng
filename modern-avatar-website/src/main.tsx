import React from 'react';
import ReactDOM from 'react-dom/client';
import { TestApp } from './components/TestApp';
import './styles/main.css';

// Performance monitoring setup
if ('performance' in window) {
  // Mark app start time
  performance.mark('app-start');
  
  // Monitor Core Web Vitals
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        console.log(`Performance metric: ${entry.name}`, entry);
      });
    });
    
    observer.observe({ entryTypes: ['measure', 'mark'] });
  }
}

// Error boundary for development
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Avatar App Error:', error, errorInfo);
    
    // In production, you might want to send this to an error reporting service
    if (window.location.hostname !== 'localhost') {
      // Example: sendErrorReport(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
          color: 'white',
          fontFamily: 'Inter, sans-serif'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <p style={{ opacity: 0.8, marginBottom: '2rem', textAlign: 'center' }}>
            The avatar application encountered an error. Please refresh the page to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '1rem 2rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            Reload Application
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '2rem', opacity: 0.7 }}>
              <summary style={{ cursor: 'pointer', marginBottom: '1rem' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                overflowX: 'auto'
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize React app
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <TestApp />
    </ErrorBoundary>
  </React.StrictMode>
);

// Mark app ready time
if ('performance' in window) {
  setTimeout(() => {
    performance.mark('app-ready');
    performance.measure('app-init', 'app-start', 'app-ready');
  }, 0);
}