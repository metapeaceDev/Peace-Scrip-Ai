import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';

// Mock Firebase
vi.mock('../services/firebaseAuth', () => ({
  firebaseAuth: {
    getCurrentUser: vi.fn(() => Promise.resolve(null)),
    onAuthStateChange: vi.fn(callback => {
      callback(null);
      return () => {};
    }),
    handleRedirectResult: vi.fn(() => Promise.resolve(null)),
  },
}));

vi.mock('../services/firestoreService', () => ({
  firestoreService: {
    getUserProjects: vi.fn(() => Promise.resolve({ success: true, projects: [] })),
  },
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('has main container', () => {
    const { container } = render(<App />);
    const mainDiv = container.querySelector('div');
    expect(mainDiv).toBeInTheDocument();
  });
});
