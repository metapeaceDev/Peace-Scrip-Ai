/**
 * i18n (Internationalization) Service
 *
 * Manages language translations and locale switching
 */

import thTranslations from './th.json';
import enTranslations from './en.json';

export type Language = 'th' | 'en';
export type TranslationKey = string;

interface Translations {
  [key: string]: string | Translations;
}

const translations: Record<Language, Translations> = {
  th: thTranslations,
  en: enTranslations,
};

// Current language (default: Thai)
let currentLanguage: Language = 'th';

/**
 * Initialize i18n with browser language or saved preference
 */
export function initI18n(): Language {
  // Try to load from localStorage
  const saved = localStorage.getItem('peace-script-language') as Language;
  if (saved && (saved === 'th' || saved === 'en')) {
    currentLanguage = saved;
    return currentLanguage;
  }

  // Detect from browser
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('th')) {
    currentLanguage = 'th';
  } else {
    currentLanguage = 'en';
  }

  // Save preference
  localStorage.setItem('peace-script-language', currentLanguage);
  return currentLanguage;
}

/**
 * Get current language
 */
export function getCurrentLanguage(): Language {
  return currentLanguage;
}

/**
 * Set language
 */
export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  localStorage.setItem('peace-script-language', lang);

  // Trigger re-render (if using React context)
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));

  console.log(`🌐 Language changed to: ${lang}`);
}

/**
 * Get translation by key path (e.g., "common.save", "pricing.title")
 */
export function t(keyPath: TranslationKey, params?: Record<string, string | number>): string {
  const keys = keyPath.split('.');
  let value: string | Translations = translations[currentLanguage];

  // Navigate through nested keys
  for (const key of keys) {
    if (typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      // Fallback to English if key not found in current language
      value = translations['en'];
      for (const fallbackKey of keys) {
        if (typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          console.warn(`Translation missing: ${keyPath} in ${currentLanguage}`);
          return keyPath; // Return key path if translation not found
        }
      }
      break;
    }
  }

  // Replace parameters in translation (e.g., "Hello {{name}}")
  if (typeof value === 'string' && params) {
    return Object.entries(params).reduce((str, [key, val]) => {
      return str.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
    }, value);
  }

  return typeof value === 'string' ? value : keyPath;
}

/**
 * Get all translations for a namespace (e.g., "pricing")
 */
export function getNamespace(namespace: string): Translations {
  const value = translations[currentLanguage][namespace];
  return typeof value === 'object' ? value : {};
}

/**
 * Check if a translation key exists
 */
export function hasTranslation(keyPath: TranslationKey): boolean {
  const keys = keyPath.split('.');
  let value: string | Translations = translations[currentLanguage];

  for (const key of keys) {
    if (typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return false;
    }
  }

  return typeof value === 'string';
}

/**
 * Format number according to locale
 */
export function formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
  const locale = currentLanguage === 'th' ? 'th-TH' : 'en-US';
  return new Intl.NumberFormat(locale, options).format(num);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'THB'): string {
  const locale = currentLanguage === 'th' ? 'th-TH' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date according to locale
 */
export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const locale = currentLanguage === 'th' ? 'th-TH' : 'en-US';
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Get language display name
 */
export function getLanguageName(lang: Language): string {
  return lang === 'th' ? 'ไทย' : 'English';
}

/**
 * Get all available languages
 */
export function getAvailableLanguages(): Array<{ code: Language; name: string }> {
  return [
    { code: 'th', name: 'ไทย' },
    { code: 'en', name: 'English' },
  ];
}

// Initialize on import
initI18n();
