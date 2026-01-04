/**
 * Language Switcher Component
 *
 * UI สำหรับสลับภาษา Thai/English
 */

import React, { useState, useEffect } from 'react';
import { getCurrentLanguage, setLanguage, getAvailableLanguages, t, type Language } from '../i18n';

export const LanguageSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [currentLang, setCurrentLang] = useState<Language>(getCurrentLanguage());
  const languages = getAvailableLanguages();

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<Language>;
      setCurrentLang(customEvent.detail);
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  const handleChange = (lang: Language) => {
    setLanguage(lang);
    setCurrentLang(lang);
  };

  if (compact) {
    // Compact button version - สวยงามมินิมอล
    return (
      <button
        onClick={() => handleChange(currentLang === 'th' ? 'en' : 'th')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-md transition-all border border-gray-700/50 hover:border-gray-600 cursor-pointer z-10 relative"
        title="Switch Language"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
        <span>{currentLang === 'th' ? 'TH' : 'EN'}</span>
      </button>
    );
  }

  // Full dropdown version
  return (
    <div className="relative inline-block">
      <select
        value={currentLang}
        onChange={e => handleChange(e.target.value as Language)}
        className="pl-4 pr-10 py-2.5 text-sm font-semibold bg-gradient-to-r from-gray-800 to-gray-700 border-2 border-gray-600 rounded-lg text-white hover:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 cursor-pointer transition-all shadow-lg appearance-none"
        style={{ minWidth: '120px' }}
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code} className="bg-gray-800 text-white">
            {lang.code === 'th' ? '🇹🇭 ไทย' : '🇬🇧 English'}
          </option>
        ))}
      </select>

      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

/**
 * Hook for using translations in components
 */
export function useTranslation() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const handleLanguageChange = () => {
      forceUpdate({});
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  return {
    t,
    language: getCurrentLanguage(),
  };
}
