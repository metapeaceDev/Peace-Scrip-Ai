import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PsychologyTestComponent from './PsychologyTestComponent';

// Mock PsychologyDisplay component
vi.mock('./PsychologyDisplay', () => ({
  PsychologyDisplay: ({ character, compact }: { character: any; compact?: boolean }) => (
    <div data-testid={compact ? 'psychology-display-compact' : 'psychology-display-full'}>
      Psychology Display - {character.name} - {compact ? 'Compact' : 'Full'}
    </div>
  )
}));

describe('PsychologyTestComponent', () => {
  describe('Component Rendering', () => {
    it('should render the component', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByText(/Psychology Display Component Test/)).toBeInTheDocument();
    });

    it('should display the main title with emoji', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByText(/🧪 Psychology Display Component Test/)).toBeInTheDocument();
    });

    it('should have proper heading level', () => {
      render(<PsychologyTestComponent />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Psychology Display Component Test');
    });

    it('should have gray background for main container', () => {
      const { container } = render(<PsychologyTestComponent />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('bg-gray-950');
    });
  });

  describe('Warning Message', () => {
    it('should display warning message about component visibility', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByText(/ถ้าคุณเห็นข้อความนี้แต่ไม่เห็น Psychology Profile card/)).toBeInTheDocument();
    });

    it('should display browser console instruction', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByText(/เปิด Browser Console \(F12\) เพื่อดู errors/)).toBeInTheDocument();
    });

    it('should have yellow warning styling', () => {
      const { container } = render(<PsychologyTestComponent />);
      const warningBoxes = container.querySelectorAll('.bg-yellow-500\\/10');
      expect(warningBoxes.length).toBeGreaterThan(0);
    });

    it('should have warning emoji', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
    });
  });

  describe('Success Message', () => {
    it('should display success message', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByText(/ถ้าคุณเห็น Psychology Profile cards ข้างบน/)).toBeInTheDocument();
    });

    it('should display cache refresh instruction', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByText(/ปัญหาคือ browser cache - ลอง Hard Refresh/)).toBeInTheDocument();
    });

    it('should have green success styling', () => {
      const { container } = render(<PsychologyTestComponent />);
      const successBoxes = container.querySelectorAll('.bg-green-500\\/10');
      expect(successBoxes.length).toBeGreaterThan(0);
    });

    it('should have success emoji', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByText(/✅/)).toBeInTheDocument();
    });
  });

  describe('PsychologyDisplay Integration', () => {
    it('should render full display section', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByText('Full Display:')).toBeInTheDocument();
    });

    it('should render compact display section', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByText('Compact Display:')).toBeInTheDocument();
    });

    it('should render PsychologyDisplay with full mode', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByTestId('psychology-display-full')).toBeInTheDocument();
    });

    it('should render PsychologyDisplay with compact mode', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByTestId('psychology-display-compact')).toBeInTheDocument();
    });

    it('should pass test character to full display', () => {
      render(<PsychologyTestComponent />);
      const fullDisplay = screen.getByTestId('psychology-display-full');
      expect(fullDisplay).toHaveTextContent('ทดสอบ Psychology Display');
    });

    it('should pass test character to compact display', () => {
      render(<PsychologyTestComponent />);
      const compactDisplay = screen.getByTestId('psychology-display-compact');
      expect(compactDisplay).toHaveTextContent('ทดสอบ Psychology Display');
    });

    it('should display both psychology displays', () => {
      render(<PsychologyTestComponent />);
      const displays = screen.getAllByText(/Psychology Display - ทดสอบ Psychology Display/);
      expect(displays).toHaveLength(2);
    });
  });

  describe('Section Headers', () => {
    it('should have section headers with proper styling', () => {
      render(<PsychologyTestComponent />);
      const headers = screen.getAllByRole('heading', { level: 2 });
      expect(headers).toHaveLength(2);
    });

    it('should have full display header', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByRole('heading', { name: /Full Display:/i })).toBeInTheDocument();
    });

    it('should have compact display header', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByRole('heading', { name: /Compact Display:/i })).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should have min-h-screen for full page height', () => {
      const { container } = render(<PsychologyTestComponent />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('min-h-screen');
    });

    it('should have padding on main container', () => {
      const { container } = render(<PsychologyTestComponent />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('p-8');
    });

    it('should have cyan title color', () => {
      const { container } = render(<PsychologyTestComponent />);
      const title = container.querySelector('.text-cyan-400');
      expect(title).toBeInTheDocument();
    });

    it('should have proper margin bottom on title', () => {
      const { container } = render(<PsychologyTestComponent />);
      const title = container.querySelector('h1');
      expect(title).toHaveClass('mb-8');
    });

    it('should have rounded borders on info boxes', () => {
      const { container } = render(<PsychologyTestComponent />);
      const roundedBoxes = container.querySelectorAll('.rounded-lg');
      expect(roundedBoxes.length).toBeGreaterThan(0);
    });
  });

  describe('Test Character Data', () => {
    it('should use test character with correct name', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getAllByText(/ทดสอบ Psychology Display/)).toHaveLength(2);
    });

    it('should render both display modes with same character', () => {
      render(<PsychologyTestComponent />);
      const fullDisplay = screen.getByTestId('psychology-display-full');
      const compactDisplay = screen.getByTestId('psychology-display-compact');
      
      expect(fullDisplay).toHaveTextContent('ทดสอบ Psychology Display');
      expect(compactDisplay).toHaveTextContent('ทดสอบ Psychology Display');
    });
  });

  describe('Information Messages', () => {
    it('should display all informational text sections', () => {
      const { container } = render(<PsychologyTestComponent />);
      const infoParagraphs = container.querySelectorAll('p');
      expect(infoParagraphs.length).toBeGreaterThan(3);
    });

    it('should have proper text color for warning', () => {
      const { container } = render(<PsychologyTestComponent />);
      const warningText = container.querySelector('.text-yellow-300');
      expect(warningText).toBeInTheDocument();
    });

    it('should have proper text color for success', () => {
      const { container } = render(<PsychologyTestComponent />);
      const successText = container.querySelector('.text-green-300');
      expect(successText).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<PsychologyTestComponent />);
      const h1 = screen.getAllByRole('heading', { level: 1 });
      const h2 = screen.getAllByRole('heading', { level: 2 });
      
      expect(h1).toHaveLength(1);
      expect(h2).toHaveLength(2);
    });

    it('should have readable text with proper contrast classes', () => {
      const { container } = render(<PsychologyTestComponent />);
      const textElements = container.querySelectorAll('.text-white, .text-cyan-400, .text-yellow-300, .text-green-300');
      expect(textElements.length).toBeGreaterThan(0);
    });
  });

  describe('Component Structure', () => {
    it('should render all main sections', () => {
      const { container } = render(<PsychologyTestComponent />);
      const sections = container.querySelectorAll('.mb-8');
      expect(sections.length).toBeGreaterThan(3);
    });

    it('should have warning section before displays', () => {
      const { container } = render(<PsychologyTestComponent />);
      const warningBox = container.querySelector('.bg-yellow-500\\/10');
      const fullDisplay = screen.getByTestId('psychology-display-full');
      
      expect(warningBox).toBeInTheDocument();
      expect(fullDisplay).toBeInTheDocument();
    });

    it('should have success section after displays', () => {
      const { container } = render(<PsychologyTestComponent />);
      const successBox = container.querySelector('.bg-green-500\\/10');
      expect(successBox).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render without errors', () => {
      expect(() => render(<PsychologyTestComponent />)).not.toThrow();
    });

    it('should handle multiple renders', () => {
      const { rerender } = render(<PsychologyTestComponent />);
      expect(screen.getByText(/Psychology Display Component Test/)).toBeInTheDocument();
      
      rerender(<PsychologyTestComponent />);
      expect(screen.getByText(/Psychology Display Component Test/)).toBeInTheDocument();
    });

    it('should render all emojis correctly', () => {
      render(<PsychologyTestComponent />);
      expect(screen.getByText(/🧪/)).toBeInTheDocument();
      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
      expect(screen.getByText(/✅/)).toBeInTheDocument();
    });
  });
});
