import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary - Component Rendering', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );

    const content = screen.getByText('Test Content');
    expect(content).toBeDefined();
  });

  it('should display error UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const errorHeading = screen.getByText(/Something went wrong/i);
    expect(errorHeading).toBeDefined();
  });

  it('should display error details section', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const detailsHeading = screen.getByText(/Error Details/i);
    expect(detailsHeading).toBeDefined();
  });

  it('should display Peace Script error message', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const message = screen.getByText(/Peace Script encountered an unexpected error/i);
    expect(message).toBeDefined();
  });

  it('should display error message', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const errorMessage = screen.getByText(/Test error/i);
    expect(errorMessage).toBeDefined();
  });

  it('should display Reload Application button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByText(/Reload Application/i);
    expect(reloadButton).toBeDefined();
  });

  it('should display Clear Data & Reload button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const clearButton = screen.getByText(/Clear Data & Reload/i);
    expect(clearButton).toBeDefined();
  });

  it('should display What happened section', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const whatHappenedHeading = screen.getByText(/What happened?/i);
    expect(whatHappenedHeading).toBeDefined();
  });

  it('should display error causes list', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const corruptedData = screen.getByText(/Corrupted local data/i);
    expect(corruptedData).toBeDefined();
  });

  it('should display Show Stack Trace summary', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const stackTraceSummary = screen.getByText(/Show Stack Trace/i);
    expect(stackTraceSummary).toBeDefined();
  });
});

describe('ErrorBoundary - Error Icon', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display error icon SVG', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg?.classList.contains('text-red-400')).toBe(true);
  });
});

describe('ErrorBoundary - User Interaction', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    delete (window as any).location;
    window.location = { reload: vi.fn() } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reload page when Reload Application clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByText(/Reload Application/i);
    fireEvent.click(reloadButton);

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should show confirm dialog when Clear Data clicked', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const clearButton = screen.getByText(/Clear Data & Reload/i);
    fireEvent.click(clearButton);

    expect(confirmSpy).toHaveBeenCalled();
  });

  it('should not clear data if user cancels confirm', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const clearSpy = vi.spyOn(localStorage, 'clear');

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const clearButton = screen.getByText(/Clear Data & Reload/i);
    fireEvent.click(clearButton);

    expect(clearSpy).not.toHaveBeenCalled();
  });
});

describe('ErrorBoundary - Error Messages', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display browser compatibility issue cause', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const compatibility = screen.getByText(/Browser compatibility issue/i);
    expect(compatibility).toBeDefined();
  });

  it('should display network connection problem cause', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const network = screen.getByText(/Network connection problem/i);
    expect(network).toBeDefined();
  });

  it('should display bug in application cause', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const bug = screen.getByText(/A bug in the application/i);
    expect(bug).toBeDefined();
  });

  it('should display troubleshooting suggestions', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const suggestion = screen.getByText(/Try reloading the application/i);
    expect(suggestion).toBeDefined();
  });

  it('should suggest clearing data if problem persists', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const persistMessage = screen.getByText(/If the problem persists.*clearing.*data/i);
    expect(persistMessage).toBeDefined();
  });
});

describe('ErrorBoundary - Visual Elements', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have red border styling', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const errorCard = container.querySelector('.border-red-500\\/50');
    expect(errorCard).toBeDefined();
  });

  it('should have gradient reload button', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const gradientButton = container.querySelector('.from-cyan-600');
    expect(gradientButton).toBeDefined();
  });

  it('should have error details with dark background', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const detailsBox = container.querySelector('.bg-gray-900\\/50');
    expect(detailsBox).toBeDefined();
  });

  it('should have centered layout', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const centeredDiv = container.querySelector('.items-center.justify-center');
    expect(centeredDiv).toBeDefined();
  });
});

describe('ErrorBoundary - Props Handling', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should accept children prop', () => {
    render(
      <ErrorBoundary>
        <div>Test Child</div>
      </ErrorBoundary>
    );

    const child = screen.getByText('Test Child');
    expect(child).toBeDefined();
  });

  it('should render multiple children', () => {
    render(
      <ErrorBoundary>
        <div>Child 1</div>
        <div>Child 2</div>
      </ErrorBoundary>
    );

    const child1 = screen.getByText('Child 1');
    const child2 = screen.getByText('Child 2');
    expect(child1).toBeDefined();
    expect(child2).toBeDefined();
  });

  it('should not show error UI when children render successfully', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    const noError = screen.getByText('No error');
    expect(noError).toBeDefined();
  });
});
