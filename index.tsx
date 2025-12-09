import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider } from './src/contexts/AuthContext';
import { validateEnvOrThrow } from './src/utils/env';
import { initSentry } from './src/utils/sentry';

// Validate environment variables before starting the app
try {
  validateEnvOrThrow();
} catch (error) {
  console.error('Environment validation failed:', error);
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); font-family: system-ui, -apple-system, sans-serif;">
      <div style="max-width: 600px; padding: 2rem; background: rgba(255, 255, 255, 0.1); border-radius: 1rem; border: 1px solid rgba(255, 100, 100, 0.3);">
        <h1 style="color: #ff6b6b; margin: 0 0 1rem 0; font-size: 1.5rem;">⚠️ Configuration Error</h1>
        <p style="color: #e0e0e0; margin: 0 0 1rem 0; line-height: 1.6;">
          Peace Script AI could not start because required environment variables are missing.
        </p>
        <pre style="background: rgba(0, 0, 0, 0.3); padding: 1rem; border-radius: 0.5rem; color: #ffcc00; overflow-x: auto; font-size: 0.875rem;">${error instanceof Error ? error.message : String(error)}</pre>
        <p style="color: #b0b0b0; margin: 1rem 0 0 0; font-size: 0.875rem;">
          Please check your <code style="background: rgba(0, 0, 0, 0.3); padding: 0.25rem 0.5rem; border-radius: 0.25rem;">.env</code> file and ensure all required variables are set.
        </p>
      </div>
    </div>
  `;
  throw error;
}

// Initialize Sentry for error tracking
initSentry();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
