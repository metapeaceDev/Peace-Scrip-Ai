import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageSwitcher, useTranslation } from './LanguageSwitcher';
import * as i18n from '../i18n';

// Mock i18n module
vi.mock('../i18n', () => ({
  getCurrentLanguage: vi.fn(() => 'th'),
  setLanguage: vi.fn(),
  getAvailableLanguages: vi.fn(() => [
    { code: 'th', name: 'ไทย' },
    { code: 'en', name: 'English' },
  ]),
  t: vi.fn((key: string) => key),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (i18n.getCurrentLanguage as any).mockReturnValue('th');
  });

  describe('Compact Mode', () => {
    it('should render compact button', () => {
      render(<LanguageSwitcher compact={true} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should display current language code in compact mode', () => {
      render(<LanguageSwitcher compact={true} />);
      expect(screen.getByText('TH')).toBeInTheDocument();
    });

    it('should display EN when current language is English', () => {
      (i18n.getCurrentLanguage as any).mockReturnValue('en');
      render(<LanguageSwitcher compact={true} />);
      expect(screen.getByText('EN')).toBeInTheDocument();
    });

    it('should have language icon in compact mode', () => {
      const { container } = render(<LanguageSwitcher compact={true} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have switch language title', () => {
      render(<LanguageSwitcher compact={true} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Switch Language');
    });

    it('should toggle to English when clicking Thai compact button', () => {
      (i18n.getCurrentLanguage as any).mockReturnValue('th');
      render(<LanguageSwitcher compact={true} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(i18n.setLanguage).toHaveBeenCalledWith('en');
    });

    it('should toggle to Thai when clicking English compact button', () => {
      (i18n.getCurrentLanguage as any).mockReturnValue('en');
      render(<LanguageSwitcher compact={true} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(i18n.setLanguage).toHaveBeenCalledWith('th');
    });

    it('should apply correct styling classes in compact mode', () => {
      const { container } = render(<LanguageSwitcher compact={true} />);
      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-gray-800/50');
      expect(button?.className).toContain('text-xs');
    });
  });

  describe('Full Dropdown Mode', () => {
    it('should render dropdown select by default', () => {
      render(<LanguageSwitcher />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should render when compact is false', () => {
      render(<LanguageSwitcher compact={false} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should display Thai option with flag', () => {
      render(<LanguageSwitcher />);
      expect(screen.getByText('🇹🇭 ไทย')).toBeInTheDocument();
    });

    it('should display English option with flag', () => {
      render(<LanguageSwitcher />);
      expect(screen.getByText('🇬🇧 English')).toBeInTheDocument();
    });

    it('should have current language selected', () => {
      (i18n.getCurrentLanguage as any).mockReturnValue('th');
      render(<LanguageSwitcher />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('th');
    });

    it('should select English when changed', () => {
      render(<LanguageSwitcher />);
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'en' } });

      expect(i18n.setLanguage).toHaveBeenCalledWith('en');
    });

    it('should select Thai when changed', () => {
      (i18n.getCurrentLanguage as any).mockReturnValue('en');
      render(<LanguageSwitcher />);
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'th' } });

      expect(i18n.setLanguage).toHaveBeenCalledWith('th');
    });

    it('should render dropdown icon', () => {
      const { container } = render(<LanguageSwitcher />);
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have minimum width styling', () => {
      const { container } = render(<LanguageSwitcher />);
      const select = container.querySelector('select');
      expect(select?.style.minWidth).toBe('120px');
    });

    it('should apply gradient background styling', () => {
      const { container } = render(<LanguageSwitcher />);
      const select = container.querySelector('select');
      expect(select?.className).toContain('from-gray-800');
      expect(select?.className).toContain('to-gray-700');
    });

    it('should render both language options', () => {
      render(<LanguageSwitcher />);
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
    });

    it('should have correct option values', () => {
      render(<LanguageSwitcher />);
      const options = screen.getAllByRole('option') as HTMLOptionElement[];
      expect(options[0].value).toBe('th');
      expect(options[1].value).toBe('en');
    });
  });

  describe('Language Change Event Listener', () => {
    it('should update language when languageChanged event fires', async () => {
      (i18n.getCurrentLanguage as any).mockReturnValue('th');
      render(<LanguageSwitcher compact={true} />);

      expect(screen.getByText('TH')).toBeInTheDocument();

      // Simulate language change event
      (i18n.getCurrentLanguage as any).mockReturnValue('en');
      const event = new CustomEvent('languageChanged', { detail: 'en' });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(screen.getByText('EN')).toBeInTheDocument();
      });
    });

    it('should update dropdown value when language changed externally', async () => {
      (i18n.getCurrentLanguage as any).mockReturnValue('th');
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('th');

      // Simulate external language change
      (i18n.getCurrentLanguage as any).mockReturnValue('en');
      const event = new CustomEvent('languageChanged', { detail: 'en' });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(select.value).toBe('en');
      });
    });

    it('should cleanup event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<LanguageSwitcher />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('languageChanged', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });

    it('should add event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      render(<LanguageSwitcher />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('languageChanged', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should call setLanguage and update state when compact button clicked', async () => {
      (i18n.getCurrentLanguage as any).mockReturnValue('th');
      render(<LanguageSwitcher compact={true} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(i18n.setLanguage).toHaveBeenCalledWith('en');
    });

    it('should call setLanguage and update state when dropdown changed', async () => {
      (i18n.getCurrentLanguage as any).mockReturnValue('th');
      render(<LanguageSwitcher />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'en' } });

      expect(i18n.setLanguage).toHaveBeenCalledWith('en');
    });

    it('should use getAvailableLanguages on render', () => {
      render(<LanguageSwitcher />);
      expect(i18n.getAvailableLanguages).toHaveBeenCalled();
    });

    it('should use getCurrentLanguage on render', () => {
      render(<LanguageSwitcher />);
      expect(i18n.getCurrentLanguage).toHaveBeenCalled();
    });
  });
});

describe('useTranslation Hook', () => {
  // Test component using the hook
  function TestComponent() {
    const { t, language } = useTranslation();
    return (
      <div>
        <div data-testid="language">{language}</div>
        <div data-testid="translation">{t('test.key')}</div>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (i18n.getCurrentLanguage as any).mockReturnValue('th');
    (i18n.t as any).mockImplementation((key: string) => `translated_${key}`);
  });

  describe('Hook Functionality', () => {
    it('should return current language', () => {
      (i18n.getCurrentLanguage as any).mockReturnValue('th');
      render(<TestComponent />);

      expect(screen.getByTestId('language')).toHaveTextContent('th');
    });

    it('should return English language', () => {
      (i18n.getCurrentLanguage as any).mockReturnValue('en');
      render(<TestComponent />);

      expect(screen.getByTestId('language')).toHaveTextContent('en');
    });

    it('should return translation function', () => {
      render(<TestComponent />);

      expect(screen.getByTestId('translation')).toHaveTextContent('translated_test.key');
      expect(i18n.t).toHaveBeenCalledWith('test.key');
    });

    it('should update when language changes', async () => {
      (i18n.getCurrentLanguage as any).mockReturnValue('th');
      render(<TestComponent />);

      expect(screen.getByTestId('language')).toHaveTextContent('th');

      // Change language
      (i18n.getCurrentLanguage as any).mockReturnValue('en');
      const event = new CustomEvent('languageChanged', { detail: 'en' });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(screen.getByTestId('language')).toHaveTextContent('en');
      });
    });

    it('should cleanup event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<TestComponent />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('languageChanged', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });

    it('should add event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      render(<TestComponent />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('languageChanged', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });
  });
});

