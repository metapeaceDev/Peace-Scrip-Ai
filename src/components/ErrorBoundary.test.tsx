import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ErrorBoundary from './ErrorBoundary';
import React from 'react';

// Component that throws error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Working Component</div>;
};

describe('ErrorBoundary', () => {
  const originalError = console.error;
  const mockSentry = {
    captureException: vi.fn(),
  };

  beforeEach(() => {
    // Suppress error logs in tests
    console.error = vi.fn();
    // Mock window.Sentry
    (window as any).Sentry = mockSentry;
    // Mock window methods
    window.confirm = vi.fn(() => true);
    delete (window as any).location;
    (window as any).location = { reload: vi.fn() };
    // Mock localStorage
    Storage.prototype.clear = vi.fn();
    // Mock indexedDB
    (window as any).indexedDB = {
      deleteDatabase: vi.fn(),
    };
  });

  afterEach(() => {
    console.error = originalError;
    delete (window as any).Sentry;
    vi.clearAllMocks();
  });

  describe('Normal Operation', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Test Child Component</div>
        </ErrorBoundary>
      );
      expect(screen.getByText('Test Child Component')).toBeInTheDocument();
    });

    it('should not show error UI when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Working Component')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Error Catching', () => {
    it('should catch errors from child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should display error boundary UI when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Peace Script encountered an unexpected error')).toBeInTheDocument();
    });

    it('should display error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    });

    it('should show error details section', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Error Details')).toBeInTheDocument();
    });

    it('should call console.error when error is caught', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Sentry Integration', () => {
    it('should send error to Sentry if available', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(mockSentry.captureException).toHaveBeenCalled();
    });

    it('should send error with component stack to Sentry', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const captureCall = mockSentry.captureException.mock.calls[0];
      expect(captureCall[0]).toBeInstanceOf(Error);
      expect(captureCall[1]).toHaveProperty('contexts');
      expect(captureCall[1].contexts).toHaveProperty('react');
    });

    it('should not crash if Sentry is not available', () => {
      delete (window as any).Sentry;

      expect(() => {
        render(
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        );
      }).not.toThrow();
    });
  });

  describe('Error UI Elements', () => {
    it('should display error icon', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-red-400');
    });

    it('should have red border styling', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      const errorCard = container.querySelector('.border-red-500\\/50');
      expect(errorCard).toBeInTheDocument();
    });

    it('should display "What happened?" section', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('What happened?')).toBeInTheDocument();
    });

    it('should list possible error causes', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText(/Corrupted local data/)).toBeInTheDocument();
      expect(screen.getByText(/Browser compatibility issue/)).toBeInTheDocument();
      expect(screen.getByText(/Network connection problem/)).toBeInTheDocument();
      expect(screen.getByText(/A bug in the application/)).toBeInTheDocument();
    });

    it('should display stack trace toggle', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Show Stack Trace')).toBeInTheDocument();
    });

    it('should show stack trace when details expanded', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const details = container.querySelector('details');
      expect(details).toBeInTheDocument();

      const summary = screen.getByText('Show Stack Trace');
      fireEvent.click(summary);

      const stackTrace = container.querySelector('pre');
      expect(stackTrace).toBeInTheDocument();
    });
  });

  describe('Reload Button', () => {
    it('should display reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Reload Application')).toBeInTheDocument();
    });

    it('should reload window when reload button clicked', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByText('Reload Application');
      fireEvent.click(reloadButton);

      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should have gradient styling on reload button', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByText('Reload Application');
      expect(reloadButton).toHaveClass('bg-gradient-to-r');
      expect(reloadButton).toHaveClass('from-cyan-600');
    });
  });

  describe('Clear Data Button', () => {
    it('should display clear data button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Clear Data & Reload')).toBeInTheDocument();
    });

    it('should show confirmation dialog when clear data clicked', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const clearButton = screen.getByText('Clear Data & Reload');
      fireEvent.click(clearButton);

      expect(window.confirm).toHaveBeenCalledWith('This will clear all local data. Are you sure?');
    });

    it('should clear localStorage when confirmed', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const clearButton = screen.getByText('Clear Data & Reload');
      fireEvent.click(clearButton);

      expect(localStorage.clear).toHaveBeenCalled();
    });

    it('should delete indexedDB when confirmed', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const clearButton = screen.getByText('Clear Data & Reload');
      fireEvent.click(clearButton);

      expect(window.indexedDB.deleteDatabase).toHaveBeenCalledWith('PeaceScriptDB');
    });

    it('should reload after clearing data', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const clearButton = screen.getByText('Clear Data & Reload');
      fireEvent.click(clearButton);

      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should not clear data if user cancels', () => {
      window.confirm = vi.fn(() => false);

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const clearButton = screen.getByText('Clear Data & Reload');
      fireEvent.click(clearButton);

      expect(localStorage.clear).not.toHaveBeenCalled();
      expect(window.location.reload).not.toHaveBeenCalled();
    });
  });

  describe('Layout and Styling', () => {
    it('should have dark theme background', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const mainDiv = container.querySelector('.bg-gray-900');
      expect(mainDiv).toBeInTheDocument();
    });

    it('should center content on screen', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const centerDiv = container.querySelector('.items-center.justify-center');
      expect(centerDiv).toBeInTheDocument();
    });

    it('should use full screen height', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const fullHeightDiv = container.querySelector('.min-h-screen');
      expect(fullHeightDiv).toBeInTheDocument();
    });

    it('should have rounded corners on error card', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const card = container.querySelector('.rounded-xl');
      expect(card).toBeInTheDocument();
    });

    it('should have proper spacing between sections', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const spaceDiv = container.querySelector('.space-y-3');
      expect(spaceDiv).toBeInTheDocument();
    });
  });

  describe('Component State Management', () => {
    it('should initialize with no error state', () => {
      const { container } = render(
        <ErrorBoundary>
          <div>Child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should update state when error is caught', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error state is set, showing error UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Something went wrong');
    });

    it('should have clickable buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(2);
    });

    it('should have proper button labels', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /Reload Application/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Clear Data & Reload/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors without error info', () => {
      const BrokenComponent = () => {
        throw new Error('Simple error');
      };

      expect(() => {
        render(
          <ErrorBoundary>
            <BrokenComponent />
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    it('should handle multiple children', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('should handle nested ErrorBoundaries', () => {
      render(
        <ErrorBoundary>
          <ErrorBoundary>
            <div>Nested Child</div>
          </ErrorBoundary>
        </ErrorBoundary>
      );

      expect(screen.getByText('Nested Child')).toBeInTheDocument();
    });

    it('should display error message with special characters', () => {
      const SpecialError = () => {
        throw new Error('Error with <special> & "characters"');
      };

      render(
        <ErrorBoundary>
          <SpecialError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Error with <special> & "characters"/)).toBeInTheDocument();
    });
  });

  describe('getDerivedStateFromError', () => {
    it('should return proper state object', () => {
      const error = new Error('Test error');
      const state = ErrorBoundary.getDerivedStateFromError(error);

      expect(state).toEqual({
        hasError: true,
        error: error,
        errorInfo: null,
      });
    });
  });

  describe('Text Content', () => {
    it('should display helpful error description', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(
        screen.getByText(/An unexpected error occurred in the application/)
      ).toBeInTheDocument();
    });

    it('should provide guidance on what to do', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Try reloading the application/)).toBeInTheDocument();
    });
  });
});
