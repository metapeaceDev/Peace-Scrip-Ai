import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PaymentCancel from './PaymentCancel';

describe('PaymentCancel', () => {
  describe('Component Rendering', () => {
    it('should render payment cancel page', () => {
      render(<PaymentCancel />);
      expect(screen.getByText('การชำระเงินถูกยกเลิก')).toBeInTheDocument();
    });

    it('should display cancel message', () => {
      render(<PaymentCancel />);
      expect(screen.getByText(/คุณได้ยกเลิกกระบวนการชำระเงิน/)).toBeInTheDocument();
      expect(screen.getByText(/ไม่มีการเรียกเก็บเงินใดๆ จากคุณ/)).toBeInTheDocument();
    });

    it('should render warning icon', () => {
      const { container } = render(<PaymentCancel />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should display help section title', () => {
      render(<PaymentCancel />);
      expect(screen.getByText('ต้องการความช่วยเหลือหรือไม่?')).toBeInTheDocument();
    });
  });

  describe('Help Information', () => {
    it('should display payment problem help text', () => {
      render(<PaymentCancel />);
      expect(
        screen.getByText(/หากมีปัญหาเกี่ยวกับการชำระเงิน ลองใช้บัตรอื่นหรือติดต่อธนาคาร/)
      ).toBeInTheDocument();
    });

    it('should display consultation help text', () => {
      render(<PaymentCancel />);
      expect(
        screen.getByText(/หากต้องการปรึกษาเกี่ยวกับแผน ติดต่อทีมงานของเรา/)
      ).toBeInTheDocument();
    });

    it('should display free trial information', () => {
      render(<PaymentCancel />);
      expect(screen.getByText(/คุณสามารถทดลองใช้ฟรีได้ทุกเมื่อ/)).toBeInTheDocument();
    });

    it('should render all three help items', () => {
      const { container } = render(<PaymentCancel />);
      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBe(3);
    });
  });

  describe('Retry Button', () => {
    it('should render retry button when onRetry is provided', () => {
      const mockRetry = vi.fn();
      render(<PaymentCancel onRetry={mockRetry} />);
      expect(screen.getByText('ลองอีกครั้ง')).toBeInTheDocument();
    });

    it('should not render retry button when onRetry is not provided', () => {
      render(<PaymentCancel />);
      expect(screen.queryByText('ลองอีกครั้ง')).not.toBeInTheDocument();
    });

    it('should call onRetry when retry button clicked', () => {
      const mockRetry = vi.fn();
      render(<PaymentCancel onRetry={mockRetry} />);

      const retryButton = screen.getByText('ลองอีกครั้ง');
      fireEvent.click(retryButton);

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should have gradient styling on retry button', () => {
      const mockRetry = vi.fn();
      render(<PaymentCancel onRetry={mockRetry} />);

      const retryButton = screen.getByText('ลองอีกครั้ง');
      expect(retryButton.className).toContain('from-cyan-600');
      expect(retryButton.className).toContain('to-blue-600');
    });
  });

  describe('Back Button', () => {
    it('should render back to home button', () => {
      render(<PaymentCancel />);
      expect(screen.getByText('กลับไปหน้าหลัก')).toBeInTheDocument();
    });

    it('should call onBack when back button clicked', () => {
      const mockBack = vi.fn();
      render(<PaymentCancel onBack={mockBack} />);

      const backButton = screen.getByText('กลับไปหน้าหลัก');
      fireEvent.click(backButton);

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should redirect to home when back button clicked without onBack', () => {
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(<PaymentCancel />);

      const backButton = screen.getByText('กลับไปหน้าหลัก');
      fireEvent.click(backButton);

      expect(window.location.href).toBe('/');
    });

    it('should have gray styling on back button', () => {
      render(<PaymentCancel />);

      const backButton = screen.getByText('กลับไปหน้าหลัก');
      expect(backButton.className).toContain('bg-gray-700');
    });
  });

  describe('Countdown Timer', () => {
    it('should display initial countdown of 10 seconds', () => {
      render(<PaymentCancel />);
      expect(screen.getByText(/จะกลับไปหน้าหลักอัตโนมัติใน 10 วินาที.../)).toBeInTheDocument();
    });

    it('should have countdown text in component', () => {
      render(<PaymentCancel />);
      expect(screen.getByText(/วินาที.../)).toBeInTheDocument();
    });

    it('should cleanup timer on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const { unmount } = render(<PaymentCancel />);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Contact Information', () => {
    it('should display support section title', () => {
      render(<PaymentCancel />);
      expect(screen.getByText('ต้องการความช่วยเหลือ?')).toBeInTheDocument();
    });

    it('should display email link', () => {
      render(<PaymentCancel />);
      const emailLink = screen.getByText('📧 Email');
      expect(emailLink).toHaveAttribute('href', 'mailto:metapeaceofficial@gmail.com');
    });

    it('should display phone link', () => {
      render(<PaymentCancel />);
      const phoneLink = screen.getByText('📞 099-1923952');
      expect(phoneLink).toHaveAttribute('href', 'tel:+66991923952');
    });

    it('should have cyan color for contact links', () => {
      render(<PaymentCancel />);
      const emailLink = screen.getByText('📧 Email');
      expect(emailLink.className).toContain('text-cyan-400');
    });

    it('should render separator between contact methods', () => {
      const { container } = render(<PaymentCancel />);
      const separator = container.querySelector('.text-gray-600');
      expect(separator?.textContent).toBe('|');
    });
  });

  describe('Styling and Layout', () => {
    it('should have gradient background', () => {
      const { container } = render(<PaymentCancel />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv.className).toContain('from-gray-900');
      expect(mainDiv.className).toContain('via-gray-800');
      expect(mainDiv.className).toContain('to-black');
    });

    it('should have yellow border on card', () => {
      const { container } = render(<PaymentCancel />);
      const card = container.querySelector('.border-yellow-500\\/50');
      expect(card).toBeInTheDocument();
    });

    it('should have warning icon with yellow background', () => {
      const { container } = render(<PaymentCancel />);
      const iconContainer = container.querySelector('.bg-yellow-500');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should center content vertically and horizontally', () => {
      const { container } = render(<PaymentCancel />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv.className).toContain('flex');
      expect(mainDiv.className).toContain('items-center');
      expect(mainDiv.className).toContain('justify-center');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete user flow with retry', () => {
      const mockRetry = vi.fn();
      const mockBack = vi.fn();

      render(<PaymentCancel onRetry={mockRetry} onBack={mockBack} />);

      // User sees cancel message
      expect(screen.getByText('การชำระเงินถูกยกเลิก')).toBeInTheDocument();

      // User clicks retry
      fireEvent.click(screen.getByText('ลองอีกครั้ง'));
      expect(mockRetry).toHaveBeenCalled();
    });

    it('should handle complete user flow with back', () => {
      const mockBack = vi.fn();

      render(<PaymentCancel onBack={mockBack} />);

      // User sees cancel message
      expect(screen.getByText('การชำระเงินถูกยกเลิก')).toBeInTheDocument();

      // User clicks back
      fireEvent.click(screen.getByText('กลับไปหน้าหลัก'));
      expect(mockBack).toHaveBeenCalled();
    });

    it('should render all UI sections together', () => {
      const mockRetry = vi.fn();

      render(<PaymentCancel onRetry={mockRetry} />);

      // Header
      expect(screen.getByText('การชำระเงินถูกยกเลิก')).toBeInTheDocument();

      // Help section
      expect(screen.getByText('ต้องการความช่วยเหลือหรือไม่?')).toBeInTheDocument();

      // Buttons
      expect(screen.getByText('ลองอีกครั้ง')).toBeInTheDocument();
      expect(screen.getByText('กลับไปหน้าหลัก')).toBeInTheDocument();

      // Countdown
      expect(screen.getByText(/10 วินาที/)).toBeInTheDocument();

      // Contact
      expect(screen.getByText('📧 Email')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should not break when both callbacks are undefined', () => {
      expect(() => {
        render(<PaymentCancel />);
      }).not.toThrow();
    });

    it('should handle multiple button clicks', () => {
      const mockRetry = vi.fn();
      render(<PaymentCancel onRetry={mockRetry} />);

      const retryButton = screen.getByText('ลองอีกครั้ง');
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);

      expect(mockRetry).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('should have proper button elements', () => {
      const mockRetry = vi.fn();
      render(<PaymentCancel onRetry={mockRetry} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('should have clickable links for contact', () => {
      render(<PaymentCancel />);

      const links = screen.getAllByRole('link');
      expect(links.length).toBe(2); // email and phone
    });

    it('should have accessible heading', () => {
      render(<PaymentCancel />);

      const heading = screen.getByText('การชำระเงินถูกยกเลิก');
      expect(heading.tagName).toBe('H1');
    });
  });
});

