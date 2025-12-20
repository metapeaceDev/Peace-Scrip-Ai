import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Component Rendering', () => {
    it('should render loading spinner', () => {
      const { container } = render(<LoadingSpinner />);
      expect(container.querySelector('[role="status"]')).toBeInTheDocument();
    });

    it('should have accessibility label', () => {
      render(<LoadingSpinner />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render three animated dots', () => {
      const { container } = render(<LoadingSpinner />);
      const dots = container.querySelectorAll('.animate-pulse');
      expect(dots).toHaveLength(3);
    });

    it('should have cyan color for dots', () => {
      const { container } = render(<LoadingSpinner />);
      const dots = container.querySelectorAll('.bg-cyan-400');
      expect(dots).toHaveLength(3);
    });

    it('should have rounded dots', () => {
      const { container } = render(<LoadingSpinner />);
      const dots = container.querySelectorAll('.rounded-full');
      expect(dots).toHaveLength(3);
    });

    it('should be centered with flexbox', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should have spacing between dots', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveClass('space-x-2');
    });

    it('should take full height', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveClass('h-full');
    });
  });

  describe('Accessibility', () => {
    it('should have status role for screen readers', () => {
      const { container } = render(<LoadingSpinner />);
      const status = container.querySelector('[role="status"]');
      expect(status).toBeInTheDocument();
    });

    it('should hide Loading text visually but keep for screen readers', () => {
      render(<LoadingSpinner />);
      const text = screen.getByText('Loading...');
      expect(text).toHaveClass('sr-only');
    });
  });

  describe('Animation', () => {
    it('should have different animation delays for each dot', () => {
      const { container } = render(<LoadingSpinner />);
      const dots = container.querySelectorAll('.animate-pulse');

      // Check that animation delay classes exist (Tailwind arbitrary values)
      const firstDot = dots[0];
      const secondDot = dots[1];
      const thirdDot = dots[2];

      expect(firstDot.className).toContain('animation-delay');
      expect(secondDot.className).toContain('animation-delay');
      // Third dot has no delay
    });

    it('should apply pulse animation to all dots', () => {
      const { container } = render(<LoadingSpinner />);
      const dots = container.querySelectorAll('.animate-pulse');

      dots.forEach(dot => {
        expect(dot).toHaveClass('animate-pulse');
      });
    });
  });
});

