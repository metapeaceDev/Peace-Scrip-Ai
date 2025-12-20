/**
 * Tests for ComfyUIStatus Component
 *
 * Tests service status display, worker stats, queue stats, error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ComfyUIStatus from '../ComfyUIStatus';

// Mock the backend client module
const mockCheckBackendStatus = vi.fn();
const mockGetWorkerStats = vi.fn();
const mockGetQueueStats = vi.fn();

vi.mock('../../services/comfyuiBackendClient', () => ({
  checkBackendStatus: (...args: any[]) => mockCheckBackendStatus(...args),
  getWorkerStats: (...args: any[]) => mockGetWorkerStats(...args),
  getQueueStats: (...args: any[]) => mockGetQueueStats(...args),
}));

describe('ComfyUIStatus', () => {
  const mockWorkerStats = {
    totalWorkers: 3,
    healthyWorkers: 2,
    workers: [
      { url: 'http://worker1:8080', healthy: true, lastCheck: '2024-01-01T12:00:00Z' },
      { url: 'http://worker2:8080', healthy: true, lastCheck: '2024-01-01T12:00:00Z' },
      { url: 'http://worker3:8080', healthy: false, lastCheck: '2024-01-01T12:00:00Z' },
    ],
  };

  const mockQueueStats = {
    waiting: 5,
    active: 2,
    completed: 100,
    failed: 3,
    delayed: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering - Loading State', () => {
    it('should render loading state in compact mode', () => {
      mockCheckBackendStatus.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { container } = render(<ComfyUIStatus compact={true} />);

      expect(screen.getByText(/Checking.../i)).toBeInTheDocument();
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should render loading state in full mode', () => {
      mockCheckBackendStatus.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { container } = render(<ComfyUIStatus />);

      expect(screen.getByText(/Checking ComfyUI service.../i)).toBeInTheDocument();
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Component Rendering - Online State', () => {
    beforeEach(() => {
      mockCheckBackendStatus.mockResolvedValue({ running: true, error: null });
      mockGetWorkerStats.mockResolvedValue(mockWorkerStats);
      mockGetQueueStats.mockResolvedValue(mockQueueStats);
    });

    it('should render compact mode when online', async () => {
      const { container } = render(<ComfyUIStatus compact={true} />);

      await waitFor(() => {
        expect(screen.getByText(/ComfyUI:/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Online/i)).toBeInTheDocument();
      expect(screen.getByText(/\(2\/3\)/i)).toBeInTheDocument();
      const greenDot = container.querySelector('.bg-green-500');
      expect(greenDot).toBeInTheDocument();
    });

    it('should render full mode header when online', async () => {
      render(<ComfyUIStatus />);

      await waitFor(() => {
        expect(screen.getByText(/ComfyUI Backend Service/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Online/i)).toBeInTheDocument();
      expect(screen.getByText(/Show Details/i)).toBeInTheDocument();
    });

    it('should show quick stats in full mode', async () => {
      render(<ComfyUIStatus />);

      await waitFor(() => {
        expect(screen.getByText(/ComfyUI Backend Service/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/\/3 Workers/i)).toBeInTheDocument();
    });
  });

  describe('Component Rendering - Offline State', () => {
    beforeEach(() => {
      mockCheckBackendStatus.mockResolvedValue({ running: false, error: 'Connection refused' });
    });

    it('should render compact mode when offline', async () => {
      const { container } = render(<ComfyUIStatus compact={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Offline/i)).toBeInTheDocument();
      });

      const redDot = container.querySelector('.bg-red-500');
      expect(redDot).toBeInTheDocument();
    });

    it('should render full mode with error message when offline', async () => {
      render(<ComfyUIStatus />);

      await waitFor(() => {
        expect(screen.getByText(/Connection refused/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Retry Connection/i)).toBeInTheDocument();
    });
  });

  describe('Details Toggle', () => {
    beforeEach(() => {
      mockCheckBackendStatus.mockResolvedValue({ running: true, error: null });
      mockGetWorkerStats.mockResolvedValue(mockWorkerStats);
      mockGetQueueStats.mockResolvedValue(mockQueueStats);
    });

    it('should toggle details on button click', async () => {
      render(<ComfyUIStatus />);

      await waitFor(() => {
        expect(screen.getByText(/Show Details/i)).toBeInTheDocument();
      });

      const toggleButton = screen.getByText(/Show Details/i);
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText(/Hide Details/i)).toBeInTheDocument();
      });
    });

    it('should show worker details when expanded', async () => {
      render(<ComfyUIStatus />);

      await waitFor(() => {
        expect(screen.getByText(/Show Details/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Show Details/i));

      await waitFor(() => {
        expect(screen.getByText(/Workers \(3\)/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/http:\/\/worker1:8080/i)).toBeInTheDocument();
    });

    it('should show queue statistics when expanded', async () => {
      render(<ComfyUIStatus />);

      await waitFor(() => {
        fireEvent.click(screen.getByText(/Show Details/i));
      });

      await waitFor(() => {
        expect(screen.getByText(/Queue Statistics/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Waiting:/i)).toBeInTheDocument();
      expect(screen.getByText(/Completed:/i)).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      mockCheckBackendStatus.mockResolvedValue({ running: true, error: null });
      mockGetWorkerStats.mockResolvedValue(mockWorkerStats);
      mockGetQueueStats.mockResolvedValue(mockQueueStats);
    });

    it('should refresh stats on button click', async () => {
      render(<ComfyUIStatus />);

      await waitFor(() => {
        fireEvent.click(screen.getByText(/Show Details/i));
      });

      await waitFor(() => {
        expect(screen.getByText(/Refresh Stats/i)).toBeInTheDocument();
      });

      mockCheckBackendStatus.mockClear();
      fireEvent.click(screen.getByText(/Refresh Stats/i));

      await waitFor(() => {
        expect(mockCheckBackendStatus).toHaveBeenCalled();
      });
    });

    it('should retry connection when offline', async () => {
      mockCheckBackendStatus.mockResolvedValue({ running: false, error: 'Connection refused' });

      render(<ComfyUIStatus />);

      await waitFor(() => {
        expect(screen.getByText(/Retry Connection/i)).toBeInTheDocument();
      });

      mockCheckBackendStatus.mockClear();
      fireEvent.click(screen.getByText(/Retry Connection/i));

      await waitFor(() => {
        expect(mockCheckBackendStatus).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle backend check errors', async () => {
      mockCheckBackendStatus.mockRejectedValue(new Error('Network timeout'));

      render(<ComfyUIStatus />);

      await waitFor(() => {
        expect(screen.getByText(/Network timeout/i)).toBeInTheDocument();
      });
    });

    it('should show error from backend status response', async () => {
      mockCheckBackendStatus.mockResolvedValue({ running: false, error: 'Service unavailable' });

      render(<ComfyUIStatus />);

      await waitFor(() => {
        expect(screen.getByText(/Service unavailable/i)).toBeInTheDocument();
      });
    });
  });

  describe('Props', () => {
    beforeEach(() => {
      mockCheckBackendStatus.mockResolvedValue({ running: true, error: null });
      mockGetWorkerStats.mockResolvedValue(mockWorkerStats);
      mockGetQueueStats.mockResolvedValue(mockQueueStats);
    });

    it('should default to full mode when compact prop is not provided', async () => {
      render(<ComfyUIStatus />);

      await waitFor(() => {
        expect(screen.getByText(/ComfyUI Backend Service/i)).toBeInTheDocument();
      });
    });

    it('should use compact mode when compact={true}', async () => {
      render(<ComfyUIStatus compact={true} />);

      await waitFor(() => {
        expect(screen.getByText(/ComfyUI:/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/ComfyUI Backend Service/i)).not.toBeInTheDocument();
    });
  });
});

