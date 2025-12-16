import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LanguageSwitcher } from '../LanguageSwitcher';

// Mock i18n module
vi.mock('../../i18n/index', () => ({
  getCurrentLanguage: vi.fn(() => 'th'),
  setLanguage: vi.fn(),
  getAvailableLanguages: vi.fn(() => [
    { code: 'th', name: 'Thai', nativeName: 'ไทย' },
    { code: 'en', name: 'English', nativeName: 'English' },
  ]),
  t: vi.fn((key: string) => key),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Compact Mode', () => {
    it('should render compact button', () => {
      render(<LanguageSwitcher compact={true} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should show TH when current language is Thai', () => {
      render(<LanguageSwitcher compact={true} />);
      expect(screen.getByText('TH')).toBeInTheDocument();
    });

    it('should have language icon', () => {
      const { container } = render(<LanguageSwitcher compact={true} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have tooltip', () => {
      render(<LanguageSwitcher compact={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Switch Language');
    });

    it('should toggle language on click', async () => {
      const { setLanguage } = await import('../../i18n/index');
      render(<LanguageSwitcher compact={true} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(setLanguage).toHaveBeenCalledWith('en');
    });

    it('should have proper styling classes', () => {
      render(<LanguageSwitcher compact={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-800/50', 'rounded-md', 'border');
    });

    it('should have small text size', () => {
      render(<LanguageSwitcher compact={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-xs');
    });

    it('should have gap between icon and text', () => {
      render(<LanguageSwitcher compact={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('gap-1.5');
    });
  });

  describe('Full Dropdown Mode', () => {
    it('should render select dropdown', () => {
      render(<LanguageSwitcher compact={false} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should show current language as selected', () => {
      render(<LanguageSwitcher compact={false} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('th');
    });

    it('should have Thai option', () => {
      render(<LanguageSwitcher compact={false} />);
      expect(screen.getByText(/🇹🇭 ไทย/)).toBeInTheDocument();
    });

    it('should have English option', () => {
      render(<LanguageSwitcher compact={false} />);
      expect(screen.getByText(/🇬🇧 English/)).toBeInTheDocument();
    });

    it('should change language on select', async () => {
      const { setLanguage } = await import('../../i18n/index');
      render(<LanguageSwitcher compact={false} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'en' } });
      
      expect(setLanguage).toHaveBeenCalledWith('en');
    });

    it('should have gradient background', () => {
      render(<LanguageSwitcher compact={false} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('bg-gradient-to-r', 'from-gray-800', 'to-gray-700');
    });

    it('should have border styling', () => {
      render(<LanguageSwitcher compact={false} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('border-2', 'border-gray-600', 'rounded-lg');
    });

    it('should have minimum width', () => {
      const { container } = render(<LanguageSwitcher compact={false} />);
      const select = container.querySelector('select');
      expect(select).toHaveStyle({ minWidth: '120px' });
    });

    it('should render dropdown arrow icon', () => {
      const { container } = render(<LanguageSwitcher compact={false} />);
      const arrows = container.querySelectorAll('svg');
      expect(arrows.length).toBeGreaterThan(0);
    });
  });

  describe('Default Props', () => {
    it('should default to full dropdown mode when compact not specified', () => {
      render(<LanguageSwitcher />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });
  });

  describe('Language Change Event', () => {
    it('should setup event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      render(<LanguageSwitcher compact={true} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('languageChanged', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it('should cleanup event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<LanguageSwitcher compact={true} />);
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('languageChanged', expect.any(Function));
    });
  });

  describe('Styling and Layout', () => {
    it('should have cursor pointer in compact mode', () => {
      render(<LanguageSwitcher compact={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('cursor-pointer');
    });

    it('should have cursor pointer in dropdown mode', () => {
      render(<LanguageSwitcher compact={false} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('cursor-pointer');
    });

    it('should have transition effects in compact mode', () => {
      render(<LanguageSwitcher compact={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('transition-all');
    });

    it('should have transition effects in dropdown mode', () => {
      render(<LanguageSwitcher compact={false} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('transition-all');
    });

    it('should have z-index in compact mode', () => {
      render(<LanguageSwitcher compact={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('z-10', 'relative');
    });
  });
});
