import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Send to Sentry if available
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-red-500/50 rounded-xl shadow-2xl max-w-2xl w-full p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-900/30 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
                <p className="text-gray-400 text-sm mt-1">Peace Script encountered an unexpected error</p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6">
                <h2 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wider">Error Details</h2>
                <p className="text-white font-mono text-sm mb-2">{this.state.error.toString()}</p>
                
                {this.state.errorInfo && (
                  <details className="mt-3">
                    <summary className="text-gray-400 text-xs cursor-pointer hover:text-white transition-colors">
                      Show Stack Trace
                    </summary>
                    <pre className="mt-2 text-[10px] text-gray-500 overflow-x-auto p-3 bg-black/30 rounded border border-gray-800">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all"
              >
                Reload Application
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm('This will clear all local data. Are you sure?')) {
                    localStorage.clear();
                    indexedDB.deleteDatabase('PeaceScriptDB');
                    window.location.reload();
                  }
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Clear Data & Reload
              </button>
            </div>

            <div className="mt-6 p-4 bg-gray-900/30 rounded-lg border border-gray-700">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">What happened?</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                An unexpected error occurred in the application. This might be due to:
              </p>
              <ul className="text-gray-500 text-xs mt-2 space-y-1 ml-4 list-disc">
                <li>Corrupted local data</li>
                <li>Browser compatibility issue</li>
                <li>Network connection problem</li>
                <li>A bug in the application</li>
              </ul>
              <p className="text-gray-500 text-xs mt-3">
                Try reloading the application. If the problem persists, clearing your data may help.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
