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
    // Compact button version
    return (
      <button
        onClick={() => handleChange(currentLang === 'th' ? 'en' : 'th')}
        className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Switch Language"
      >
        🌐 {currentLang === 'th' ? 'EN' : 'ไทย'}
      </button>
    );
  }

  // Full dropdown version
  return (
    <div className="relative inline-block">
      <select
        value={currentLang}
        onChange={(e) => handleChange(e.target.value as Language)}
        className="px-4 py-2 pr-8 text-sm font-medium border border-gray-300 rounded-lg appearance-none bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
      
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    language: getCurrentLanguage()
  };
}
